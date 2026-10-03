const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { calculateProjectProgress } = require('../utils/progressCalc');
const { exportProjectToCsv, syncToGoogleSheet } = require('../utils/sheetSync');
const { standardizePhone } = require('../utils/phoneHelper');

const crypto = require('crypto');

const generateInviteCode = () => {
  return 'TF-' + Math.random().toString(36).substring(2, 7).toUpperCase();
};

// @desc    Create a new project
// @route   POST /api/project
// @access  Private (Leader only)
exports.createProject = async (req, res) => {
  try {
    const { name, description, roadmap, memberIds } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    const members = Array.isArray(memberIds) ? memberIds : [];
    const inviteCode = generateInviteCode();

    const project = await Project.create({
      name,
      description: description || '',
      leaderId: req.user._id,
      members,
      inviteCode,
      roadmap: Array.isArray(roadmap) && roadmap.length > 0 ? roadmap : [
        { phase: 'Research', description: 'Literature review & background research', status: 'active' },
        { phase: 'Design', description: 'System architecture, UI/UX, database schema', status: 'pending' },
        { phase: 'Development', description: 'Core feature coding & integrations', status: 'pending' },
        { phase: 'Testing', description: 'Unit testing, user testing & bug fixes', status: 'pending' },
      ],
    });

    // Update leader's projectId
    await User.findByIdAndUpdate(req.user._id, { projectId: project._id });

    // Update members' projectId
    if (members.length > 0) {
      await User.updateMany({ _id: { $in: members } }, { projectId: project._id });
    }

    const populated = await Project.findById(project._id)
      .populate('leaderId', 'name email phone')
      .populate('members', 'name email phone role');

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populated,
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get project by ID or current user's project
// @route   GET /api/project/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    let projectId = req.params.id;

    if (projectId === 'current') {
      if (req.user.projectId) {
        projectId = req.user.projectId;
      } else {
        const found = await Project.findOne({
          $or: [{ leaderId: req.user._id }, { members: req.user._id }],
        });
        if (found) projectId = found._id;
        else {
          return res.status(200).json({ success: true, project: null });
        }
      }
    }

    let project = await Project.findById(projectId)
      .populate('leaderId', 'name email phone role')
      .populate('members', 'name email phone role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Auto-generate inviteCode if not set for existing project
    if (!project.inviteCode) {
      project.inviteCode = generateInviteCode();
      await project.save();
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join a project using unique invite code
// @route   POST /api/project/join
// @access  Private
exports.joinProject = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Please provide an invite code' });
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    const project = await Project.findOne({ inviteCode: cleanCode });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Invalid invite code "${cleanCode}". Please verify with your Project Leader.`,
      });
    }

    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());
    const isLeader = project.leaderId.toString() === req.user._id.toString();

    if (!isMember && !isLeader) {
      project.members.push(req.user._id);
      await project.save();
    }

    await User.findByIdAndUpdate(req.user._id, { projectId: project._id });

    const updated = await Project.findById(project._id)
      .populate('leaderId', 'name email phone role')
      .populate('members', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${project.name}!`,
      project: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add member to project (by Email or Phone or UserID)
// @route   POST /api/project/:id/add-member
// @access  Private (Leader only)
exports.addMember = async (req, res) => {
  try {
    const { userId, email, phone } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let userToAdd;
    if (userId) {
      userToAdd = await User.findById(userId);
    } else if (email) {
      userToAdd = await User.findOne({ email: email.trim().toLowerCase() });
    } else if (phone) {
      const cleanPhone = standardizePhone(phone);
      userToAdd = await User.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: { $regex: new RegExp(cleanPhone.slice(-9) + '$') } },
        ],
      });
    }

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: `User not found with this ${email ? 'email' : 'phone number'}. Ask them to register and use your Project Invite Code (${project.inviteCode || 'TF-CODE'}).`,
      });
    }

    // Check if already in project
    const isMember = project.members.some((m) => m.toString() === userToAdd._id.toString());
    if (isMember) {
      return res.status(400).json({ success: false, message: `${userToAdd.name} is already a member of this project` });
    }

    project.members.push(userToAdd._id);
    await project.save();

    userToAdd.projectId = project._id;
    await userToAdd.save();

    const updatedProject = await Project.findById(project._id)
      .populate('leaderId', 'name email phone role')
      .populate('members', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `${userToAdd.name} added to ${project.name}!`,
      project: updatedProject,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/project/:id/members/:memberId
// @access  Private (Leader only)
exports.removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify requesting user is the project leader
    if (project.leaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project leader can remove members' });
    }

    // Cannot remove the leader
    if (project.leaderId.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project leader' });
    }

    // Remove from project.members
    project.members = project.members.filter((m) => m.toString() !== memberId);
    await project.save();

    // Detach user's projectId
    const removedUser = await User.findById(memberId);
    if (removedUser) {
      removedUser.projectId = null;
      await removedUser.save();
    }

    // Unassign pending tasks assigned to this member in this project
    await Task.updateMany(
      { projectId: project._id, assignedTo: memberId },
      { assignedTo: null }
    );

    const updatedProject = await Project.findById(project._id)
      .populate('leaderId', 'name email phone role')
      .populate('members', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: `${removedUser?.name || 'Member'} has been removed from ${project.name}`,
      project: updatedProject,
    });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update or add roadmap phases
// @route   PUT /api/project/:id/roadmap
// @access  Private (Leader only)
exports.updateRoadmap = async (req, res) => {
  try {
    const { roadmap } = req.body;
    if (!Array.isArray(roadmap)) {
      return res.status(400).json({ success: false, message: 'Roadmap must be an array of phases' });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { roadmap },
      { new: true, runValidators: true }
    ).populate('members', 'name email phone role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Roadmap updated successfully',
      roadmap: project.roadmap,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed project progress
// @route   GET /api/project/:id/progress
// @access  Private
exports.getProgress = async (req, res) => {
  try {
    let projectId = req.params.id;
    if (projectId === 'current') {
      const project = await Project.findOne({
        $or: [{ leaderId: req.user._id }, { members: req.user._id }],
      });
      if (!project) {
        return res.status(200).json({ success: true, progress: null });
      }
      projectId = project._id;
    }

    const progress = await calculateProjectProgress(projectId);

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export project tasks as CSV
// @route   GET /api/project/:id/export-csv
// @access  Private
exports.exportCsv = async (req, res) => {
  try {
    const csvData = await exportProjectToCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="teamflow_tasks_${Date.now()}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger Google Sheets sync
// @route   POST /api/project/:id/sync-sheet
// @access  Private (Leader only)
exports.syncSheet = async (req, res) => {
  try {
    const result = await syncToGoogleSheet(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
