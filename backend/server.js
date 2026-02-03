const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const verificationRoutes = require('./routes/verificationRoutes');
const userRoutes = require('./routes/userRoutes');

app.use(cors());
app.use(express.json());

app.use('/api', verificationRoutes);
app.use('/api/user', userRoutes);

// Expose simple runtime config so frontend can detect whether camera verification
// is required in this environment.
const cameraVerificationRequired = (process.env.CAMERA_VERIFICATION || 'true').toLowerCase() === 'true';
app.locals.cameraVerificationRequired = cameraVerificationRequired;

app.get('/api/config', (req, res) => {
    return res.json({ cameraVerification: app.locals.cameraVerificationRequired });
});

app.get("/", (req, res) => { res.send("Backend running"); });

// Import routes
const matchRoutes = require("./routes/matchRoutes");
app.use("/api", matchRoutes);

// WebSocket setup
const wss = new WebSocket.Server({ server });
const sessions = {};

wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.searchParams.get("matchId") || "default";
    const deviceId = url.searchParams.get("deviceId") || "device-" + Math.random().toString(36).substr(2, 9);

    if (!sessions[matchId]) {
        sessions[matchId] = {};
    }

    sessions[matchId][deviceId] = ws;
    console.log(`Device ${deviceId} connected to match ${matchId}`);

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            const action = message.action;

            if (action === "message") {
                // Relay to other users
                for (const [id, socket] of Object.entries(sessions[matchId])) {
                    if (id !== deviceId && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "message",
                            from: "partner",
                            text: message.text,
                        }));
                    }
                }
            } else if (action === "leave") {
                // Notify others and cleanup
                for (const [id, socket] of Object.entries(sessions[matchId])) {
                    if (id !== deviceId && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: "system",
                            event: "partner_left",
                        }));
                    }
                }
                delete sessions[matchId][deviceId];
                ws.close();
            }
        } catch (error) {
            console.error("WebSocket message error:", error);
        }
    });

    ws.on("close", () => {
        console.log(`Device ${deviceId} disconnected from match ${matchId}`);
        delete sessions[matchId][deviceId];
        if (Object.keys(sessions[matchId]).length === 0) {
            delete sessions[matchId];
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});

server.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => { console.log("MongoDB connected"); })
    .catch((err) => { console.error("MongoDB connection failed:", err.message); });