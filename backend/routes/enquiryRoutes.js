const express = require('express');
const router = express.Router();
const { createEnquiry, getEnquiries, updateEnquiry, deleteEnquiry } = require('../controllers/enquiryController');
const { protect, gymOwnerOnly } = require('../middleware/authMiddleware');

router.post('/', protect, gymOwnerOnly, createEnquiry);
router.get('/', protect, gymOwnerOnly, getEnquiries);
router.put('/:id', protect, gymOwnerOnly, updateEnquiry);
router.delete('/:id', protect, gymOwnerOnly, deleteEnquiry);

module.exports = router;
