const express = require('express');
const router = express.Router();
const { getStaff, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/staff
// @desc    Get all staff members
// @access  Private (Gym Owner)
router.get('/', protect, getStaff);

// @route   POST /api/staff
// @desc    Add a new staff member
// @access  Private (Gym Owner)
router.post('/', protect, createStaff);

// @route   PUT /api/staff/:id
// @desc    Update staff member
// @access  Private (Gym Owner)
router.put('/:id', protect, updateStaff);

// @route   DELETE /api/staff/:id
// @desc    Delete staff member
// @access  Private (Gym Owner)
router.delete('/:id', protect, deleteStaff);

module.exports = router;
