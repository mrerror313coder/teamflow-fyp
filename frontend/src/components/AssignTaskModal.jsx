import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { X, Plus, Sparkles, Calendar, User, Flag, Layers } from 'lucide-react';

const AssignTaskModal = ({ project, members, onClose, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(members[0]?._id || '');
  const [phase, setPhase] = useState(project?.roadmap?.[0]?.phase || 'General');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  // AI Breakdown assistant
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const handleAiBreakdown = async () => {
    if (!aiTopic.trim()) {
      toast.error('Enter a feature or topic for AI breakdown');
      return;
    }

    try {
      setAiLoading(true);
      const res = await api.post('/ai/breakdown', { topic: aiTopic, phase });
      setAiSuggestions(res.data.tasks || []);
      toast.success('AI suggested task breakdown!');
    } catch (err) {
      toast.error('Failed to get AI suggestions: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (sug) => {
    setTitle(sug.title);
    setDescription(sug.description || '');
    if (sug.priority) setPriority(sug.priority);
    if (sug.durationDays) {
      const d = new Date();
      d.setDate(d.getDate() + sug.durationDays);
      setDeadline(d.toISOString().split('T')[0]);
    }
    toast.success('Applied suggestion to task form!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo || !deadline) {
      toast.error('Please complete title, assignee, and deadline.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/task', {
        title,
        description,
        assignedTo,
        projectId: project._id,
        phase,
        deadline,
        priority,
      });

      toast.success('Task assigned successfully & member notified via WhatsApp!');
      if (onTaskCreated) onTaskCreated(res.data.task);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Assign New Task</h2>
              <p className="text-xs text-slate-400">Project: {project?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* AI Copilot Breakdown Bar */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-200">AI Task Breakdown Assistant</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Authentication & JWT Setup, Database Schema..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAiBreakdown}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                {aiLoading ? 'Thinking...' : 'Generate'}
              </button>
            </div>

            {/* Suggestions list */}
            {aiSuggestions.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <p className="text-[11px] text-slate-400 font-medium">Click to populate form:</p>
                {aiSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-slate-900/80 hover:bg-indigo-600/20 text-xs text-slate-200 border border-slate-800 hover:border-indigo-500/40 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium truncate">{s.title}</span>
                    <span className="text-[10px] text-indigo-300 shrink-0 uppercase">{s.priority}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Write Literature Review Chapter"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description / Acceptance Criteria
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail expectations, references, and delivery formats..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Member select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Assign To *
                </label>
                <select
                  required
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Select Team Member</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Roadmap Phase
                </label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {project?.roadmap && project.roadmap.length > 0 ? (
                    project.roadmap.map((r, i) => (
                      <option key={i} value={r.phase}>
                        Phase {i + 1}: {r.phase}
                      </option>
                    ))
                  ) : (
                    <option value="General">General</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority (Urgent)</option>
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {loading ? 'Assigning...' : 'Assign Task & Notify WhatsApp'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
