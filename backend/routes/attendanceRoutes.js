const express = require('express');
const router = express.Router();
const { markAttendance, getGymAttendance, getMyAttendance, getDailySheet, selfCheckIn, requestOTP, verifyOTP } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/attendance/request-otp
// @access  Public
router.post('/request-otp', requestOTP);

// @route   POST /api/attendance/verify-otp
// @access  Public
router.post('/verify-otp', verifyOTP);

// @route   POST /api/attendance/self-checkin
// @desc    Self Check-in (Public endpoint for Members scanning Gym QR)
// @access  Public
router.post('/self-checkin', selfCheckIn);

// @route   GET /api/attendance/status/:gymId/:deviceToken
// @desc    Get current check-in status
// @access  Public
router.get('/status/:gymId/:deviceToken', require('../controllers/attendanceController').getCheckInStatus);

// @route   POST /api/attendance/mark
// @desc    Mark attendance
// @access  Private
router.post('/mark', protect, markAttendance);

// @route   GET /api/attendance/daily-sheet
// @desc    Get all members and their attendance status for a given day
// @access  Private (Owner/Admin)
router.get('/daily-sheet', protect, getDailySheet);

// @route   GET /api/attendance
// @desc    Get all attendance for a gym (Owner/Admin)
// @access  Private
router.get('/', protect, getGymAttendance);

// @route   GET /api/attendance/my
// @desc    Get logged in user's attendance
// @access  Private
router.get('/my', protect, getMyAttendance);

module.exports = router;
