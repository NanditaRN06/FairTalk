const axios = require('axios');

const MIN_CONFIDENCE = 0.85;

const LUXAND_API_URL = process.env.AI_API;
const API_TOKEN = process.env.LUXAND_API_TOKEN;

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
        const base64Image = imageBuffer.toString('base64');

        const params = new URLSearchParams();
        params.append('photo', base64Image);

        const response = await axios.post(LUXAND_API_URL, params, {
            headers: {
                'token': API_TOKEN,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

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

        const face = faces[0];

        if (!face.gender || !face.gender.value) {
            return {
                authorized: false,
                gender: 'unknown',
                confidence: 0,
                message: 'Face detected but gender could not be determined.'
            };
        }

        const genderValue = face.gender.value;
        const genderProb = face.gender.probability;

        const gender = genderValue.toLowerCase();
        const confidence = parseFloat(genderProb.toFixed(4));

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

module.exports = { verifyImage, MIN_CONFIDENCE };