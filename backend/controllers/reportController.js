const { redis } = require("../services/matchingService");
const User = require("../models/User");

exports.submitReport = async (req, res) => {
    try {
        const { matchId, reporterId, reportedId, reason, customReason, timestamp } = req.body;

        if (!matchId || !reporterId || !reportedId || !reason) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const reportKey = `report:${matchId}:${reporterId}`;
        const existingReport = await redis.get(reportKey);

        if (existingReport) {
            return res.status(429).json({ message: "You have already reported this user for this session." });
        }

        const reportData = {
            matchId,
            reporterId,
            reportedId,
            reason,
            customReason: reason === "other" ? customReason : null,
            time: timestamp || Date.now()
        };

        await redis.set(reportKey, JSON.stringify(reportData), { ex: 30 * 24 * 60 * 60 });

        const user = await User.findOne({ deviceId: reportedId });
        if (user) {
            user.reportsCount = (user.reportsCount || 0) + 1;

            user.reportScore = (user.reportScore || 0) + 10;
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
