const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect, gymOwnerOrAdmin } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .post(gymOwnerOrAdmin, memberController.createMember)
    .get(protect, memberController.getMembers);

router.route('/transactions/all')
    .get(protect, memberController.getTransactions);

router.route('/transactions/single/:id')
    .get(protect, memberController.getTransactionById);

router.route('/transactions/:id')
    .put(gymOwnerOrAdmin, memberController.updateTransaction)
    .delete(gymOwnerOrAdmin, memberController.deleteTransaction);

router.route('/:id')
    .get(protect, memberController.getMemberById)
    .put(gymOwnerOrAdmin, memberController.updateMember)
    .delete(gymOwnerOrAdmin, memberController.deleteMember);

module.exports = router;
