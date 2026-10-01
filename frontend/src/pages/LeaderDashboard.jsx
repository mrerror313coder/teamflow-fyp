import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import AssignTaskModal from '../components/AssignTaskModal';
import RoadmapModal from '../components/RoadmapModal';
import AddMemberModal from '../components/AddMemberModal';
import WhatsAppPinBanner from '../components/WhatsAppPinBanner';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Plus,
  Sparkles,
  MapPin,
  Users,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Phone,
  Calendar,
  Trash2,
  UserMinus,
} from 'lucide-react';

const LeaderDashboard = () => {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [roadmapModalOpen, setRoadmapModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // AI Copilot state
  const [aiInsight, setAiInsight] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const projRes = await api.get('/project/current');
      if (projRes.data.project) {
        setProject(projRes.data.project);

        const [tasksRes, progressRes] = await Promise.all([
          api.get(`/task/project/${projRes.data.project._id}`),
          api.get(`/project/${projRes.data.project._id}/progress`),
        ]);

        setTasks(tasksRes.data.tasks || []);
        setProgressData(progressRes.data.progress);
      } else {
        setProject(null);
      }
    } catch (err) {
      console.error('Failed to load leader dashboard:', err);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!createProjectName.trim()) return;

    try {
      setCreatingProject(true);
      const res = await api.post('/project', { name: createProjectName });
      toast.success('Project workspace created!');
      setCreateProjectName('');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/task/${taskId}/status`, { status: newStatus });
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/task/${taskId}`);
      toast.success('Task removed');
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this project workspace?`)) {
      return;
    }

    try {
      const res = await api.delete(`/project/${project._id}/members/${memberId}`);
      toast.success(res.data.message || `${memberName} removed from project`);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleExportCsv = async () => {
    try {
      toast.loading('Generating CSV...', { id: 'csv' });
      const res = await api.get(`/project/${project._id}/export-csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project.name.replace(/\s+/g, '_')}_tasks.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV downloaded successfully!', { id: 'csv' });
    } catch (err) {
      toast.error('CSV export failed', { id: 'csv' });
    }
  };

  const handleSyncSheet = async () => {
    try {
      toast.loading('Syncing to Google Sheets...', { id: 'sheet' });
      const res = await api.post(`/project/${project._id}/sync-sheet`);
      toast.success(res.data.message || 'Sheets sync triggered!', { id: 'sheet' });
    } catch (err) {
      toast.error('Sheet sync failed', { id: 'sheet' });
    }
  };

  const handleFetchAiInsights = async () => {
    try {
      setAiLoading(true);
      const res = await api.get(`/ai/insight/${project._id}`);
      setAiInsight(res.data.insight);
      toast.success('AI Copilot insights generated!');
    } catch (err) {
      toast.error('Failed to generate insights: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFetchAiWeeklyReport = async () => {
    try {
      setAiLoading(true);
      const res = await api.get(`/ai/weekly-report/${project._id}`);
      setAiReport(res.data.report);
      toast.success('AI Weekly report ready!');
    } catch (err) {
      toast.error('Failed to generate weekly report: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Progress Bar color logic (<40% red, <70% yellow, >=70% green)
  const percent = progressData?.overallPercentage || 0;
  const progressBarColor =
    percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500';

  // Group tasks by Kanban column
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading Leader Workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no project exists yet, prompt to create
  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Create Your FYP Project</h2>
            <p className="text-xs text-slate-400 mb-6">
              You are signed in as Project Leader. Initialize your group project to begin assigning tasks and syncing with WhatsApp.
            </p>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input
                type="text"
                required
                value={createProjectName}
                onChange={(e) => setCreateProjectName(e.target.value)}
                placeholder="e.g. Smart Campus Navigation System"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={creatingProject}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                {creatingProject ? 'Initializing...' : 'Create Project Workspace'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Top Header Bar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                👑 LEADER CONSOLE
              </span>
              <span className="text-xs text-slate-400">• {project.members?.length || 0} Members</span>
              {project.inviteCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(project.inviteCode);
                    toast.success(`Invite Code "${project.inviteCode}" copied to clipboard!`);
                  }}
                  className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors flex items-center gap-1"
                  title="Click to copy Invite Code for students"
                >
                  <span>🔑 Invite Code: {project.inviteCode}</span>
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{project.description || 'University Final Year Project Workspace'}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAssignModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Assign Task
            </button>
            <button
              onClick={() => setRoadmapModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Edit Roadmap
            </button>
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Member
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
              title="Export all tasks as CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Link PIN & Anti-Spoofing Banner */}
        <WhatsAppPinBanner />

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Total Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{progressData?.totalTasks || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Across all phases</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Completed</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{progressData?.completedTasks || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{percent}% velocity completed</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">In Progress</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-300">{progressData?.inProgressTasks || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Currently active</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Overdue</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-400">{progressData?.overdueCount || 0}</p>
            <p className="text-[11px] text-rose-400/80 mt-1 font-medium">Requires supervisor focus</p>
          </div>
        </div>

        {/* PROGRESS SECTION: Overall & Per-Member */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Progress Gauge */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Overall Project Progress
                </h2>
                <span className="text-lg font-extrabold text-white">{percent}%</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {progressData?.completedTasks} of {progressData?.totalTasks} total tasks completed
              </p>

              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${progressBarColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Quick status message */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Completion:</span>
              <span className="font-semibold text-slate-200">
                {percent >= 70 ? '🟢 On Schedule' : percent >= 40 ? '🟡 Pacing Well' : '🔴 Action Required'}
              </span>
            </div>
          </div>

          {/* Per-Member Progress Cards */}
          <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Team Member Performance
              </h2>
              <button
                onClick={() => setAddMemberModalOpen(true)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                + Add Member
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {progressData?.memberProgress?.map((m) => (
                <div
                  key={m.memberId}
                  className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-200 truncate">{m.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">+{m.phone}</p>
                        </div>
                      </div>
                      {project?.leaderId?._id !== m.memberId && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.memberId, m.name)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title={`Remove ${m.name} from project`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-400">{m.completed}/{m.total} Tasks</span>
                      <span className="font-bold text-slate-200">{m.percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.percentage >= 70 ? 'bg-emerald-400' : m.percentage >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${m.percentage}%` }}
                      />
                    </div>
                  </div>

                  {m.overdue > 0 && (
                    <p className="text-[10px] font-semibold text-rose-400 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {m.overdue} task overdue
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROADMAP TIMELINE SECTION */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                Project Roadmap Timeline
              </h2>
              <p className="text-xs text-slate-400">Milestone progression and semester roadmap</p>
            </div>
            <button
              onClick={() => setRoadmapModalOpen(true)}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              Manage Phases
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {project.roadmap?.map((r, i) => {
              const statusBadge =
                r.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : r.status === 'active'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700';

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all ${
                    r.status === 'active'
                      ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/20'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Phase {i + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                      {r.status?.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-100 mb-1">{r.phase}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{r.description || 'Milestone deliverables'}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI PROJECT COPILOT CARD */}
        <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-slate-900 to-purple-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Gemini AI Project Copilot
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Free Tier
                  </span>
                </h2>
                <p className="text-xs text-slate-400">Real-time risk assessment, velocity forecasting & weekly reports</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchAiInsights}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? 'Analyzing...' : 'Generate Risk Insight'}
              </button>
              <button
                onClick={handleFetchAiWeeklyReport}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Weekly Report
              </button>
            </div>
          </div>

          {/* AI Response Display */}
          {(aiInsight || aiReport) && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-wrap animate-fade-in">
              {aiInsight && (
                <div>
                  <h4 className="font-bold text-indigo-300 mb-1">🤖 AI Strategic Assessment:</h4>
                  {aiInsight}
                </div>
              )}
              {aiReport && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <h4 className="font-bold text-purple-300 mb-1">📑 Weekly Progress Report:</h4>
                  {aiReport}
                </div>
              )}
            </div>
          )}
        </div>

        {/* KANBAN TASK BOARD */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Interactive Task Board</h2>
              <p className="text-xs text-slate-400">Track and manage task states across the entire team</p>
            </div>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Pending */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Pending
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {pendingTasks.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[150px] p-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                {pendingTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-8">No pending tasks</p>
                ) : (
                  pendingTasks.map((t) => (
                    <TaskCard
                      key={t._id}
                      task={t}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      isLeader={true}
                      currentUserId={user?._id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  In Progress
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[150px] p-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                {inProgressTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-8">No tasks in progress</p>
                ) : (
                  inProgressTasks.map((t) => (
                    <TaskCard
                      key={t._id}
                      task={t}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      isLeader={true}
                      currentUserId={user?._id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Completed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Completed
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {completedTasks.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[150px] p-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                {completedTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-8">No completed tasks yet</p>
                ) : (
                  completedTasks.map((t) => (
                    <TaskCard
                      key={t._id}
                      task={t}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      isLeader={true}
                      currentUserId={user?._id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Blocked */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Blocked
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  {blockedTasks.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[150px] p-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                {blockedTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-8">No blocked tasks</p>
                ) : (
                  blockedTasks.map((t) => (
                    <TaskCard
                      key={t._id}
                      task={t}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      isLeader={true}
                      currentUserId={user?._id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {assignModalOpen && (
        <AssignTaskModal
          project={project}
          members={project.members || []}
          onClose={() => setAssignModalOpen(false)}
          onTaskCreated={fetchDashboardData}
        />
      )}

      {roadmapModalOpen && (
        <RoadmapModal
          project={project}
          onClose={() => setRoadmapModalOpen(false)}
          onUpdated={fetchDashboardData}
        />
      )}

      {addMemberModalOpen && (
        <AddMemberModal
          project={project}
          onClose={() => setAddMemberModalOpen(false)}
          onMemberAdded={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default LeaderDashboard;
