const express = require('express');
const router = express.Router();
const { identifyTrial, selfCheckInTrial, getTrialCheckInStatus } = require('../controllers/trialAttendanceController');

// @route   POST /api/trial-attendance/identify
router.post('/identify', identifyTrial);

// @route   POST /api/trial-attendance/self-checkin
router.post('/self-checkin', selfCheckInTrial);

// @route   GET /api/trial-attendance/status/:gymId/:deviceToken
router.get('/status/:gymId/:deviceToken', getTrialCheckInStatus);

module.exports = router;
