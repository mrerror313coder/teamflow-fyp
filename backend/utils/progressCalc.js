const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

const calculateProjectProgress = async (projectId) => {
  const project = await Project.findById(projectId).populate('members', 'name email phone');
  if (!project) {
    throw new Error('Project not found');
  }

  const tasks = await Task.find({ projectId }).populate('assignedTo', 'name email phone');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;

  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now
  );

  const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate per-member stats
  const memberMap = new Map();
  // Initialize for all assigned project members
  project.members.forEach((m) => {
    memberMap.set(m._id.toString(), {
      memberId: m._id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      percentage: 0,
    });
  });

  tasks.forEach((t) => {
    if (t.assignedTo) {
      const id = t.assignedTo._id.toString();
      if (!memberMap.has(id)) {
        memberMap.set(id, {
          memberId: t.assignedTo._id,
          name: t.assignedTo.name,
          email: t.assignedTo.email,
          phone: t.assignedTo.phone,
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          overdue: 0,
          percentage: 0,
        });
      }
      const mStats = memberMap.get(id);
      mStats.total += 1;
      if (t.status === 'completed') mStats.completed += 1;
      if (t.status === 'in_progress') mStats.inProgress += 1;
      if (t.status === 'pending') mStats.pending += 1;
      if (t.status !== 'completed' && t.deadline && new Date(t.deadline) < now) {
        mStats.overdue += 1;
      }
    }
  });

  const memberProgress = Array.from(memberMap.values()).map((m) => ({
    ...m,
    percentage: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
  }));

  // Calculate phase-wise progress
  const phases = project.roadmap && project.roadmap.length > 0
    ? project.roadmap.map((r) => r.phase)
    : [...new Set(tasks.map((t) => t.phase || 'General'))];

  const phaseProgress = phases.map((phaseName) => {
    const phaseTasks = tasks.filter((t) => t.phase === phaseName);
    const pTotal = phaseTasks.length;
    const pDone = phaseTasks.filter((t) => t.status === 'completed').length;
    return {
      phase: phaseName,
      total: pTotal,
      completed: pDone,
      percentage: pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0,
    };
  });

  return {
    projectId: project._id,
    projectName: project.name,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    blockedTasks,
    overdueCount: overdueTasks.length,
    overdueTasks: overdueTasks.map((t) => ({
      id: t._id,
      title: t.title,
      assignedTo: t.assignedTo?.name || 'Unassigned',
      deadline: t.deadline,
    })),
    overallPercentage,
    memberProgress,
    phaseProgress,
  };
};

module.exports = { calculateProjectProgress };
