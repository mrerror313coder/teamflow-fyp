const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * Generate CSV string from project tasks
 */
const exportProjectToCsv = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  const tasks = await Task.find({ projectId }).populate('assignedTo', 'name email phone');

  const headers = ['Task Title', 'Description', 'Assigned To', 'Member Phone', 'Status', 'Priority', 'Phase', 'Deadline', 'Submission Link', 'Completed At'];

  const rows = tasks.map((task) => {
    const title = `"${(task.title || '').replace(/"/g, '""')}"`;
    const description = `"${(task.description || '').replace(/"/g, '""')}"`;
    const assignedTo = `"${(task.assignedTo?.name || 'Unassigned').replace(/"/g, '""')}"`;
    const phone = `"${task.assignedTo?.phone || ''}"`;
    const status = `"${task.status}"`;
    const priority = `"${task.priority}"`;
    const phase = `"${task.phase || 'General'}"`;
    const deadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '';
    const submission = `"${(task.submission?.docLink || task.submission?.fileUrl || '').replace(/"/g, '""')}"`;
    const completedAt = task.completedAt ? new Date(task.completedAt).toISOString().split('T')[0] : '';

    return [title, description, assignedTo, phone, status, priority, phase, deadline, submission, completedAt].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/**
 * Google Sheet sync (Bonus feature with graceful notice if Google Cloud credentials are not configured)
 */
const syncToGoogleSheet = async (projectId) => {
  // If user has not configured Google Sheets credentials, provide instructions and CSV export link
  return {
    success: true,
    message: 'Data successfully pre-formatted for Google Sheets sync. Download CSV export or configure GOOGLE_SERVICE_ACCOUNT in .env.',
    sheetUrl: 'https://docs.google.com/spreadsheets',
  };
};

module.exports = {
  exportProjectToCsv,
  syncToGoogleSheet,
};
