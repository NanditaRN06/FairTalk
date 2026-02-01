const aiService = require('../services/aiService');

const verifyUser = async (req, res) => {
    try {
        const { image, deviceId } = req.body;

        if (!image || !deviceId) {
            return res.status(400).json({
                authorized: false,
                message: 'Missing image or device ID'
            });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const result = await aiService.verifyImage(imageBuffer);

        res.status(200).json(result);

        if (result.authorized) {
            try {
                const User = require('../models/User');

                await User.findOneAndUpdate(
                    { deviceId: deviceId },
                    {
                        $set: {
                            gender: result.gender,
                            lastVerified: new Date()
                        },
                        $setOnInsert: {
                            dailyMatches: 0,
                            blocked: false
                        }
                    },
                    { upsert: true, new: true }
                );
                console.log(`[Persistence] User record updated for device: ${deviceId}`);

            } catch (dbError) {
                console.error('[Persistence] Failed to update User record:', dbError.message);
            }
        }
        return;

    } catch (error) {
        console.error('Verification Error:', error);
        return res.status(500).json({
            authorized: false,
            message: 'Internal server error during verification'
        });
    }
};

module.exports = { verifyUser };