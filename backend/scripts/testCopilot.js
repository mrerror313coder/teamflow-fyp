require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testCopilot() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const projectContext = {
    projectName: 'Smart Campus Navigation System',
    leader: 'Hamza Khan',
    members: ['Ali Ahmed', 'Sara Malik', 'Ahmed Raza'],
    tasks: [
      { title: 'Setup Mongo DB', assignedTo: 'Ali Ahmed', status: 'completed' },
      { title: 'Create Navigation Map', assignedTo: 'Sara Malik', status: 'in_progress', deadline: '2026-10-05', isOverdue: false },
      { title: 'Literature Review', assignedTo: 'Ahmed Raza', status: 'pending', deadline: '2026-09-28', isOverdue: true }
    ],
    roadmap: ['Planning', 'Design', 'Development', 'Testing']
  };

  async function ask(query, userRole = 'leader', userName = 'Hamza Khan') {
    const prompt = `You are TeamFlow AI Copilot, an expert AI Project Manager for university FYP projects.
LIVE PROJECT SNAPSHOT:
${JSON.stringify(projectContext, null, 2)}

User Asking: ${userName} (Role: ${userRole})
User Message: "${query}"

INSTRUCTIONS:
1. If the message is a task assignment command by a leader (e.g. 'assign Ali UI design by Friday high priority'):
   Return JSON:
   {
     "type": "assign",
     "title": "concise task title",
     "memberName": "exact matching member name from members list",
     "priority": "low" | "medium" | "high",
     "deadline": "YYYY-MM-DD",
     "phase": "roadmap phase name or General"
   }
2. Otherwise (questions, status requests, advice, explanations, reminders):
   Return JSON:
   {
     "type": "chat",
     "reply": "Direct, smart, context-aware answer in clean English using the project snapshot. Include helpful emojis and bullet points. Under 100 words."
   }

Return ONLY the raw JSON object, without backticks or markdown wrap.`;

    const res = await model.generateContent(prompt);
    const cleaned = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    console.log('QUERY:', query);
    console.log(JSON.parse(cleaned));
    console.log('---');
  }

  await ask('who has overdue tasks right now?');
  await ask('assign Ali to build GPS tracking module by next Tuesday high priority');
  await ask('what should we focus on this week?');
}

testCopilot().catch(console.error);
