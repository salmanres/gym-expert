const express = require('express');
const router = express.Router();
const { protect, gymOwnerOnly } = require('../middleware/authMiddleware');
const { createBranch, getBranches } = require('../controllers/branchController');

router.route('/')
    .post(protect, gymOwnerOnly, createBranch)
    .get(protect, gymOwnerOnly, getBranches);

module.exports = router;
