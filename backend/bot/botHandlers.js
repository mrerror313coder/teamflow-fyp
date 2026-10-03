const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { calculateProjectProgress } = require('../utils/progressCalc');

/**
 * Format overall progress report for WhatsApp
 */
const getProgressReport = async (projectId) => {
  try {
    if (!projectId) {
      return '🔒 *ACCESS RESTRICTED*\nYou are not enrolled in any active FYP project. Please ask your Project Leader for an invite code or join via the web dashboard.';
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return '⚠️ Project record not found in system.';
    }

    const stats = await calculateProjectProgress(project._id);

    const memberLines = stats.memberProgress.map((m) => {
      const statusEmoji = m.overdue > 0 ? '⚠️' : m.percentage >= 70 ? '✅' : '⏳';
      return `${statusEmoji} *${m.name}:* ${m.percentage}% (${m.completed}/${m.total} tasks) ${m.overdue > 0 ? `[${m.overdue} late]` : ''}`;
    }).join('\n');

    return `📊 *PROJECT STATUS: ${stats.projectName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━
📈 *Overall Progress:* ${stats.overallPercentage}%
✅ *Done:* ${stats.completedTasks} | ⏳ *In Progress:* ${stats.inProgressTasks} | 🔴 *Overdue:* ${stats.overdueCount}

👥 *MEMBER BREAKDOWN:*
${memberLines || 'No members assigned yet'}

💡 _Tip: Reply "!mytasks" for your personal queue or "!insight" for AI analysis._`;
  } catch (error) {
    console.error('Bot getProgressReport error:', error);
    return `❌ Error fetching progress report: ${error.message}`;
  }
};

/**
 * Resolve User object from User model or phone string
 */
const resolveUser = async (userOrPhone) => {
  if (userOrPhone && typeof userOrPhone === 'object' && userOrPhone._id) {
    return userOrPhone;
  }
  const cleanPhone = (userOrPhone || '').toString().replace(/\D/g, '');
  if (!cleanPhone) return null;
  return await User.findOne({
    phone: { $regex: new RegExp(cleanPhone.slice(-9) + '$') },
  });
};

/**
 * Get pending/active tasks for a specific user or phone
 */
const getMyTasks = async (userOrPhone) => {
  try {
    const user = await resolveUser(userOrPhone);
    if (!user) {
      return `🔒 *ACCESS DENIED*\nYour phone number is not registered in TeamFlow. Please register on the web dashboard first!`;
    }

    const tasks = await Task.find({
      assignedTo: user._id,
      status: { $in: ['pending', 'in_progress', 'blocked'] },
    }).sort({ deadline: 1 });

    if (tasks.length === 0) {
      return `🎉 *Good news, ${user.name}!* You have 0 pending tasks right now. All caught up!`;
    }

    const now = new Date();
    const taskList = tasks.map((t, idx) => {
      const isLate = t.deadline && new Date(t.deadline) < now;
      const statusIcon = isLate ? '🔴 [OVERDUE]' : t.status === 'in_progress' ? '⏳' : '📋';
      const deadlineStr = t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline';
      return `${idx + 1}. ${statusIcon} *${t.title}*
   Phase: ${t.phase} | Due: ${deadlineStr} | Priority: ${t.priority.toUpperCase()}`;
    }).join('\n\n');

    return `📋 *PENDING TASKS FOR ${user.name.toUpperCase()}* (${tasks.length})
━━━━━━━━━━━━━━━━━━
${taskList}

_To complete a task, send:_
*"!done <task title>"* or *"!submit <task title> <doc link>"*`;
  } catch (error) {
    console.error('Bot getMyTasks error:', error);
    return `❌ Error fetching your tasks: ${error.message}`;
  }
};

/**
 * Mark a task as done via WhatsApp command
 */
const markTaskDone = async (userOrPhone, taskTitle) => {
  try {
    const user = await resolveUser(userOrPhone);
    if (!user) {
      return `🔒 *ACCESS DENIED*\nYour account was not found in TeamFlow users.`;
    }

    if (!taskTitle) {
      return `⚠️ Please specify the task title! Example: "!done Literature Review"`;
    }

    // Match task case-insensitively
    const task = await Task.findOne({
      assignedTo: user._id,
      title: { $regex: new RegExp(taskTitle.trim(), 'i') },
    });

    if (!task) {
      return `⚠️ Could not find an active task matching "${taskTitle}" assigned to you. Reply "!mytasks" to verify title.`;
    }

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    // Trigger leader notification
    const Project = require('../models/Project');
    const project = await Project.findById(task.projectId);
    if (project) {
      const { notifyTaskCompleted } = require('../utils/notifications');
      notifyTaskCompleted(task, user, project);
    }

    return `✅ *SUCCESS!*
Task *"${task.title}"* has been marked as *COMPLETED* in the project system!
Your leader and dashboard have been updated. 🚀`;
  } catch (error) {
    return `❌ Failed to update task: ${error.message}`;
  }
};

/**
 * Submit task with a Google doc/GitHub link via WhatsApp
 */
