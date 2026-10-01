import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import SubmitWorkModal from '../components/SubmitWorkModal';
import WhatsAppPinBanner from '../components/WhatsAppPinBanner';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  MapPin,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Calendar,
  Key,
  Plus,
} from 'lucide-react';

const MemberDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'in_progress' | 'completed'

  // Join project state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Submit modal
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState(null);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectRes] = await Promise.all([
        api.get('/task/my-tasks'),
        api.get('/project/current'),
      ]);

      setTasks(tasksRes.data.tasks || []);
      setProject(projectRes.data.project);
    } catch (err) {
      console.error('Failed to load member dashboard:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    try {
      setJoining(true);
      const res = await api.post('/project/join', { inviteCode: joinCodeInput.trim() });
      toast.success(res.data.message || 'Joined project workspace!');
      setJoinCodeInput('');
      setShowJoinModal(false);
      fetchMemberData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid invite code. Ask your leader for their code.');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    if (newStatus === 'completed') {
      const task = tasks.find((t) => t._id === taskId);
      if (task) {
        setSelectedTaskForSubmission(task);
        return;
      }
    }

    try {
      await api.put(`/task/${taskId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchMemberData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Upcoming nearest deadline
  const now = new Date();
  const pendingWithDeadlines = tasks
    .filter((t) => t.status !== 'completed' && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const nearestTask = pendingWithDeadlines[0];
  const nearestDays = nearestTask
    ? Math.ceil((new Date(nearestTask.deadline) - now) / (1000 * 60 * 60 * 24))
    : null;

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.status === activeFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">Loading Member Workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // If member has not joined any project yet
  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border border-slate-800 shadow-2xl animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Key className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1.5">Join Your FYP Project</h2>
            <p className="text-xs text-slate-400 mb-6">
              You are currently not enrolled in a project. Enter the Workspace Invite Code provided by your Project Leader.
            </p>
            <form onSubmit={handleJoinProject} className="space-y-3.5">
              <input
                type="text"
                required
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Enter Invite Code (e.g. TF-XXXXX)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase tracking-wider font-mono text-center font-bold"
              />
              <button
                type="submit"
                disabled={joining || !joinCodeInput.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {joining ? 'Joining Project...' : 'Join Workspace'}
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
        {/* Welcome Banner */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                👤 MEMBER WORKSPACE
              </span>
              <span className="text-xs text-slate-400">• {project?.name}</span>
              {project?.inviteCode && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Code: {project.inviteCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Review your tasks, update progress, or submit deliverables directly to your project leader.
            </p>
          </div>

          {/* Quick Bot reminder pill & Switch Project button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Join a different project workspace"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Switch Project
            </button>
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-200">WhatsApp Sync Active</p>
                <p className="text-[10px] text-slate-400">Reply "!mytasks" to bot anytime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secret WhatsApp Link PIN Banner */}
        <WhatsAppPinBanner />

        {/* 3 Stats Cards + Personal Progress Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">My Assigned Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{totalTasks}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{inProgressTasks} currently in progress</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Tasks Completed</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{completedTasks}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Submitted & approved</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Next Deadline</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {nearestDays !== null
                ? nearestDays < 0
                  ? 'Overdue'
                  : nearestDays === 0
                  ? 'Today'
                  : `${nearestDays}d left`
                : 'None'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
              {nearestTask ? nearestTask.title : 'All caught up!'}
            </p>
          </div>

          {/* Personal Progress Gauge */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-400">My Completion Rate</span>
                <span className="text-sm font-bold text-indigo-300">{percent}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 font-medium">
                {completedTasks} of {totalTasks} tasks done
              </p>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent >= 70 ? 'bg-emerald-400' : percent >= 40 ? 'bg-amber-400' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2">
              {percent === 100 ? '🎉 All tasks finished!' : 'Keep going!'}
            </span>
          </div>
        </div>

        {/* MY TASKS SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">My Deliverables Queue</h2>
              <p className="text-xs text-slate-400">Change task status or click submit to provide links & files</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Task Grid */}
          {filteredTasks.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl text-center border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No tasks in this category</h3>
              <p className="text-xs text-slate-400">
                {activeFilter === 'all'
                  ? 'Your project leader has not assigned any tasks yet.'
                  : `You have 0 tasks marked as ${activeFilter.replace('_', ' ')}.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((t) => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onStatusChange={handleStatusChange}
                  onSubmitClick={(taskToSubmit) => setSelectedTaskForSubmission(taskToSubmit)}
                  isLeader={false}
                  currentUserId={user?._id}
                />
              ))}
            </div>
          )}
        </div>

        {/* ROADMAP SECTION (Read Only View) */}
        {project?.roadmap && project.roadmap.length > 0 && (
          <div className="glass-card p-6 rounded-3xl border border-slate-800">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                Project Milestone Roadmap
              </h2>
              <p className="text-xs text-slate-400">See how your contributions align with project phases</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {project.roadmap.map((r, i) => {
                // Check if user has tasks in this phase
                const myPhaseTasks = tasks.filter((t) => t.phase === r.phase);
                const isCurrent = r.status === 'active';

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Phase {i + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          r.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : r.status === 'active'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {r.status?.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-100 mb-1">{r.phase}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                      {r.description || 'Milestone deliverables'}
                    </p>
                    <p className="text-[10px] text-indigo-300 font-semibold">
                      {myPhaseTasks.length} task(s) assigned to you
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WHATSAPP BOT CHEAT-SHEET */}
        <div className="glass-card p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">WhatsApp Bot Quick Commands</h3>
              <p className="text-xs text-slate-400">Send these commands to the TeamFlow bot directly from your phone!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <p className="font-bold text-emerald-400 mb-1">!mytasks</p>
              <p className="text-[11px] font-sans text-slate-400">View all your pending tasks and approaching deadlines.</p>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <p className="font-bold text-emerald-400 mb-1">!done &lt;task title&gt;</p>
              <p className="text-[11px] font-sans text-slate-400">Instantly marks a task as completed.</p>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <p className="font-bold text-emerald-400 mb-1">!submit &lt;task&gt; &lt;link&gt;</p>
              <p className="text-[11px] font-sans text-slate-400">Submit Google Doc or GitHub link via WhatsApp.</p>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <p className="font-bold text-emerald-400 mb-1">!progress</p>
              <p className="text-[11px] font-sans text-slate-400">Check overall group completion and standings.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Work Modal */}
      {selectedTaskForSubmission && (
        <SubmitWorkModal
          task={selectedTaskForSubmission}
          onClose={() => setSelectedTaskForSubmission(null)}
          onSubmitted={fetchMemberData}
        />
      )}

      {/* Switch / Join Project Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                Join Another FYP Workspace
              </h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter the unique Invite Code provided by the Project Leader of the group you wish to join:
            </p>
            <form onSubmit={handleJoinProject} className="space-y-3">
              <input
                type="text"
                required
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="e.g. TF-XXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase tracking-wider font-mono text-center font-bold"
              />
              <button
                type="submit"
                disabled={joining || !joinCodeInput.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                {joining ? 'Joining Workspace...' : 'Join Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
