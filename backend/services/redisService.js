const redis = require("redis");
require("dotenv").config();

let client = null;

const initializeRedis = async () => {
    if (client) return client;
    
    client = redis.createClient({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on("error", (err) => console.error("Redis Client Error", err));
    await client.connect();
    console.log("Redis connected");
    
    return client;
};

const getRedisClient = () => {
    if (!client) {
        throw new Error("Redis client not initialized. Call initializeRedis first.");
    }
    return client;
};

// Add user to match queue
const addToMatchQueue = async (userId, userData) => {
    const client = getRedisClient();
    const queueKey = "match:queue";
    
    try {
        await client.hSet(queueKey, userId, JSON.stringify(userData));
        console.log(`User ${userId} added to match queue`);
        return true;
    } catch (error) {
        console.error("Error adding to match queue:", error);
        return false;
    }
};

// Remove user from match queue
const removeFromMatchQueue = async (userId) => {
    const client = getRedisClient();
    const queueKey = "match:queue";
    
    try {
        await client.hDel(queueKey, userId);
        console.log(`User ${userId} removed from match queue`);
        return true;
    } catch (error) {
        console.error("Error removing from match queue:", error);
        return false;
    }
};

// Get all users in queue
const getMatchQueue = async () => {
    const client = getRedisClient();
    const queueKey = "match:queue";
    
    try {
        const queue = await client.hGetAll(queueKey);
        return Object.entries(queue).map(([userId, data]) => ({
            userId,
            ...JSON.parse(data),
        }));
    } catch (error) {
        console.error("Error getting match queue:", error);
        return [];
    }
};

// Find best match based on location and preferences
const findBestMatch = async (userId, userLocation) => {
    const queue = await getMatchQueue();
    const availableUsers = queue.filter((u) => u.userId !== userId);
    
    if (availableUsers.length === 0) return null;

    // Simple matching: prefer closest location
    const matches = availableUsers.map((user) => {
        const distance = calculateDistance(userLocation, user.location);
        return { ...user, distance };
    });

    matches.sort((a, b) => a.distance - b.distance);
    return matches[0] || null;
};

// Calculate distance between two locations (Haversine formula)
const calculateDistance = (loc1, loc2) => {
    if (!loc1 || !loc2) return Infinity;

    const R = 6371; // Earth's radius in km
    const lat1 = (loc1.lat * Math.PI) / 180;
    const lat2 = (loc2.lat * Math.PI) / 180;
    const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const dLon = ((loc2.lon - loc1.lon) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

// Store match session
const createMatchSession = async (matchId, user1Id, user2Id) => {
    const client = getRedisClient();
    const sessionKey = `match:session:${matchId}`;
    
    try {
        await client.hSet(sessionKey, "user1", user1Id);
        await client.hSet(sessionKey, "user2", user2Id);
        await client.expire(sessionKey, 3600); // 1 hour expiry
        console.log(`Match session ${matchId} created`);
        return true;
    } catch (error) {
        console.error("Error creating match session:", error);
        return false;
    }
};

// Get match session
const getMatchSession = async (matchId) => {
    const client = getRedisClient();
    const sessionKey = `match:session:${matchId}`;
    
    try {
        const session = await client.hGetAll(sessionKey);
        return session && Object.keys(session).length > 0 ? session : null;
    } catch (error) {
        console.error("Error getting match session:", error);
        return null;
    }
};

module.exports = {
    initializeRedis,
    getRedisClient,
    addToMatchQueue,
    removeFromMatchQueue,
    getMatchQueue,
    findBestMatch,
    calculateDistance,
    createMatchSession,
    getMatchSession,
};
