const express = require('express');
const router = express.Router();
const { login, registerGym, registerBranch, initSuperAdmin } = require('../controllers/authController');
const { protect, superAdminOnly, gymOwnerOnly } = require('../middleware/authMiddleware');

// @route POST /api/auth/login
// @desc Universal login for all users
// @access Public
router.post('/login', login);

// @route POST /api/auth/register-gym
// @desc Register a new Gym Franchise (Only accessible by SuperAdmin)
// @access Private (SuperAdmin)
router.post('/register-gym', protect, superAdminOnly, registerGym);

// @route POST /api/auth/register-branch
// @desc Register a new Gym Branch (Accessible by GymOwner)
// @access Private (GymOwner)
router.post('/register-branch', protect, gymOwnerOnly, registerBranch);

// @route POST /api/auth/init-superadmin
// @desc One-time endpoint to create the first SuperAdmin
// @access Public
router.post('/init-superadmin', initSuperAdmin);

module.exports = router;
