const express = require('express');
const router = express.Router();
const { createEnquiry, getEnquiries, getEnquiryById, updateEnquiry, deleteEnquiry } = require('../controllers/enquiryController');
const { protect, gymOwnerOnly } = require('../middleware/authMiddleware');

router.post('/', protect, createEnquiry);
router.get('/', protect, getEnquiries);
router.get('/:id', protect, getEnquiryById);
router.put('/:id', protect, updateEnquiry);
router.delete('/:id', protect, gymOwnerOnly, deleteEnquiry);

module.exports = router;
