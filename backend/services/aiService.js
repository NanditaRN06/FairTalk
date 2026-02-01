/**
 * Service for handling AI-based verification using Luxand.cloud.
 */
const axios = require('axios');

// Threshold for considering a verification successful
const MIN_CONFIDENCE = 0.85;

// Luxand specific constants
const LUXAND_API_URL = 'https://api.luxand.cloud/photo/detect';
const API_TOKEN = process.env.LUXAND_API_TOKEN;

/**
 * Verifies a user's gender using the Luxand.cloud API.
 * 
 * @param {Buffer} imageBuffer - The image data
 * @returns {Promise<Object>} Verification result
 */
const verifyImage = async (imageBuffer) => {
    if (!API_TOKEN) {
        console.error("Missing LUXAND_API_TOKEN in environment variables.");
        return {
            authorized: false,
            gender: 'unknown',
            confidence: 0,
            message: 'Server configuration error: AI Key missing.'
        };
    }

    try {
        // Luxand accepts base64 via "photo" form parameter (standard url-encoded)
        // We will send standard application/x-www-form-urlencoded
        const base64Image = imageBuffer.toString('base64');

        // Use URLSearchParams for x-www-form-urlencoded body
        const params = new URLSearchParams();
        params.append('photo', base64Image);

        const response = await axios.post(LUXAND_API_URL, params, {
            headers: {
                'token': API_TOKEN,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Luxand returns an array of faces directly: [ { gender: ..., rectangle: ... } ]
        const faces = response.data;
        console.log("Luxand API Response:", faces);

        if (!Array.isArray(faces) || faces.length === 0) {
            console.log("Luxand API returned no faces:", response.data);
            return {
                authorized: false,
                gender: 'unknown',
                confidence: 0,
                message: 'No face detected in the image.'
            };
        }

        // We'll take the first face detected
        const face = faces[0];

        // Check for gender data
        if (!face.gender || !face.gender.value) {
            return {
                authorized: false,
                gender: 'unknown',
                confidence: 0,
                message: 'Face detected but gender could not be determined.'
            };
        }

        const genderValue = face.gender.value; // "Male" or "Female"
        const genderProb = face.gender.probability; // 0.0 to 1.0

        // Normalize
        const gender = genderValue.toLowerCase(); // 'male' or 'female'
        const confidence = parseFloat(genderProb.toFixed(4));

        // Authorization logic
        const authorized = confidence >= MIN_CONFIDENCE;

        return {
            authorized,
            gender,
            confidence,
            message: authorized ? 'Verification successful' : 'Confidence too low'
        };

    } catch (error) {
        console.error("Luxand API Error:", error?.response?.data || error.message);
        const errorMsg = error?.response?.data?.message || 'External AI service error.';
        return {
            authorized: false,
            gender: 'unknown',
            confidence: 0,
            message: errorMsg
        };
    }
};

module.exports = {
    verifyImage,
    MIN_CONFIDENCE
};
