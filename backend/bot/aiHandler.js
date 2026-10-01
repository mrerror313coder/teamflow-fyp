const { getGeminiModel } = require('../config/gemini');

/**
 * AI Copilot Master Handler: Handles both natural language task assignment
 * and conversational Q&A using live project context.
 */
const handleAiCopilot = async ({ message, user, project, isLeader, members = [], tasks = [], progressStats = {} }) => {
  const model = getGeminiModel();

  // Prepare live context snapshot
  const memberNames = members.map((m) => m.name);
  const taskSummary = tasks.map((t) => ({
    title: t.title,
    assignedTo: t.assignedTo?.name || 'Unassigned',
    status: t.status,
    priority: t.priority,
    deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : 'No deadline',
    isOverdue: t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed',
  }));

  const projectContext = {
    projectName: project.name,
    projectDescription: project.description || '',
    leaderName: project.leaderId?.name || 'Project Leader',
    members: memberNames,
    overallProgress: `${progressStats.overallPercentage || 0}%`,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    overdueTasks: taskSummary.filter((t) => t.isOverdue).map((t) => `${t.title} (${t.assignedTo})`),
    roadmapPhases: (project.roadmap || []).map((r) => r.phase),
    activeTasks: taskSummary.filter((t) => t.status !== 'completed'),
  };

  if (!model) {
    return handleLocalAiFallback({ message, user, isLeader, projectContext, members });
  }

  try {
    const prompt = `You are TeamFlow AI Copilot, an expert AI Project Manager for university Final Year Projects (FYP).
LIVE PROJECT SNAPSHOT:
${JSON.stringify(projectContext, null, 2)}

User Asking: ${user.name} (Role: ${isLeader ? 'Leader' : 'Member'})
User Message: "${message}"

INSTRUCTIONS:
1. If the message is an explicit task assignment instruction (e.g. "assign Ali to build login module by Friday high priority"):
   - If user is NOT the Leader:
     Return JSON: {"type": "chat", "reply": "🔒 Only the Project Leader (${projectContext.leaderName}) can assign new tasks. You can discuss this task with your leader!"}
   - If user IS the Leader:
     Return JSON:
     {
       "type": "assign",
       "title": "Concise Task Title",
       "memberName": "exact or closest matching member name from members list",
       "priority": "low" | "medium" | "high",
       "deadline": "YYYY-MM-DD",
       "phase": "relevant roadmap phase name or General"
     }

2. Otherwise (questions, status inquiries, advice, what to do next, who is late, explanation, tips):
   Return JSON:
   {
     "type": "chat",
     "reply": "Smart, helpful, context-aware answer in clean English using the live project snapshot. Use clear bullet points and emojis. Keep under 110 words."
   }

Return ONLY valid JSON without markdown fences, backticks, or extra commentary.`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (error) {
    console.error('Gemini handleAiCopilot error:', error.message);
    return handleLocalAiFallback({ message, user, isLeader, projectContext, members });
  }
};

/**
 * Intelligent local fallback when Gemini is unavailable or encounters error
 */
const handleLocalAiFallback = ({ message, user, isLeader, projectContext, members }) => {
  const lower = message.toLowerCase();

  // If member tries to assign
  if ((lower.includes('assign') || lower.includes('create task') || lower.includes('add task')) && !isLeader) {
    return {
      type: 'chat',
      reply: `🔒 Only the Project Leader (${projectContext.leaderName}) can assign new tasks. You can discuss this task with your leader!`,
    };
  }

  // If assign command by leader
  if ((lower.includes('assign') || lower.includes('create task') || lower.includes('add task')) && isLeader) {
    let matchedMember = members[0]?.name || 'Team Member';
    for (const m of members) {
      if (lower.includes(m.name.toLowerCase()) || lower.includes(m.name.split(' ')[0].toLowerCase())) {
        matchedMember = m.name;
        break;
      }
    }

    let priority = 'medium';
    if (lower.includes('urgent') || lower.includes('high')) priority = 'high';
    else if (lower.includes('low')) priority = 'low';

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 3);

    const taskTitle = message
      .replace(/!ai/i, '')
      .replace(/assign/i, '')
      .replace(new RegExp(matchedMember, 'i'), '')
      .replace(/by \w+|high priority|low priority|urgent/gi, '')
      .trim() || 'New Milestone Task';

    return {
      type: 'assign',
      title: taskTitle,
      memberName: matchedMember,
      priority,
      deadline: deadlineDate.toISOString().split('T')[0],
      phase: projectContext.roadmapPhases?.[0] || 'General',
    };
  }

  // Question: Overdue
  if (lower.includes('overdue') || lower.includes('late')) {
    if (projectContext.overdueTasks.length === 0) {
      return {
        type: 'chat',
        reply: `🎉 Great news, *${user.name}*! There are currently no overdue tasks in *${projectContext.projectName}*. Keep up the great velocity!`,
      };
    }
    return {
      type: 'chat',
      reply: `⚠️ *Attention:* Currently, ${projectContext.overdueTasks.length} task(s) are overdue:\n${projectContext.overdueTasks.map((t) => `• 🔴 ${t}`).join('\n')}\n\nPlease check in with the assigned members!`,
    };
  }

  // Question: Progress / Status
  if (lower.includes('progress') || lower.includes('status') || lower.includes('velocity')) {
    return {
      type: 'chat',
      reply: `📊 *${projectContext.projectName} Status:*\n• Completion: *${projectContext.overallProgress}*\n• Completed Tasks: *${projectContext.completedTasks}/${projectContext.totalTasks}*\n• Active Tasks Remaining: *${projectContext.activeTasks.length}*`,
    };
  }

  // General helpful response
  return {
    type: 'chat',
    reply: `👋 Hello *${user.name}*! I am your AI Copilot for *${projectContext.projectName}*.\n\n• Progress is at *${projectContext.overallProgress}* with *${projectContext.activeTasks.length}* active tasks remaining.\n• Send *!progress* for member completion breakdown.\n• Send *!mytasks* to check your pending deliverables!`,
  };
};

