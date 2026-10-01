const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { notifyTaskAssigned, notifyTaskCompleted } = require('../utils/notifications');

// @desc    Create a new task
// @route   POST /api/task
// @access  Private (Leader only)
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, projectId, phase, deadline, priority } = req.body;

    if (!title || !assignedTo || !projectId || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, assignedTo, projectId, deadline.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ success: false, message: 'Assigned member not found' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedTo,
      projectId,
      phase: phase || 'General',
      deadline: new Date(deadline),
      priority: priority || 'medium',
      status: 'pending',
    });

    const populated = await Task.findById(task._id).populate('assignedTo', 'name email phone');

    // Asynchronously notify member via WhatsApp
    notifyTaskAssigned(populated, assignedUser, project);

    return res.status(201).json({
      success: true,
      message: 'Task created and assigned successfully',
      task: populated,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all tasks assigned to logged-in user
// @route   GET /api/task/my-tasks
// @access  Private
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('projectId', 'name')
      .populate('assignedTo', 'name email phone')
      .sort({ deadline: 1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all tasks for a project
// @route   GET /api/task/project/:projectId
// @access  Private
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    let query = { projectId };

    // If user is member, show all project tasks for team visibility or filter
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email phone')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update task status
// @route   PUT /api/task/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Authorization: member can update own task; leader can update any task
    const isOwner = task.assignedTo.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';

    if (!isOwner && !isLeader) {
      return res.status(403).json({
        success: false,
        message: 'You can only update the status of tasks assigned to you.',
      });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    // Notify leader if member completed the task
    if (status === 'completed') {
      const project = await Project.findById(task.projectId);
      const member = await User.findById(task.assignedTo);
      if (project && member) {
        notifyTaskCompleted(task, member, project);
      }
    }

    const updated = await Task.findById(task._id).populate('assignedTo', 'name email phone');

    return res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      task: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit task work (file, doc link, notes)
// @route   PUT /api/task/:id/submit
// @access  Private
exports.submitTask = async (req, res) => {
  try {
    const { fileUrl, docLink, notes } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const isOwner = task.assignedTo.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';

    if (!isOwner && !isLeader) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit deliverables for tasks assigned to you.',
      });
    }

    task.submission = {
      fileUrl: fileUrl || task.submission?.fileUrl || '',
      docLink: docLink || task.submission?.docLink || '',
      notes: notes || task.submission?.notes || '',
      submittedAt: new Date(),
    };
    task.status = 'completed';
    task.completedAt = new Date();

    await task.save();

    // Record submission history
    await Submission.create({
      taskId: task._id,
      userId: req.user._id,
      fileUrl: task.submission.fileUrl,
      docLink: task.submission.docLink,
      notes: task.submission.notes,
      submittedAt: task.submission.submittedAt,
    });

    const project = await Project.findById(task.projectId);
    const member = await User.findById(task.assignedTo);
    if (project && member) {
      notifyTaskCompleted(task, member, project);
    }

    const updated = await Task.findById(task._id).populate('assignedTo', 'name email phone');

    return res.status(200).json({
      success: true,
      message: 'Deliverable submitted successfully! Task marked as completed.',
      task: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/task/:id
// @access  Private (Leader only)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ taskId: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
