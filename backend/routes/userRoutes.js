const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/user/eligibility/:deviceId
router.get('/eligibility/:deviceId', userController.checkEligibility);

module.exports = router;
