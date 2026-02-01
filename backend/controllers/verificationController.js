/**
 * Controller for handling verification requests.
 */
const aiService = require('../services/aiService');

/**
 * Handles the verification POST request.
 * Expects { image: string (base64), deviceId: string } in body.
 */
const verifyUser = async (req, res) => {
    try {
        const { image, deviceId } = req.body;

        if (!image || !deviceId) {
            return res.status(400).json({
                authorized: false,
                message: 'Missing image or device ID'
            });
        }

        // Convert base64 to Buffer
        // Assuming image string might be a data URI "data:image/jpeg;base64,..."
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Call the AI Service
        const result = await aiService.verifyImage(imageBuffer);

        // Return the result directly to frontend
        res.status(200).json(result);

        // -----------------------------------------------------------------------
        // NON-BLOCKING PERSISTENCE LAYER
        // -----------------------------------------------------------------------
        if (result.authorized) {
            try {
                const User = require('../models/User'); // Lazy load or move to top

                // Upsert logic:
                // Find by deviceId. If exists, update gender/time.
                // If new, set defaults (dailyMatches=0, blocked=false) automatically via schema/upsert.
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
                // SQUEALCHED ERROR: Do not fail the request if DB fails.
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

module.exports = {
    verifyUser
};
