const express = require('express');
const router = express.Router();
const {
    getMemberships,
    createMembership,
    getMembershipById,
    updateMembership,
    deleteMembership
} = require('../controllers/membershipController');
const { protect, gymOwnerOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(gymOwnerOnly);

router.route('/')
    .get(getMemberships)
    .post(createMembership);

router.route('/:id')
    .get(getMembershipById)
    .put(updateMembership)
    .delete(deleteMembership);

module.exports = router;
