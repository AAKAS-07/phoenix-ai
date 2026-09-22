const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getUserActivities, logUserActivity } = require('../controllers/activityController');

router.get('/', authMiddleware, getUserActivities);
router.post('/', authMiddleware, logUserActivity);

module.exports = router;
