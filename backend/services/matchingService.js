const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");

// --- Configuration ---
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL);
const QUEUE_KEY = "waiting_queue";
const ACTIVE_SESSIONS_KEY = "active_sessions";
const MATCH_CHANNEL = "matches";
const MATCH_SESSION_PREFIX = "match_session:";
const DEVICE_MATCH_MAP = "device_match_map";

// --- Matching Logic Constants ---
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
    // 1. SIGNAL A: Questionnaire Alignment
    // FairTalk questions are q1, q2, q3, q4
    const qAttrs = ["q1", "q2", "q3", "q4"];
    let exactMatches = 0;

    for (const q of qAttrs) {
        if (userA.personalityAnswers[q] === userB.personalityAnswers[q]) {
            exactMatches += 1;
        }
    }

    const questionPoints = exactMatches * WEIGHT_QUESTION;

    // 2. SIGNAL B: Human/Bio Alignment
    const tagsA = extractBioTags(userA.bio);
    const tagsB = extractBioTags(userB.bio);
    const sharedTags = tagsA.filter(tag => tagsB.includes(tag));

    const bioPoints = sharedTags.length * WEIGHT_BIO;

    // 3. SIGNAL C: Fairness & Urgency
    const waitTime = Math.max(0, currentTime - joinTimeB);
    const fairnessPoints = waitTime * WEIGHT_FAIRNESS;

    // 4. COMPOSITE SCORE
    const totalScore = questionPoints + bioPoints + fairnessPoints;

    // 5. DYNAMIC THRESHOLDING
    let minThreshold = 0.5;
    if (queueSize >= 10) minThreshold = 6.0;
    else if (queueSize >= 4) minThreshold = 3.5;

    if (totalScore < minThreshold) return null;

    // 6. EXPLAINABILITY
    let strength = "Low Traffic Compatibility";
    if (questionPoints >= 4.0) strength = "Strong Personality Alignment";
    else if (bioPoints >= 1.5) strength = "Shared Interests";

    const reason = `This recommendation was generated because ${strength} was detected. Score: ${totalScore.toFixed(1)}`;

    return { score: totalScore, reason };
}

async function processQueue() {
    console.log("[MatchingService] Background process started...");

    setInterval(async () => {
        try {
            const candidatesRaw = await redis.zrange(QUEUE_KEY, 0, 49, "WITHSCORES");
            if (candidatesRaw.length < 4) return; // 2 users = 4 elements (member, score)

            const candidates = [];
            for (let i = 0; i < candidatesRaw.length; i += 2) {
                const data = JSON.parse(candidatesRaw[i]);
                candidates.push({
                    obj: data,
                    raw: candidatesRaw[i],
                    score: parseFloat(candidatesRaw[i + 1])
                });
            }

            const currentTime = Date.now() / 1000;
            const queueLen = candidates.length;

            for (let i = 0; i < queueLen; i++) {
                const candA = candidates[i];
                const userA = candA.obj;

                let bestMatchIdx = -1;
                let maxScore = -Infinity;
                let bestReason = "";

                for (let j = i + 1; j < queueLen; j++) {
                    const candB = candidates[j];
                    const userB = candB.obj;

                    if (userA.deviceId === userB.deviceId) continue;

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

                    const matchId = uuidv4();
                    const matchData = {
                        matchId,
                        userA: { deviceId: userA.deviceId, nickname: userA.nickname },
                        userB: { deviceId: userB.deviceId, nickname: userB.nickname },
                        reason: bestReason,
                        timestamp: currentTime
                    };

                    // Transactional Pairing
                    const pipeline = redis.pipeline();
                    pipeline.zrem(QUEUE_KEY, candA.raw);
                    pipeline.zrem(QUEUE_KEY, candB.raw);
                    pipeline.sadd(ACTIVE_SESSIONS_KEY, userA.deviceId);
                    pipeline.sadd(ACTIVE_SESSIONS_KEY, userB.deviceId);
                    pipeline.set(`${MATCH_SESSION_PREFIX}${matchId}`, JSON.stringify(matchData), "EX", 3600);
                    pipeline.hset(DEVICE_MATCH_MAP, userA.deviceId, matchId);
                    pipeline.hset(DEVICE_MATCH_MAP, userB.deviceId, matchId);
                    pipeline.publish(MATCH_CHANNEL, JSON.stringify({ type: "match_found", payload: matchData }));

                    await pipeline.exec();
                    console.log(`[MatchingService] MATCH FOUND: ${userA.nickname} <-> ${userB.nickname}`);
                    break;
                }
            }
        } catch (error) {
            console.error("[MatchingService] Error:", error);
        }
    }, 1000);
}

async function cleanupMatchData(matchId, deviceIds) {
    console.log(`[MatchingService] Cleaning up match ${matchId} in 2s...`);
    setTimeout(async () => {
        const pipeline = redis.pipeline();
        pipeline.del(`${MATCH_SESSION_PREFIX}${matchId}`);
        for (const id of deviceIds) {
            pipeline.hdel(DEVICE_MATCH_MAP, id);
            pipeline.srem(ACTIVE_SESSIONS_KEY, id);
        }
        await pipeline.exec();
    }, 2000);
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
