const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const https = require("https");
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
                const userId = userData.userId;

                await redis.set(`user_meta:${userId}`, JSON.stringify(userData), { ex: 600 });
                await redis.zadd(QUEUE_KEY, { score: Date.now() / 1000, member: userId });

                ws.send(JSON.stringify({ status: "queued" }));

                pollInterval = setInterval(async () => {
                    try {
                        const targetId = userId || userData.deviceId;
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
            } else if (message.type === "update_criteria") {
                if (userData) {
                    userData = { ...userData, ...message.payload };
                    await redis.set(`user_meta:${userData.userId}`, JSON.stringify(userData), { ex: 600 });
                }
            }
        } catch (error) {
            console.error("Queue WS Error:", error);
        }
    });

    ws.on("close", async () => {
        if (pollInterval) clearInterval(pollInterval);
        if (userData) {
            const userId = userData.userId;
            const targetId = userId || userData.deviceId;
            const matchId = await redis.hget(DEVICE_MATCH_MAP, targetId);

            if (!matchId) {
                await redis.zrem(QUEUE_KEY, userId);
                await redis.del(`user_meta:${userId}`);
            }
        }
    });
}

wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.searchParams.get("matchId") || "default";
    const deviceId = url.searchParams.get("deviceId");
    const userId = url.searchParams.get("userId") || deviceId || "anon-" + Math.random();

    if (!chatSessions[matchId]) { chatSessions[matchId] = {}; }

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

    ws.on("close", () => {
        handleDisconnect(matchId, userId, true);
    });

    function handleDisconnect(mId, uId, permanent) {
        if (chatSessions[mId] && chatSessions[mId][uId]) {
            console.log(`User ${uId} left match ${mId}`);

            for (const [id, socket] of Object.entries(chatSessions[mId])) {
                if (id !== uId && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "system",
                        event: "partner_left",
                    }));
                }
            }

            const { cleanupMatchData } = require("./services/matchingService");
            cleanupMatchData(mId, [uId]);
            delete chatSessions[mId][uId];

            if (Object.keys(chatSessions[mId]).length === 0) { delete chatSessions[mId]; }
        }
    }
});

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
        }
    });
}, 30000);

processQueue();

const WS_SERVER_URL = process.env.WS_SERVER_URL;
if (WS_SERVER_URL) {
    setInterval(() => {
        const client = WS_SERVER_URL.startsWith('https') ? https : http;
        client.get(WS_SERVER_URL, (res) => {
            console.log(`[KeepAlive] Pinged WS Server: ${res.statusCode}`);
        }).on('error', (e) => { console.error(`[KeepAlive] Ping Error: ${e.message}`); });
    }, 5 * 60 * 1000);
}

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => { console.log("MongoDB connected"); })
    .catch((err) => { console.error("MongoDB connection failed:", err.message); });

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });