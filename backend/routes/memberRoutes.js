const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect, gymOwnerOnly } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(gymOwnerOnly, memberController.createMember)
    .get(protect, memberController.getMembers);

router.route('/transactions/all')
    .get(protect, memberController.getTransactions);

router.route('/:id')
    .get(protect, memberController.getMemberById)
    .put(gymOwnerOnly, memberController.updateMember)
    .delete(gymOwnerOnly, memberController.deleteMember);

module.exports = router;
