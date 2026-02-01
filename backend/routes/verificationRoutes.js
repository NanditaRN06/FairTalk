const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

router.post('/verify', verificationController.verifyUser);

module.exports = router;
