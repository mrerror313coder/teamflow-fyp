const express = require('express');
const router = express.Router();
const {
  createProject,
  getProject,
  addMember,
  removeMember,
  joinProject,
  updateRoadmap,
  getProgress,
  exportCsv,
  syncSheet,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { leaderOnly } = require('../middleware/roleCheck');

router.post('/', protect, leaderOnly, createProject);
router.post('/join', protect, joinProject);
router.get('/:id', protect, getProject);
router.post('/:id/add-member', protect, leaderOnly, addMember);
router.delete('/:id/members/:memberId', protect, leaderOnly, removeMember);
router.put('/:id/roadmap', protect, leaderOnly, updateRoadmap);
router.get('/:id/progress', protect, getProgress);
router.get('/:id/export-csv', protect, exportCsv);
router.post('/:id/sync-sheet', protect, leaderOnly, syncSheet);

module.exports = router;

