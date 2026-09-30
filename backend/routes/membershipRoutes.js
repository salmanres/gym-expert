const express = require('express');
const router = express.Router();
const {
    getMemberships,
    createMembership,
    getMembershipById,
    updateMembership,
    deleteMembership
} = require('../controllers/membershipPlanController');
const { protect, gymOwnerOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(gymOwnerOrAdmin);

router.route('/')
    .get(getMemberships)
    .post(createMembership);

router.route('/:id')
    .get(getMembershipById)
    .put(updateMembership)
    .delete(deleteMembership);

module.exports = router;