/**
 * Generate Smart AI Insights from project data
 */
const generateSmartInsight = async (projectData) => {
  const model = getGeminiModel();

  if (!model) {
    const { overallPercentage, overdueCount, memberProgress = [] } = projectData;
    const slowestMember = [...memberProgress].sort((a, b) => a.percentage - b.percentage)[0];
    const risk = overdueCount > 2 ? '🔴 HIGH' : overdueCount > 0 ? '🟡 MEDIUM' : '🟢 LOW';

    return `🤖 *AI PROJECT COPILOT INSIGHT*
━━━━━━━━━━━━━━━━━━
📊 *Risk Level:* ${risk}
👤 *Needs Attention:* ${slowestMember ? `${slowestMember.name} (${slowestMember.percentage}% complete)` : 'None'}
⏱️ *Timeline Forecast:* ${overallPercentage > 50 ? 'On track to meet milestone deadline!' : 'Pacing behind schedule, sprint needed.'}
💡 *Actionable Suggestion:* ${overdueCount > 0 ? `Reallocate ${overdueCount} overdue tasks or initiate daily standup sync.` : 'Maintain momentum and begin testing phase early.'}`;
  }

  try {
    const prompt = `You are an elite AI Project Manager. Analyze this group project data and provide:
1. Risk level (🟢 Low / 🟡 Medium / 🔴 High)
2. Which member needs attention and why
3. Deadline prediction (Will project finish on time?)
4. One high-impact actionable suggestion

Keep the response under 100 words. Format cleanly with emojis and bullet points.
Project Data:
${JSON.stringify(projectData, null, 2)}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini generateSmartInsight error:', error.message);
    return '🤖 AI Copilot is currently recalibrating. Please check tasks in dashboard.';
  }
};

/**
 * Generate Weekly Progress Report using Gemini AI
 */
const generateWeeklyReport = async (projectData) => {
  const model = getGeminiModel();

  if (!model) {
    const { projectName, overallPercentage, completedTasks, totalTasks, memberProgress = [] } = projectData;
    const memberLines = memberProgress
      .map((m) => `• *${m.name}:* ${m.completed}/${m.total} completed (${m.percentage}%)`)
      .join('\n');

    return `📑 *WEEKLY EXECUTIVE SUMMARY: ${projectName}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Overall Velocity:* ${overallPercentage}% (${completedTasks}/${totalTasks} Tasks Completed)

👥 *Individual Standings:*
${memberLines}

🎯 *Key Focus For Next Week:*
• Close remaining in-progress deliverables
• Review submissions and documentation
• Prepare for supervisor demonstration!`;
  }

  try {
    const prompt = `You are an executive university project manager. Write a concise, professional weekly progress report for the project. Include:
- Executive Summary
- Key Highlights & Deliverables
- Team Member breakdown
- Upcoming milestone priorities

Format with bold headings and emojis for WhatsApp & web display. Max 150 words.
Data:
${JSON.stringify(projectData, null, 2)}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini weekly report error:', error.message);
    return 'Unable to generate weekly report at this moment.';
  }
};

module.exports = {
  handleAiCopilot,
  generateSmartInsight,
  generateWeeklyReport,
};
