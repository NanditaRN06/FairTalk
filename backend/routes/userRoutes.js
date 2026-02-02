const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/eligibility/:deviceId', userController.checkEligibility);

module.exports = router;
