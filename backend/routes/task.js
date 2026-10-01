const express = require('express');
const router = express.Router();
const {
  createTask,
  getMyTasks,
  getProjectTasks,
  updateTaskStatus,
  submitTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { leaderOnly } = require('../middleware/roleCheck');

router.post('/', protect, leaderOnly, createTask);
router.get('/my-tasks', protect, getMyTasks);
router.get('/project/:projectId', protect, getProjectTasks);
router.put('/:id/status', protect, updateTaskStatus);
router.put('/:id/submit', protect, submitTask);
router.delete('/:id', protect, leaderOnly, deleteTask);

module.exports = router;
