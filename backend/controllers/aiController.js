const Project = require('../models/Project');
const { calculateProjectProgress } = require('../utils/progressCalc');
const {
  parseNaturalLanguageCommand,
  generateSmartInsight,
  generateWeeklyReport,
} = require('../bot/aiHandler');
const { getGeminiModel } = require('../config/gemini');

// @desc    Parse natural language into structured task
// @route   POST /api/ai/parse
// @access  Private
exports.parseCommand = async (req, res) => {
  try {
    const { message, projectId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let members = [];
    if (projectId) {
      const project = await Project.findById(projectId).populate('members', 'name email');
      if (project) members = project.members;
    }

    const parsed = await parseNaturalLanguageCommand(message, members);
    return res.status(200).json({ success: true, parsed });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get AI Copilot smart insights
// @route   GET /api/ai/insight/:projectId
// @access  Private
exports.getInsight = async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await calculateProjectProgress(projectId);
    const insight = await generateSmartInsight(stats);
    return res.status(200).json({ success: true, insight, stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get AI Weekly Progress Report
// @route   GET /api/ai/weekly-report/:projectId
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await calculateProjectProgress(projectId);
    const report = await generateWeeklyReport(stats);
    return res.status(200).json({ success: true, report, stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Task Breakdown from project idea/milestone
// @route   POST /api/ai/breakdown
// @access  Private
exports.generateTaskBreakdown = async (req, res) => {
  try {
    const { topic, phase } = req.body;
    const model = getGeminiModel();

    if (!model) {
      // Fallback suggestions
      return res.status(200).json({
        success: true,
        tasks: [
          { title: `${phase || 'Module'} Architecture & Wireframes`, priority: 'high', durationDays: 4 },
          { title: `${phase || 'Module'} Core Implementation`, priority: 'high', durationDays: 7 },
          { title: `${phase || 'Module'} Testing & Documentation`, priority: 'medium', durationDays: 3 },
        ],
      });
    }

    const prompt = `As a university Final Year Project tech lead, break down this project phase into 3 to 4 actionable, specific tasks.
Topic/Objective: "${topic}"
Phase: "${phase}"

Return ONLY a JSON array of objects with structure:
[
  { "title": "Task title", "description": "Short description", "priority": "high"|"medium"|"low", "durationDays": 3 }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const tasks = JSON.parse(text);

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
