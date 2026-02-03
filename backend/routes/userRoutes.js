const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/eligibility/:deviceId', userController.checkEligibility);
router.get('/check-nickname', userController.checkNickname);

module.exports = router;
