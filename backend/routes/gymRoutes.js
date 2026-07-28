const express = require('express');
const router = express.Router();
const { getGyms, getMyGym, updateMyGym } = require('../controllers/gymController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// @route GET /api/gyms/my-gym
// @desc Get current gym settings
// @access Private
router.get('/my-gym', protect, getMyGym);

// @route PUT /api/gyms/my-gym
// @desc Update current gym settings
// @access Private
router.put('/my-gym', protect, updateMyGym);

// @route GET /api/gyms
// @desc Get all gyms
// @access Private (SuperAdmin)
router.get('/', protect, superAdminOnly, getGyms);

module.exports = router;
