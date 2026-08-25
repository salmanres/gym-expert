const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', activityLogController.getActivityLogs);
router.put('/read/:logId', activityLogController.markAsRead);
router.delete('/', activityLogController.clearActivityLogs);

module.exports = router;
