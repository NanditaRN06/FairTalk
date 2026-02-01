/**
 * Service for handling AI-based verification.
 * Currently uses a MOCK implementation.
 */

// Threshold for considering a verification successful
const MIN_CONFIDENCE = 0.85;

/**
 * MOCK: Simulates processing an image for gender verification.
 * 
 * @param {Buffer} imageBuffer - The image data (unused in mock)
 * @returns {Promise<Object>} Verification result
 */
const verifyImage = async (imageBuffer) => {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // MOCK LOGIC: 
    // Return a random successful response for development
    // In future, this will call the actual AI model/API

    const isMockSuccess = true; // Set to false to test failure scenarios manually

    if (isMockSuccess) {
        return {
            authorized: true,
            gender: 'female', // or 'male', randomized if needed
            confidence: 0.95,
            message: 'Verification successful'
        };
    } else {
        return {
            authorized: false,
            gender: 'unknown',
            confidence: 0.40,
            message: 'Low confidence or face not detected'
        };
    }
};

module.exports = {
    verifyImage,
    MIN_CONFIDENCE
};
