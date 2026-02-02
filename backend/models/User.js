const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    gender: { type: String },
    lastVerified: { type: Date, default: Date.now },
    dailyMatches: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);