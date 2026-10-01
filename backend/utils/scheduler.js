const cron = require('node-cron');
const Task = require('../models/Task');
const { isConnected, sendWhatsAppMessage } = require('../bot/whatsappBot');

/**
 * Check tasks due tomorrow and send automated WhatsApp reminders
 */
const runDeadlineReminders = async () => {
  console.log('⏰ [Scheduler] Running deadline reminder check...');
  try {
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

    const upcomingTasks = await Task.find({
      status: { $in: ['pending', 'in_progress', 'blocked'] },
      deadline: { $gte: tomorrowStart, $lt: tomorrowEnd },
    }).populate('assignedTo', 'name phone');

    console.log(`⏰ Found ${upcomingTasks.length} tasks due tomorrow.`);

    if (!isConnected()) {
      console.log('⏰ WhatsApp bot not connected. Skipping reminder dispatches.');
      return;
    }

    for (const task of upcomingTasks) {
      if (task.assignedTo && task.assignedTo.phone) {
        const msg = `⚠️ *DEADLINE REMINDER!*
━━━━━━━━━━━━━━━━━━
Hello *${task.assignedTo.name}*, friendly reminder from TeamFlow!

Your task *"${task.title}"* is due *TOMORROW* (${task.deadline.toLocaleDateString()}).
⚡ Priority: ${task.priority.toUpperCase()}

Please submit your work or update status via web app or WhatsApp:
_Type: "!submit ${task.title} <docLink>" when done!_`;

        await sendWhatsAppMessage(task.assignedTo.phone, msg);
      }
    }
  } catch (error) {
    console.error('Error during deadline reminder check:', error.message);
  }
};

const initScheduler = () => {
  // Run daily at 09:00 AM (0 9 * * *)
  cron.schedule('0 9 * * *', () => {
    runDeadlineReminders();
  });
  console.log(' Daily deadline scheduler initialized (9:00 AM)');
};

module.exports = {
  initScheduler,
  runDeadlineReminders,
};