const submitTask = async (userOrPhone, taskTitle, docLink, notes = '') => {
  try {
    const user = await resolveUser(userOrPhone);
    if (!user) {
      return `🔒 *ACCESS DENIED*\nYou are not registered in TeamFlow.`;
    }

    if (!taskTitle || !docLink) {
      return `⚠️ Format: !submit <taskTitle> <link>\nExample: !submit UI Design https://docs.google.com/...`;
    }

    const task = await Task.findOne({
      assignedTo: user._id,
      title: { $regex: new RegExp(taskTitle.trim(), 'i') },
    });

    if (!task) {
      return `⚠️ Task "${taskTitle}" not found under your assigned tasks.`;
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.submission = {
      docLink,
      notes: notes || 'Submitted via WhatsApp Bot',
      submittedAt: new Date(),
    };
    await task.save();

    // Save history
    const Submission = require('../models/Submission');
    await Submission.create({
      taskId: task._id,
      userId: user._id,
      docLink,
      notes: task.submission.notes,
    });

    const project = await Project.findById(task.projectId);
    if (project) {
      const { notifyTaskCompleted } = require('../utils/notifications');
      notifyTaskCompleted(task, user, project);
    }

    return `🎉 *WORK SUBMITTED!*
Task: *"${task.title}"*
Link: ${docLink}
Status: *COMPLETED* ✅

Your Project Leader has been notified! Great job!`;
  } catch (error) {
    return `❌ Submission error: ${error.message}`;
  }
};

/**
 * Get overdue tasks for a project
 */
const getOverdueTasks = async (projectId) => {
  try {
    if (!projectId) {
      return '🔒 *ACCESS RESTRICTED*\nYou are not enrolled in any active project.';
    }

    const overdue = await Task.find({
      projectId,
      status: { $in: ['pending', 'in_progress', 'blocked'] },
      deadline: { $lt: new Date() },
    }).populate('assignedTo', 'name phone');

    if (overdue.length === 0) {
      return `✅ *ZERO OVERDUE TASKS!* Everything in your project is currently on schedule! 🎯`;
    }

    const items = overdue.map((t, i) => {
      const daysLate = Math.floor((new Date() - new Date(t.deadline)) / (1000 * 60 * 60 * 24));
      return `${i + 1}. 🔴 *${t.title}*
   Assigned to: *${t.assignedTo?.name || 'Unassigned'}*
   Deadline was: ${new Date(t.deadline).toLocaleDateString()} (${daysLate} days late!)`;
    }).join('\n\n');

    return `⚠️ *OVERDUE TASKS REPORT* (${overdue.length})
━━━━━━━━━━━━━━━━━━
${items}

_Action needed: Remind assignees to submit work._`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
};

/**
 * Get current roadmap
 */
const getRoadmap = async (projectId) => {
  try {
    if (!projectId) {
      return '🔒 *ACCESS RESTRICTED*\nYou are not enrolled in any active project.';
    }

    const project = await Project.findById(projectId);
    if (!project || !project.roadmap || project.roadmap.length === 0) {
      return `🗺️ No roadmap phases set up for this project yet. Leader can add them in the dashboard!`;
    }

    const phases = project.roadmap.map((r, i) => {
      const icon = r.status === 'completed' ? '✅' : r.status === 'active' ? '🔄' : '⏳';
      const dates = r.startDate && r.endDate
        ? `(${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()})`
        : '';
      return `${i + 1}. ${icon} *Phase ${i + 1}: ${r.phase}* [${r.status.toUpperCase()}]
   ${r.description || 'No description'} ${dates}`;
    }).join('\n\n');

    return `🗺️ *PROJECT ROADMAP: ${project.name}*
━━━━━━━━━━━━━━━━━━
${phases}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
};

/**
 * Get commands help list
 */
const getAllCommandsHelp = (user = null) => {
  const userStatus = user
    ? `✅ *Status:* Verified Member (${user.name})`
    : `⚠️ *Status:* Unregistered / Guest`;

  return `🤖 *TEAMFLOW WHATSAPP BOT COMMANDS*
━━━━━━━━━━━━━━━━━━
${userStatus}

📊 *!progress* — Overall project progress & member %
📋 *!mytasks* — Your personal pending tasks & deadlines
✅ *!done <task title>* — Mark a task as completed
📎 *!submit <title> <link>* — Submit Google Doc/GitHub link
🔴 *!overdue* — List all tasks that are currently late
🗺️ *!roadmap* — View project phases and roadmap
💡 *!insight* — AI Copilot risk analysis and suggestion
📑 *!report* — Weekly executive project summary
🤖 *!ai <question/task>* — AI Copilot Q&A & smart task assignment
🗑️ *!remove <name/phone>* — Remove a member from project (Leader only)
🔑 *!join <inviteCode>* — Join a project directly via WhatsApp
🔗 *!verify <6-digit-pin>* — Securely link WhatsApp using your Dashboard PIN
🔐 *!resetpassword* — Get an instant code to reset your account password
❓ *!help* — Show this command menu

_Note: Project data is restricted to verified group members only._`;
};

module.exports = {
  getProgressReport,
  getMyTasks,
  markTaskDone,
  submitTask,
  getOverdueTasks,
  getRoadmap,
  getAllCommandsHelp,
};

