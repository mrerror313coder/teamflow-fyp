const express = require('express');
const router = express.Router();
const {
  parseCommand,
  getInsight,
  getReport,
  generateTaskBreakdown,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/parse', protect, parseCommand);
router.get('/insight/:projectId', protect, getInsight);
router.get('/weekly-report/:projectId', protect, getReport);
router.post('/breakdown', protect, generateTaskBreakdown);

module.exports = router;
