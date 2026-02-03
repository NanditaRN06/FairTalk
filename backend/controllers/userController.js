const User = require('../models/User');
const { redis, QUEUE_KEY } = require('../services/matchingService');

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

const checkNickname = async (req, res) => {
    try {
        const { nickname } = req.query;
        if (!nickname) {
            return res.status(400).json({ taken: false, message: 'Nickname required' });
        }

        // Get all users in queue
        const candidatesRaw = await redis.zrange(QUEUE_KEY, 0, -1);

        let taken = false;
        const searchName = nickname.trim().toLowerCase();

        for (const member of candidatesRaw) {
            try {
                const data = typeof member === 'string' ? JSON.parse(member) : member;
                if (data.nickname && data.nickname.trim().toLowerCase() === searchName) {
                    taken = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (taken) {
            console.log(`[Validation] Username collision detected — username '${nickname}' rejected before queue entry.`);
            return res.json({ taken: true, message: 'This nickname is already in use in the active queue.' });
        }

        return res.json({ taken: false });

    } catch (error) {
        console.error('Nickname Check Error:', error);
        return res.status(500).json({ taken: false, message: 'Server error' });
    }
};

module.exports = { checkEligibility, checkNickname };