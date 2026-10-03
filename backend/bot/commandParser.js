const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const {
  getProgressReport,
  getMyTasks,
  markTaskDone,
  submitTask,
  getOverdueTasks,
  getRoadmap,
  getAllCommandsHelp,
} = require('./botHandlers');
const {
  handleAiCopilot,
  generateSmartInsight,
  generateWeeklyReport,
} = require('./aiHandler');
const { calculateProjectProgress } = require('../utils/progressCalc');
const { notifyTaskAssigned } = require('../utils/notifications');

const DASHBOARD_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'https://teamflow-fyp.onrender.com';

/**
 * Main dispatcher for incoming WhatsApp bot messages with STRICT Access Control & English conversation
 */
const handleIncomingMessage = async (senderPhone, rawMessage, options = {}) => {
  const text = (rawMessage || '').trim();
  if (!text || !text.startsWith('!')) return null;

  const cleanPhone = (senderPhone || '').replace(/\D/g, '');
  const prefix = text.slice(1).trim();
  const lower = prefix.toLowerCase();
  const isFromMe = options.isFromMe || false;
  const pushName = options.pushName || '';
  const isGroup = options.isGroup || false;
  const remoteJid = options.remoteJid || '';

  // WhatsApp multi-device LID detection
  const senderLid = options.senderLid || (cleanPhone.length >= 14 ? cleanPhone : null);
  const isLid = cleanPhone.length >= 14 || (options.senderJid || '').endsWith('@lid');
  const searchDigits = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;

  // 1. Look up User by WhatsApp LID or Phone Number
  let user = null;

  // A. Check if this WhatsApp LID is already linked to a user
  if (senderLid) {
    user = await User.findOne({ whatsappLid: senderLid });
  }

  // B. Match by real phone number if cleanPhone is not a pure LID
  if (!user && cleanPhone && !isLid) {
    user = await User.findOne({
      phone: { $regex: new RegExp(searchDigits + '$') },
    });
  }

  // C. If message was sent from the host/leader phone that scanned the QR code
  if (!user && isFromMe) {
    user = await User.findOne({ role: 'leader' });
  }

  // If user is matched and we have their LID, save it so future messages match instantly!
  if (user && senderLid && user.whatsappLid !== senderLid) {
    user.whatsappLid = senderLid;
    await user.save();
  }

  // 2. HELP COMMAND (!help) - Publicly viewable
  if (lower === 'help' || lower === 'start' || lower === 'menu') {
    return getAllCommandsHelp(user);
  }

  // 3. SECURE VERIFY / LINK ACCOUNT COMMAND (!verify <6-digit-pin>)
  // Protects user accounts from being hijacked by others entering their phone number or name!
  if (lower.startsWith('verify') || lower.startsWith('linkaccount') || lower.startsWith('linkphone')) {
    const code = prefix.replace(/^(verify|linkaccount|linkphone)/i, '').trim();
    if (!code) {
      return `⚠️ *Usage:* !verify <your-6-digit-pin>\n*Example:* !verify 482910\n\n👉 Log in to your TeamFlow Dashboard (${DASHBOARD_URL}) to see your secret 6-digit WhatsApp Link PIN.`;
    }

    // Check if input is a 6-digit PIN
    const isPin = /^\d{6}$/.test(code);

    if (!isPin) {
      // SECURITY SHIELD: Block unauthorized attempts to link other people's numbers or names
      return `🔒 *SECURITY SHIELD: Unauthorized Linking Blocked*
━━━━━━━━━━━━━━━━━━
For privacy and account security, accounts CANNOT be linked using phone numbers, emails, or names directly.

👉 *How to securely link your WhatsApp account:*
1. Log in to your TeamFlow Web Dashboard:
   ${DASHBOARD_URL}/login
2. Look at the top of your Dashboard to see your private 6-digit *WhatsApp Link PIN*.
3. Reply here with:
   *!verify <your-6-digit-pin>*
   _Example: !verify 482910_`;
    }

    const matchedUser = await User.findOne({ whatsappPin: code });

    if (!matchedUser) {
      return `❌ *Invalid or Expired PIN*\nNo TeamFlow account was found with the PIN "${code}".\nPlease check your current 6-digit PIN on your TeamFlow Web Dashboard: ${DASHBOARD_URL}`;
    }

    // Link this WhatsApp account / LID to the user profile
    if (senderLid) {
      matchedUser.whatsappLid = senderLid;
    }
    if (cleanPhone && !isLid) {
      matchedUser.phone = cleanPhone;
    }

    // Invalidate the used PIN and generate a new one
    matchedUser.whatsappPin = Math.floor(100000 + Math.random() * 900000).toString();
    await matchedUser.save();

    const matchedProject = matchedUser.projectId ? await Project.findById(matchedUser.projectId) : null;
    const projectName = matchedProject ? matchedProject.name : 'No project assigned yet';

    return `✅ *WHATSAPP ACCOUNT SECURELY VERIFIED & LINKED!*
━━━━━━━━━━━━━━━━━━
Welcome, *${matchedUser.name}*!
Your WhatsApp account has been securely linked to your TeamFlow profile.

🏷️ *Project:* ${projectName}
👤 *Role:* ${matchedUser.role.toUpperCase()}

You can now use all commands:
• *!progress* — Overall project progress
• *!mytasks* — Your assigned tasks
• *!ai <question>* — Ask the AI Project Copilot
• *!roadmap* — Project milestones
• *!help* — View all available commands`;
  }

  // 3b. PASSWORD RESET COMMAND VIA WHATSAPP (!resetpassword / !forgotpassword)
  if (lower.startsWith('resetpassword') || lower.startsWith('forgotpassword') || lower.startsWith('forgetpassword')) {
    const resetUser = await User.findOne({
      $or: [
        ...(senderLid ? [{ whatsappLid: senderLid }] : []),
        ...(cleanPhone ? [
          { phone: cleanPhone },
          { phone: cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone },
          { phone: { $regex: searchDigits + '$' } },
        ] : []),
      ],
    }).select('+resetPasswordOtp +resetPasswordOtpExpire');

    if (!resetUser) {
      return `❌ *ACCOUNT NOT FOUND*
━━━━━━━━━━━━━━━━━━
Your WhatsApp is not linked to any registered TeamFlow account.
Please register or link your account first via:
${DASHBOARD_URL}/register`;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    resetUser.resetPasswordOtp = otp;
    resetUser.resetPasswordOtpExpire = new Date(Date.now() + 15 * 60 * 1000);
    await resetUser.save();

    return `🔐 *TEAMFLOW PASSWORD RESET CODE*
━━━━━━━━━━━━━━━━━━
Hello *${resetUser.name}*!

Here is your 6-digit verification code to reset your account password:
👉 *${otp}* 👈

⏱️ This code will expire in 15 minutes.
🌐 Go to: ${DASHBOARD_URL}/forgot-password
Enter your email (*${resetUser.email}*) and this 6-digit code to set your new password.`;
  }

  // 4. JOIN COMMAND (!join <inviteCode>) - Allows member to enroll directly from WhatsApp
  if (lower.startsWith('join')) {
    const code = prefix.replace(/^join/i, '').trim().toUpperCase();
    if (!code) {
      return `⚠️ Format: *!join <inviteCode>*\nExample: !join TF-H81TT\nAsk your Project Leader for your team's invite code!`;
    }

    const project = await Project.findOne({ inviteCode: code });
    if (!project) {
      return `❌ Invalid Invite Code "${code}". Please verify the code with your Project Leader.`;
    }

    if (!user) {
      // Auto-register student under this project
      user = await User.create({
        name: pushName || `Member (${cleanPhone.slice(-4)})`,
        email: `${cleanPhone || Date.now()}@student.teamflow.local`,
        password: 'password123',
        phone: !isLid ? cleanPhone : '03000000000',
        whatsappLid: senderLid,
        role: 'member',
        projectId: project._id,
      });

      if (!project.members.some((m) => m.toString() === user._id.toString())) {
        project.members.push(user._id);
        await project.save();
      }
    } else {
      user.projectId = project._id;
      if (senderLid) user.whatsappLid = senderLid;
      await user.save();

      if (!project.members.some((m) => m.toString() === user._id.toString()) && project.leaderId.toString() !== user._id.toString()) {
        project.members.push(user._id);
        await project.save();
      }
    }

    return `🎉 *SUCCESSFULLY JOINED PROJECT!*
━━━━━━━━━━━━━━━━━━
Welcome *${user.name}* to *${project.name}*!

You are now a verified member of this project. You can now use:
• *!mytasks* — Your personal assigned tasks
• *!progress* — Overall project progress
• *!roadmap* — Project phases & timeline`;
  }

  // 5. STRICT SECURITY CHECK:
  // If user is UNREGISTERED / UNLINKED: Deny access immediately!
  if (!user) {
    return `🔒 *ACCESS DENIED (Unlinked WhatsApp Account)*
━━━━━━━━━━━━━━━━━━
Your WhatsApp account is not linked to any registered TeamFlow profile.

Only verified FYP group members can view project progress and tasks.

👉 *How to Get Access:*
1. If you already have a TeamFlow account, link your WhatsApp account by replying:
   *!verify <your-email-or-phone>*
   _Example: !verify 03059108301 or !verify student@gmail.com_

2. If your Leader gave you a Project Invite Code, reply:
   *!join <inviteCode>*
   _Example: !join TF-H81TT_

3. Or register an account on the Web Dashboard:
   ${DASHBOARD_URL}/register`;
  }

  // If user is registered but has no project assigned:
  if (!user.projectId) {
    return `⚠️ *NO PROJECT ASSIGNED*
━━━━━━━━━━━━━━━━━━
Hello *${user.name}*! You are registered on TeamFlow, but not currently assigned to any FYP project workspace.

Please ask your Project Leader for your group's Invite Code and reply:
*!join <inviteCode>* (e.g. !join TF-XXXXX)
or join via the Web Dashboard: ${DASHBOARD_URL}`;
  }

  // 6. PROJECT ISOLATION VERIFICATION:
  const project = await Project.findById(user.projectId);
  if (!project) {
    return `⚠️ Your assigned project was not found in the database. Please contact your leader.`;
  }

  const isLeader = project.leaderId.toString() === user._id.toString();
  const isMember = project.members.some((m) => m.toString() === user._id.toString());

  if (!isLeader && !isMember) {
    return `🔒 *ACCESS DENIED*\nYou are not a verified member of project "${project.name}".`;
  }

  // 7. WHATSAPP GROUP CHAT ISOLATION:
  if (isGroup && remoteJid) {
    const linkedProject = await Project.findOne({ whatsappGroupJid: remoteJid });
    if (linkedProject) {
      if (user.projectId.toString() !== linkedProject._id.toString()) {
        return `🔒 *ACCESS DENIED*\nYou are not a verified member of this WhatsApp FYP Group (*${linkedProject.name}*)!`;
      }
    } else if (isLeader) {
      project.whatsappGroupJid = remoteJid;
      await project.save();
    }
  }

  // ==========================================
  // AUTHORIZED COMMANDS (FOR USER'S PROJECT ONLY)
  // ==========================================

  // LINK WHATSAPP GROUP (Leader Only)
  if (lower === 'linkgroup' || lower === 'link') {
    if (!isGroup) {
      return `ℹ️ Please run this command inside your WhatsApp Group to link it to *${project.name}*.`;
    }
    if (!isLeader) {
      return `🔒 *LEADER ONLY*\nOnly the Project Leader can link this WhatsApp group to the project.`;
    }
    project.whatsappGroupJid = remoteJid;
    await project.save();
    return `🔗 *WHATSAPP GROUP LINKED SUCCESSFULLY!*
━━━━━━━━━━━━━━━━━━
This WhatsApp Group is now linked to *"${project.name}"*!

✅ Only verified members of *${project.name}* can now execute bot commands in this group.
🔒 All unauthorized users will be blocked.`;
  }

  // REMOVE MEMBER (Leader Only)
  if (lower.startsWith('remove') || lower.startsWith('kick')) {
    if (!isLeader) {
      return `🔒 *LEADER ONLY*\nOnly the Project Leader can remove members from *${project.name}*.`;
    }

    const target = prefix.replace(/^(remove|kick)/i, '').trim();
    if (!target) {
      return `⚠️ *Usage:* !remove <member-name-or-phone>\n*Example:* !remove Ali or !remove 03001234567`;
    }

    const populatedProject = await Project.findById(project._id).populate('members', 'name email phone role');
    const targetClean = target.replace(/\D/g, '');
    const targetDigits = targetClean.length >= 9 ? targetClean.slice(-9) : targetClean;

    const memberToRemove = (populatedProject.members || []).find((m) => {
      if (m.name.toLowerCase().includes(target.toLowerCase())) return true;
      if (targetDigits && m.phone && m.phone.endsWith(targetDigits)) return true;
      if (m.email && m.email.toLowerCase() === target.toLowerCase()) return true;
      return false;
    });

    if (!memberToRemove) {
      const currentList = (populatedProject.members || []).map((m) => m.name).join(', ') || 'No members';
      return `⚠️ Member "${target}" was not found in your project.\n*Active Members:* ${currentList}`;
    }

    // Remove from project
    project.members = project.members.filter((m) => m.toString() !== memberToRemove._id.toString());
    await project.save();

    // Detach member's project
    const memberDoc = await User.findById(memberToRemove._id);
    if (memberDoc) {
      memberDoc.projectId = null;
      await memberDoc.save();
    }

    // Unassign pending tasks
    await Task.updateMany(
      { projectId: project._id, assignedTo: memberToRemove._id },
      { assignedTo: null }
    );

    return `🗑️ *MEMBER REMOVED FROM PROJECT*
━━━━━━━━━━━━━━━━━━
*${memberToRemove.name}* has been removed from *${project.name}*.

• Project membership revoked
• Active tasks have been unassigned`;
  }

  // PROGRESS REPORT
  if (lower === 'progress') {
    return await getProgressReport(project._id);
  }

  // MY TASKS
  if (lower === 'mytasks' || lower === 'my tasks' || lower === 'tasks') {
    return await getMyTasks(user);
  }

  // DONE TASK
  if (lower.startsWith('done')) {
    const taskTitle = prefix.replace(/^done/i, '').trim();
    return await markTaskDone(user, taskTitle);
  }

  // SUBMIT TASK
  if (lower.startsWith('submit')) {
    const parts = prefix.replace(/^submit/i, '').trim().split(/\s+/);
    if (parts.length < 2) {
      return `⚠️ Format: !submit <taskTitle> <docLink>\nExample: !submit Literature Review https://docs.google.com/...`;
    }
    const link = parts[parts.length - 1];
    const taskTitle = parts.slice(0, parts.length - 1).join(' ');
    return await submitTask(user, taskTitle, link);
  }

  // OVERDUE TASKS
  if (lower === 'overdue' || lower === 'late') {
    return await getOverdueTasks(project._id);
  }

  // ROADMAP PHASES
  if (lower === 'roadmap' || lower === 'phases') {
    return await getRoadmap(project._id);
  }

  // AI INSIGHT
  if (lower === 'insight' || lower === 'insights') {
    const stats = await calculateProjectProgress(project._id);
    return await generateSmartInsight(stats);
  }

  // AI WEEKLY REPORT
  if (lower === 'report' || lower === 'weekly') {
    const stats = await calculateProjectProgress(project._id);
    return await generateWeeklyReport(stats);
  }

  // AI COPILOT (!ai ...) - AVAILABLE FOR BOTH LEADERS & MEMBERS
  if (lower.startsWith('ai') || lower.startsWith('copilot')) {
    const query = prefix.replace(/^(ai|copilot)/i, '').trim();
    if (!query) {
      return `🤖 *TEAMFLOW AI PROJECT COPILOT*
━━━━━━━━━━━━━━━━━━
Ask me anything about your project or tasks, or assign new deliverables!

*Examples:*
• *!ai who is behind on their tasks?*
• *!ai summarize our current project status*
• *!ai what should we focus on this week?*
${isLeader ? '• *!ai assign Ali to complete API documentation by Friday high priority*\n' : ''}• *!ai give us tips for FYP supervisor presentation*`;
    }

    try {
      const populatedProject = await Project.findById(project._id)
        .populate('members', 'name email phone role')
        .populate('leaderId', 'name email phone role');
      const allMembers = [
        ...(populatedProject.members || []),
        ...(populatedProject.leaderId ? [populatedProject.leaderId] : []),
      ];

      const projectTasks = await Task.find({ projectId: project._id }).populate('assignedTo', 'name email phone');
      const stats = await calculateProjectProgress(project._id);

      const aiResponse = await handleAiCopilot({
        message: query,
        user,
        project: populatedProject,
        isLeader,
        members: allMembers,
        tasks: projectTasks,
        progressStats: stats,
      });

      if (aiResponse.type === 'assign') {
        if (!isLeader) {
          return `🔒 *LEADER ONLY*\nOnly the Project Leader (${populatedProject.leaderId?.name || 'Leader'}) can assign new tasks.`;
        }

        // Match member name (fuzzy or first name)
        const targetName = (aiResponse.memberName || '').toLowerCase();
        let assignedMember = allMembers.find(
          (m) =>
            m.name.toLowerCase() === targetName ||
            m.name.toLowerCase().includes(targetName) ||
            targetName.includes(m.name.toLowerCase()) ||
            m.name.split(' ')[0].toLowerCase() === targetName.split(' ')[0]
        );

        if (!assignedMember) {
          assignedMember = allMembers[0];
        }

        const newTask = await Task.create({
          title: aiResponse.title || 'New Project Task',
          description: `Created via WhatsApp AI Copilot: "${query}"`,
          assignedTo: assignedMember._id,
          projectId: project._id,
          phase: aiResponse.phase || project.roadmap?.[0]?.phase || 'General',
          priority: ['low', 'medium', 'high'].includes(aiResponse.priority) ? aiResponse.priority : 'medium',
          deadline: aiResponse.deadline ? new Date(aiResponse.deadline) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'pending',
        });

        // Notify member
        notifyTaskAssigned(newTask, assignedMember, project);

        return `🤖 *AI TASK CREATED & ASSIGNED!*
━━━━━━━━━━━━━━━━━━
📌 *Task:* ${newTask.title}
👤 *Assigned To:* ${assignedMember.name}
⚡ *Priority:* ${newTask.priority.toUpperCase()}
⏰ *Deadline:* ${new Date(newTask.deadline).toLocaleDateString()}
🏷️ *Project:* ${project.name}

_Notification sent to ${assignedMember.name} via WhatsApp!_`;
      }

      // Contextual AI Q&A response
      return `🤖 *TEAMFLOW AI COPILOT*
━━━━━━━━━━━━━━━━━━
${aiResponse.reply || 'I have analyzed your project status.'}`;
    } catch (err) {
      console.error('AI command error:', err);
      return `❌ AI Copilot encountered an issue: ${err.message}`;
    }
  }

  // Unrecognized command
  return `❓ Unknown command "!${prefix}". Type *!help* to see all available commands.`;
};

module.exports = { handleIncomingMessage };
