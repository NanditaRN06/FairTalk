const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
require("dotenv").config();

const {
    redis,
    QUEUE_KEY,
    ACTIVE_SESSIONS_KEY,
    MATCH_CHANNEL,
    MATCH_SESSION_PREFIX,
    DEVICE_MATCH_MAP,
    processQueue,
    cleanupMatchData
} = require("./services/matchingService");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const verificationRoutes = require('./routes/verificationRoutes');
const userRoutes = require('./routes/userRoutes');

app.use(cors());
app.use(express.json());

app.use('/api', verificationRoutes);
app.use('/api/user', userRoutes);

app.get("/", (req, res) => { res.send("Backend running"); });

const matchRoutes = require("./routes/matchRoutes");
app.use("/api", matchRoutes);

const wss = new WebSocket.Server({ noServer: true });
const chatSessions = {};

server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === "/ws/chat") {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    } else if (pathname === "/ws/queue") {
        wss.handleUpgrade(request, socket, head, (ws) => {
            handleQueueConnection(ws, request);
        });
    } else {
        socket.destroy();
    }
});

async function handleQueueConnection(ws, req) {
    let userData = null;
    let pollInterval = null;

    ws.on("message", async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === "join_queue") {
                userData = message.payload;
                // userData has { deviceId, userId, nickname, ... }
                const userJson = JSON.stringify(userData);

                await redis.zadd(QUEUE_KEY, { score: Date.now() / 1000, member: userJson });
                ws.send(JSON.stringify({ status: "queued" }));

                pollInterval = setInterval(async () => {
                    try {
                        // Check for match using userId
                        const targetId = userData.userId || userData.deviceId;
                        const matchId = await redis.hget(DEVICE_MATCH_MAP, targetId);

                        if (matchId) {
                            const matchData = await redis.get(`${MATCH_SESSION_PREFIX}${matchId}`);
                            let finalMatchData = matchData;
                            if (typeof matchData === 'string') {
                                try { finalMatchData = JSON.parse(matchData); } catch (e) { }
                            }

                            if (ws.readyState === 1) {
                                ws.send(JSON.stringify({ status: "matched", match: finalMatchData }));
                            }
                            clearInterval(pollInterval);
                        }
                    } catch (err) {
                        console.error("Queue Polling Error:", err);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Queue WS Error:", error);
        }
    });

    ws.on("close", async () => {
        if (pollInterval) clearInterval(pollInterval);
        if (userData) {
            // Only remove from queue if NOT matched yet.
            // If matchId exists in DEVICE_MATCH_MAP, it means they were matched while they were polling.
            const targetId = userData.userId || userData.deviceId;
            const matchId = await redis.hget(DEVICE_MATCH_MAP, targetId);
            if (!matchId) {
                const userJson = JSON.stringify(userData);
                // We must be careful to remove the EXACT member string.
                // However, user attributes might have slight serialization diffs if not careful.
                // Since we stored exactly `JSON.stringify(userData)` in `message.payload`, we use that.

                // Also double check strictly if they are still in queue to avoid race conditions?
                await redis.zrem(QUEUE_KEY, userJson);
                // console.log(`[Queue] Removed user ${userData.nickname} from queue on disconnect.`);
            } else {
                // If they HAVE a matchId, do NOT remove from queue here, 
                // because the matching service already removed them from queue (zrem) when creating the match.
                // Doing nothing is correct.
            }
        }
    });
}

wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.searchParams.get("matchId") || "default";
    const deviceId = url.searchParams.get("deviceId");
    const userId = url.searchParams.get("userId") || deviceId || "anon-" + Math.random();

    if (!chatSessions[matchId]) {
        chatSessions[matchId] = {};
    }

    // Use userId as the session key
    chatSessions[matchId][userId] = ws;
    console.log(`[WebSocket] User ${userId} (Device: ${deviceId}) joined match ${matchId}`);

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            const action = message.action;

            if (action === "message") {
                for (const [id, socket] of Object.entries(chatSessions[matchId])) {
                    if (id !== userId && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "message",
                            from: "partner",
                            text: message.text,
                        }));
                    }
                }
            } else if (action === "leave") {
                ws.isIntentionalLeave = true;
                handleDisconnect(matchId, userId, true);
            }
        } catch (error) {
            console.error("WebSocket message error:", error);
        }
    });

    // Heartbeat to keep connections alive
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(heartbeatInterval);
    });

    ws.on("close", () => {
        // Treat ALL disconnects as permanent to ensure privacy and data removal.
        // Since the frontend generates a new UserID on refresh, reconnection isn't possible anyway.
        // This ensures usernames/bio are wiped from Redis immediately upon exit/refresh.
        handleDisconnect(matchId, userId, true);
    });

    function handleDisconnect(mId, uId, permanent) {
        if (chatSessions[mId] && chatSessions[mId][uId]) {
            console.log(`User ${uId} left match ${mId}`);

            // Notify partner
            for (const [id, socket] of Object.entries(chatSessions[mId])) {
                if (id !== uId && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "system",
                        event: "partner_left",
                    }));
                }
            }

            // Always cleanup Redis data
            cleanupMatchData(mId, [uId]);
            delete chatSessions[mId][uId];

            if (Object.keys(chatSessions[mId]).length === 0) {
                delete chatSessions[mId];
            }
        }
    }
});

processQueue();

const WS_SERVER_URL = process.env.WS_SERVER_URL;
if (WS_SERVER_URL) {
    setInterval(() => {
        http.get(WS_SERVER_URL, (res) => {
            console.log(`[KeepAlive] Pinged WS Server: ${res.statusCode}`);
        }).on('error', (e) => {
            console.error(`[KeepAlive] Ping Error: ${e.message}`);
        });
    }, 5 * 60 * 1000);
}

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => { console.log("MongoDB connected"); })
    .catch((err) => { console.error("MongoDB connection failed:", err.message); });
