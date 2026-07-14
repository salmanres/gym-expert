const express = require('express');
const router = express.Router();
const { getGyms } = require('../controllers/gymController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// @route GET /api/gyms
// @desc Get all gyms
// @access Private (SuperAdmin)
router.get('/', protect, superAdminOnly, getGyms);

module.exports = router;
