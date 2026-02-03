const { redis } = require("../services/matchingService");
const User = require("../models/User");

// Minimal metadata storage for reports
exports.submitReport = async (req, res) => {
    try {
        const { matchId, reporterId, reportedId, reason, customReason, timestamp } = req.body;

        if (!matchId || !reporterId || !reportedId || !reason) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Prevent multiple reports per match session
        const reportKey = `report:${matchId}:${reporterId}`;
        const existingReport = await redis.get(reportKey);

        if (existingReport) {
            return res.status(429).json({ message: "You have already reported this user for this session." });
        }

        // 2. Store minimal report metadata in Redis (for audit/analytics)
        // We do NOT store chat messages, only the signal.
        const reportData = {
            matchId,
            reporterId, // Device ID or User ID (depending on what FE sends, usually Device ID for persistent tracking)
            reportedId,
            reason,
            customReason: reason === "other" ? customReason : null,
            time: timestamp || Date.now()
        };

        // Expire report data after 30 days to ensure privacy
        await redis.set(reportKey, JSON.stringify(reportData), { ex: 30 * 24 * 60 * 60 });

        // 3. Update User Reputation (Soft Signal)
        // We only track this on the persistent User record (using deviceId)
        // Ensure we are using the deviceId part if reportedId is a userId

        // Note: The frontend should send the persistent DEVICE ID of the reported user if available, 
        // or we need to look it up. For this implementation, we assume reportedId IS the deviceId 
        // because we passed deviceIds in the match object initially.

        const user = await User.findOne({ deviceId: reportedId });
        if (user) {
            user.reportsCount = (user.reportsCount || 0) + 1;

            // Soft Penalties (Explainable Logic)
            // 1 report = 10 points. 
            // If score > 50, matching priority lowers.
            user.reportScore = (user.reportScore || 0) + 10;

            // 3 Strikes Rule: Block user if reports >= 3
            if (user.reportsCount >= 3) {
                user.blocked = true;
                console.log(`[Report] BLOCKING User ${reportedId} (Reports: ${user.reportsCount})`);
            }

            await user.save();
            console.log(`[Report] User ${reportedId} reported. Score: ${user.reportScore}`);
        } else {
            console.warn(`[Report] Reported user ${reportedId} not found in DB.`);
        }

        return res.status(200).json({ message: "Report submitted successfully." });

    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
