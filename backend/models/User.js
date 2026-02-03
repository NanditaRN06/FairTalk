const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    gender: { type: String },
    lastVerified: { type: Date, default: Date.now },
    lastMatchAt: { type: Date },
    genderPreference: { type: String, enum: ['male', 'female', 'any'], default: 'any' },
    dailyMatches: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    reportsCount: { type: Number, default: 0 }, // Total reports received
    reportScore: { type: Number, default: 0 }   // Soft signal for matching logic (0-100)
});

module.exports = mongoose.model('User', UserSchema);