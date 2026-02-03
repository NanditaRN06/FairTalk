const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/eligibility/:deviceId', userController.checkEligibility);
// Dev-only route to create/upsert a test user when camera verification is bypassed
router.post('/create-test/:deviceId', userController.createTestUser);

module.exports = router;
