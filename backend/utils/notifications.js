const User = require('../models/User');
const Project = require('../models/Project');

/**
 * Send WhatsApp notification to assigned member when a task is created
 */
const notifyTaskAssigned = async (task, member, project) => {
  try {
    const { getWhatsAppSocket, isConnected } = require('../bot/whatsappBot');
    if (!isConnected()) {
      console.log(`[Notification Skipped - Bot Disconnected] Task "${task.title}" assigned to ${member.name}`);
      return false;
    }

    const phone = member.phone;
    if (!phone) return false;

    const formattedDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';

    const message = `📋 *NEW TASK ASSIGNED!*
━━━━━━━━━━━━━━━━━━
Hello *${member.name}*! A new task has been assigned to you by your Project Leader.

📌 *Title:* ${task.title}
📝 *Description:* ${task.description || 'N/A'}
🏷️ *Phase:* ${task.phase || 'General'}
⚡ *Priority:* ${task.priority.toUpperCase()}
⏰ *Deadline:* ${formattedDeadline}

_Reply with "!mytasks" to see your queue or "!done ${task.title}" once finished._`;

    const { sendWhatsAppMessage } = require('../bot/whatsappBot');
    return await sendWhatsAppMessage(phone, message);
  } catch (error) {
    console.error('Failed to send task assignment notification:', error.message);
    return false;
  }
};

/**
 * Send WhatsApp notification to Leader when a member marks a task complete or submits work
 */
const notifyTaskCompleted = async (task, member, project) => {
  try {
    const { isConnected, sendWhatsAppMessage } = require('../bot/whatsappBot');
    if (!isConnected()) return false;

    const leader = await User.findById(project.leaderId);
    if (!leader || !leader.phone) return false;

    const submissionInfo = task.submission?.docLink
      ? `\n🔗 *Link:* ${task.submission.docLink}`
      : task.submission?.fileUrl
      ? `\n📎 *File:* ${task.submission.fileUrl}`
      : '';

    const message = `🎉 *TASK COMPLETED!*
━━━━━━━━━━━━━━━━━━
Leader Notice: *${member.name}* just completed a task in *${project.name}*!

✅ *Task:* ${task.title}
🏷️ *Phase:* ${task.phase || 'General'}${submissionInfo}
💬 *Notes:* ${task.submission?.notes || 'None'}

_Check your Leader Dashboard or type "!progress" for overall project status._`;

    return await sendWhatsAppMessage(leader.phone, message);
  } catch (error) {
    console.error('Failed to send task completion notification:', error.message);
    return false;
  }
};

module.exports = {
  notifyTaskAssigned,
  notifyTaskCompleted,
};
