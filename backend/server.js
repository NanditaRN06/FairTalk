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

// Import routes
const matchRoutes = require("./routes/matchRoutes");
app.use("/api", matchRoutes);

// WebSocket setup
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
    let currentMatchId = null;
    const subscriber = redis.duplicate();
    await subscriber.connect();

    ws.on("message", async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === "join_queue") {
                userData = message.payload; // { deviceId, nickname, bio, personalityAnswers }
                const userJson = JSON.stringify(userData);

                await redis.zadd(QUEUE_KEY, Date.now() / 1000, userJson);
                ws.send(JSON.stringify({ status: "queued" }));

                await subscriber.subscribe(MATCH_CHANNEL);
                subscriber.on("message", (channel, msg) => {
                    const event = JSON.parse(msg);
                    if (event.type === "match_found") {
                        const matchData = event.payload;
                        if (matchData.userA.deviceId === userData.deviceId ||
                            matchData.userB.deviceId === userData.deviceId) {
                            currentMatchId = matchData.matchId;
                            ws.send(JSON.stringify({ status: "matched", match: matchData }));
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Queue WS Error:", error);
        }
    });

    ws.on("close", async () => {
        if (userData) {
            const matchId = await redis.hget(DEVICE_MATCH_MAP, userData.deviceId);
            if (!matchId) {
                // Remove from queue if not matched
                const userJson = JSON.stringify(userData);
                await redis.zrem(QUEUE_KEY, userJson);
            }
        }
        await subscriber.quit();
    });
}

wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.searchParams.get("matchId") || "default";
    const deviceId = url.searchParams.get("deviceId") || "device-" + Math.random().toString(36).substr(2, 9);

    if (!chatSessions[matchId]) {
        chatSessions[matchId] = {};
    }

    chatSessions[matchId][deviceId] = ws;
    console.log(`Device ${deviceId} connected to match ${matchId}`);

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            const action = message.action;

            if (action === "message") {
                for (const [id, socket] of Object.entries(chatSessions[matchId])) {
                    if (id !== deviceId && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "message",
                            from: "partner",
                            text: message.text,
                        }));
                    }
                }
            } else if (action === "leave") {
                handleDisconnect(matchId, deviceId);
            }
        } catch (error) {
            console.error("WebSocket message error:", error);
        }
    });

    ws.on("close", () => {
        handleDisconnect(matchId, deviceId);
    });

    function handleDisconnect(mId, dId) {
        if (chatSessions[mId] && chatSessions[mId][dId]) {
            console.log(`Device ${dId} left match ${mId}`);
            for (const [id, socket] of Object.entries(chatSessions[mId])) {
                if (id !== dId && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: "system",
                        event: "partner_left",
                    }));
                }
            }
            delete chatSessions[mId][dId];
            if (Object.keys(chatSessions[mId]).length === 0) {
                delete chatSessions[mId];
            }
            // Trigger Redis cleanup
            cleanupMatchData(mId, [dId]);
        }
    }
});

// Start matching background process
processQueue();

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => { console.log("MongoDB connected"); })
    .catch((err) => { console.error("MongoDB connection failed:", err.message); });
