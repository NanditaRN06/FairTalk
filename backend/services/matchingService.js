const { Redis } = require("@upstash/redis");
const { v4: uuidv4 } = require("uuid");

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const QUEUE_KEY = "waiting_queue";
const ACTIVE_SESSIONS_KEY = "active_sessions";
const MATCH_CHANNEL = "matches";
const MATCH_SESSION_PREFIX = "match_session:";
const DEVICE_MATCH_MAP = "device_match_map";

const WEIGHT_QUESTION = 2.0;
const WEIGHT_BIO = 1.5;
const WEIGHT_FAIRNESS = 0.05;

const BIO_VOCAB = {
    "playful": ["playful", "funny", "joke", "witty", "humor"],
    "deep": ["deep", "thoughtful", "philosophical", "soul"],
    "chill": ["chill", "calm", "relaxed", "casual"],
    "energetic": ["energetic", "excited", "hype", "expressive"],
    "listener": ["listener", "quiet", "reserved", "reflective"],
    "curious": ["curious", "explorer", "learner", "inquisitive"]
};

function extractBioTags(bioText) {
    if (!bioText) return [];
    const text = bioText.toLowerCase();
    const tags = [];
    for (const [tag, keywords] of Object.entries(BIO_VOCAB)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag);
        }
    }
    return tags.slice(0, 2);
}

function calculateMatchScore(userA, userB, currentTime, joinTimeB, queueSize) {
    if (!userA.personalityAnswers || !userB.personalityAnswers) {
        console.warn(`[Matching] Missing personality answers for ${userA.nickname} or ${userB.nickname}`);
        return null;
    }

    const qAttrs = ["q1", "q2", "q3", "q4", "q5"];
    let exactMatches = 0;

    for (const q of qAttrs) {
        if (userA.personalityAnswers[q] === userB.personalityAnswers[q]) {
            exactMatches += 1;
        }
    }

    const questionPoints = exactMatches * WEIGHT_QUESTION;

    const tagsA = extractBioTags(userA.bio);
    const tagsB = extractBioTags(userB.bio);
    const sharedTags = tagsA.filter(tag => tagsB.includes(tag));

    const bioPoints = sharedTags.length * WEIGHT_BIO;

    const waitTime = Math.max(0, currentTime - joinTimeB);
    const fairnessPoints = waitTime * WEIGHT_FAIRNESS;

    const totalScore = questionPoints + bioPoints + fairnessPoints;

    const isRelaxedA = userA.allowRelaxation === true;
    const isRelaxedB = userB.allowRelaxation === true;

    let minThreshold = 0.5;
    if (queueSize >= 10) minThreshold = 6.0;
    else if (queueSize >= 4) minThreshold = 3.5;

    if (isRelaxedA) { minThreshold = Math.max(0.1, minThreshold * 0.4); }

    console.log(`[MatchCalc] ${userA.nickname} + ${userB.nickname} | Q: ${questionPoints} | Bio: ${bioPoints} | Total: ${totalScore.toFixed(2)} | Threshold: ${minThreshold}${isRelaxedA ? ' (RELAXED)' : ''}`);

    if (totalScore < minThreshold) return null;

    let strength = "Low Traffic Compatibility";
    if (questionPoints >= 4.0) strength = "Strong Personality Alignment";
    else if (bioPoints >= 1.5) strength = "Shared Interests";

    let reason = `This recommendation was generated because ${strength} was detected. Score: ${totalScore.toFixed(1)}`;

    if (isRelaxedA && totalScore < (minThreshold / 0.4)) {
        reason = "The user explicitly opted in to relaxed personality-based matching after no exact match was found.";
        console.log(`[MatchingService] Relaxed Match Audit: ${userA.nickname} matched with ${userB.nickname} via explicit consent.`);
    }

    return { score: totalScore, reason };
}

async function processQueue() {
    console.log("[MatchingService] Background process started (REST Mode)...");

    setInterval(async () => {
        try {
            const userIdsRaw = await redis.zrange(QUEUE_KEY, 0, 49, { withScores: true });

            if (!userIdsRaw || userIdsRaw.length === 0) return;

            const candidates = [];
            for (let i = 0; i < userIdsRaw.length; i += 2) {
                const uId = userIdsRaw[i];
                const score = userIdsRaw[i + 1];

                const meta = await redis.get(`user_meta:${uId}`);
                if (!meta) {
                    await redis.zrem(QUEUE_KEY, uId);
                    continue;
                }

                const userData = typeof meta === 'string' ? JSON.parse(meta) : meta;
                candidates.push({ obj: userData, userId: uId, score: score });
            }

            const queueLen = candidates.length;
            if (queueLen < 2) return;

            const currentTime = Date.now() / 1000;

            for (let i = 0; i < queueLen; i++) {
                const candA = candidates[i];
                const userA = candA.obj;
                const idA = candA.userId;

                let bestMatchIdx = -1;
                let maxScore = -Infinity;
                let bestReason = "";

                for (let j = i + 1; j < queueLen; j++) {
                    const candB = candidates[j];
                    const userB = candB.obj;
                    const idB = candB.userId;

                    if (idA === idB) continue;

                    const prefA = userA.genderPreference || 'any';
                    const prefB = userB.genderPreference || 'any';
                    const genderA = userA.gender;
                    const genderB = userB.gender;

                    if (!(prefA === 'any' || prefA === genderB) || !(prefB === 'any' || prefB === genderA)) continue;

                    const isActiveA = await redis.sismember(ACTIVE_SESSIONS_KEY, idA);
                    const isActiveB = await redis.sismember(ACTIVE_SESSIONS_KEY, idB);

                    if (isActiveA || isActiveB) continue;

                    const res = calculateMatchScore(userA, userB, currentTime, candB.score, queueLen);
                    if (res && res.score > maxScore) {
                        maxScore = res.score;
                        bestMatchIdx = j;
                        bestReason = res.reason;
                    }
                }

                if (bestMatchIdx !== -1) {
                    const candB = candidates[bestMatchIdx];
                    const userB = candB.obj;
                    const idB = candB.userId;

                    const matchId = uuidv4();
                    const matchData = {
                        matchId,
                        userA: { userId: idA, deviceId: userA.deviceId, nickname: userA.nickname, gender: userA.gender },
                        userB: { userId: idB, deviceId: userB.deviceId, nickname: userB.nickname, gender: userB.gender },
                        reason: bestReason,
                        timestamp: currentTime
                    };

                    const pipeline = redis.pipeline();
                    pipeline.zrem(QUEUE_KEY, idA);
                    pipeline.zrem(QUEUE_KEY, idB);
                    pipeline.del(`user_meta:${idA}`);
                    pipeline.del(`user_meta:${idB}`);
                    pipeline.sadd(ACTIVE_SESSIONS_KEY, idA);
                    pipeline.sadd(ACTIVE_SESSIONS_KEY, idB);
                    pipeline.set(`${MATCH_SESSION_PREFIX}${matchId}`, JSON.stringify(matchData), { ex: 3600 });
                    pipeline.hset(DEVICE_MATCH_MAP, { [idA]: matchId });
                    pipeline.hset(DEVICE_MATCH_MAP, { [idB]: matchId });
                    pipeline.publish(MATCH_CHANNEL, JSON.stringify({ type: "match_found", payload: matchData }));

                    await pipeline.exec();

                    try {
                        const User = require('../models/User');
                        const updateMatchStats = async (dId) => {
                            await User.findOneAndUpdate({ deviceId: dId }, { $inc: { dailyMatches: 1 }, $set: { lastMatchAt: new Date() } });
                        };
                        await Promise.all([updateMatchStats(userA.deviceId), updateMatchStats(userB.deviceId)]);
                    } catch (mongoErr) { }

                    console.log(`[MatchingService] MATCH EXECUTED: ${userA.nickname} --- ${userB.nickname}`);
                    break;
                }
            }
        } catch (error) {
            console.error("[MatchingService] Error:", error);
        }
    }, 1000);
}

async function cleanupMatchData(matchId, userIds) {
    console.log(`[MatchingService] Force cleanup for match ${matchId}...`);
    setTimeout(async () => {
        const pipeline = redis.pipeline();
        pipeline.del(`${MATCH_SESSION_PREFIX}${matchId}`);
        for (const id of userIds) {
            pipeline.hdel(DEVICE_MATCH_MAP, id);
            pipeline.srem(ACTIVE_SESSIONS_KEY, id);
            pipeline.zrem(QUEUE_KEY, id);
            pipeline.del(`user_meta:${id}`);
        }
        await pipeline.exec();
    }, 1200);
}

module.exports = {
    redis,
    QUEUE_KEY,
    ACTIVE_SESSIONS_KEY,
    MATCH_CHANNEL,
    MATCH_SESSION_PREFIX,
    DEVICE_MATCH_MAP,
    processQueue,
    cleanupMatchData
};
