const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const redisService = require("./redisService");

// Store all active WebSocket connections
const connections = new Map(); // userId -> { ws, location, matchId }
const matchSessions = new Map(); // matchId -> { user1, user2, wsConnections }

const setupWebSocketServer = (server) => {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", async (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const userId = url.searchParams.get("userId") || uuidv4();
        const matchId = url.searchParams.get("matchId");

        console.log(`User ${userId} connected`);

        // Store connection
        connections.set(userId, {
            ws,
            userId,
            location: null,
            matchId: null,
            joinedAt: Date.now(),
        });

        // Send connection acknowledgement
        ws.send(
            JSON.stringify({
                type: "connection",
                status: "connected",
                userId,
                message: "Connected to FairTalk server",
            })
        );

        ws.on("message", async (data) => {
            try {
                const message = JSON.parse(data);
                await handleMessage(userId, message, ws);
            } catch (error) {
                console.error("Message parsing error:", error);
                ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
            }
        });

        ws.on("close", async () => {
            console.log(`User ${userId} disconnected`);
            await handleUserDisconnect(userId);
        });

        ws.on("error", (error) => {
            console.error(`WebSocket error for user ${userId}:`, error);
        });
    });

    return wss;
};

const handleMessage = async (userId, message, ws) => {
    const { type, payload } = message;

    switch (type) {
        case "location":
            await handleLocationUpdate(userId, payload);
            break;

        case "find_match":
            await handleFindMatch(userId, payload);
            break;

        case "chat":
            await handleChatMessage(userId, payload);
            break;

        case "accept_match":
            await handleAcceptMatch(userId, payload);
            break;

        case "reject_match":
            await handleRejectMatch(userId);
            break;

        case "leave_chat":
            await handleLeaveChat(userId);
            break;

        default:
            ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
    }
};

const handleLocationUpdate = async (userId, payload) => {
    const connection = connections.get(userId);
    if (connection) {
        connection.location = {
            lat: payload.latitude,
            lon: payload.longitude,
            city: payload.city,
            country: payload.country,
        };
        connections.set(userId, connection);
        console.log(`Location updated for user ${userId}`);
    }
};

const handleFindMatch = async (userId, payload) => {
    const connection = connections.get(userId);
    if (!connection) return;

    // Add user to Redis queue
    const userData = {
        userId,
        location: connection.location,
        preferences: payload.preferences || {},
        joinedAt: Date.now(),
    };

    await redisService.addToMatchQueue(userId, userData);

    // Try to find a match
    const match = await redisService.findBestMatch(userId, connection.location);

    if (match) {
        // Create match session
        const matchId = uuidv4();
        await redisService.createMatchSession(matchId, userId, match.userId);

        // Notify both users
        connection.ws.send(
            JSON.stringify({
                type: "match_found",
                matchId,
                partner: {
                    userId: match.userId,
                    location: match.location,
                },
            })
        );

        const partnerConnection = connections.get(match.userId);
        if (partnerConnection) {
            partnerConnection.ws.send(
                JSON.stringify({
                    type: "match_found",
                    matchId,
                    partner: {
                        userId,
                        location: connection.location,
                    },
                })
            );
        }

        // Remove both from queue
        await redisService.removeFromMatchQueue(userId);
        await redisService.removeFromMatchQueue(match.userId);
    } else {
        connection.ws.send(
            JSON.stringify({
                type: "waiting_for_match",
                message: "Looking for a match...",
            })
        );
    }
};

const handleAcceptMatch = async (userId, payload) => {
    const { matchId } = payload;
    const connection = connections.get(userId);

    if (!connection) return;

    connection.matchId = matchId;
    connections.set(userId, connection);

    // Check if match session exists
    const session = await redisService.getMatchSession(matchId);
    if (session) {
        const partnerId = session.user1 === userId ? session.user2 : session.user1;
        const partnerConnection = connections.get(partnerId);

        if (partnerConnection) {
            // Notify both users that match is active
            connection.ws.send(
                JSON.stringify({
                    type: "match_started",
                    matchId,
                    partnerId,
                })
            );

            partnerConnection.ws.send(
                JSON.stringify({
                    type: "match_started",
                    matchId,
                    partnerId: userId,
                })
            );
        }
    }
};

const handleChatMessage = async (userId, payload) => {
    const connection = connections.get(userId);
    if (!connection || !connection.matchId) return;

    const matchId = connection.matchId;
    const session = await redisService.getMatchSession(matchId);

    if (session) {
        const partnerId = session.user1 === userId ? session.user2 : session.user1;
        const partnerConnection = connections.get(partnerId);

        if (partnerConnection) {
            partnerConnection.ws.send(
                JSON.stringify({
                    type: "chat",
                    from: userId,
                    message: payload.text,
                    timestamp: Date.now(),
                })
            );

            // Acknowledge to sender
            connection.ws.send(
                JSON.stringify({
                    type: "chat_sent",
                    timestamp: Date.now(),
                })
            );
        }
    }
};

const handleRejectMatch = async (userId) => {
    const connection = connections.get(userId);
    if (connection) {
        connection.matchId = null;
        connections.set(userId, connection);
    }

    connection.ws.send(
        JSON.stringify({
            type: "match_rejected",
            message: "Match rejected",
        })
    );
};

const handleLeaveChat = async (userId) => {
    const connection = connections.get(userId);
    if (!connection) return;

    const matchId = connection.matchId;
    if (matchId) {
        const session = await redisService.getMatchSession(matchId);
        if (session) {
            const partnerId = session.user1 === userId ? session.user2 : session.user1;
            const partnerConnection = connections.get(partnerId);

            if (partnerConnection) {
                partnerConnection.ws.send(
                    JSON.stringify({
                        type: "partner_left",
                        message: "Partner left the chat",
                    })
                );
            }
        }
    }

    connection.matchId = null;
    connections.set(userId, connection);
};

const handleUserDisconnect = async (userId) => {
    // Remove from Redis queue
    await redisService.removeFromMatchQueue(userId);

    // Notify partner if in active match
    const connection = connections.get(userId);
    if (connection && connection.matchId) {
        const session = await redisService.getMatchSession(connection.matchId);
        if (session) {
            const partnerId = session.user1 === userId ? session.user2 : session.user1;
            const partnerConnection = connections.get(partnerId);

            if (partnerConnection) {
                partnerConnection.ws.send(
                    JSON.stringify({
                        type: "partner_disconnected",
                        message: "Partner disconnected",
                    })
                );
            }
        }
    }

    // Remove connection
    connections.delete(userId);
};

// Get active connections count
const getActiveConnections = () => {
    return connections.size;
};

// Get queue size
const getQueueSize = async () => {
    const queue = await redisService.getMatchQueue();
    return queue.length;
};

module.exports = {
    setupWebSocketServer,
    getActiveConnections,
    getQueueSize,
    connections,
};
