const User = require('../models/User');

const DAILY_LIMIT = 5;

const checkEligibility = async (req, res) => {
    try {
        const { deviceId } = req.params;

        if (!deviceId) {
            return res.status(400).json({ eligible: false, message: 'Device ID required' });
        }

        const user = await User.findOne({ deviceId });

        if (!user) {
            return res.json({ eligible: false, message: 'User not found' });
        }

        if (user.blocked) {
            return res.json({ eligible: false, message: 'User is blocked' });
        }

        if (user.dailyMatches >= DAILY_LIMIT) {
            return res.json({ eligible: false, message: 'Daily limit reached' });
        }

        return res.json({ eligible: true });

    } catch (error) {
        console.error('Eligibility Check Error:', error);
        return res.status(500).json({ eligible: false, message: 'Server error' });
    }
};

// Dev helper: create or update a test user for environments without camera verification
const createTestUser = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { gender = 'unknown' } = req.body || {};

        if (!deviceId) {
            return res.status(400).json({ success: false, message: 'Device ID required' });
        }

        await User.findOneAndUpdate(
            { deviceId },
            {
                $set: {
                    gender,
                    lastVerified: new Date(),
                    blocked: false
                },
                $setOnInsert: {
                    dailyMatches: 0
                }
            },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: 'Test user created/updated' });

    } catch (error) {
        console.error('createTestUser Error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { checkEligibility, createTestUser };