import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, MapPin, CheckCircle, Clock } from 'lucide-react';

const RoadmapModal = ({ project, onClose, onUpdated }) => {
  const [phases, setPhases] = useState(
    project?.roadmap && project.roadmap.length > 0
      ? project.roadmap
      : [
          { phase: 'Research', description: '', status: 'active', startDate: '', endDate: '' },
          { phase: 'Design', description: '', status: 'pending', startDate: '', endDate: '' },
          { phase: 'Development', description: '', status: 'pending', startDate: '', endDate: '' },
          { phase: 'Testing', description: '', status: 'pending', startDate: '', endDate: '' },
        ]
  );
  const [loading, setLoading] = useState(false);

  const handlePhaseChange = (index, field, value) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    setPhases(updated);
  };

  const addPhase = () => {
    setPhases([
      ...phases,
      {
        phase: `Phase ${phases.length + 1}`,
        description: '',
        status: 'pending',
        startDate: '',
        endDate: '',
      },
    ]);
  };

  const removePhase = (index) => {
    if (phases.length <= 1) {
      toast.error('Project must have at least one phase');
      return;
    }
    const updated = phases.filter((_, i) => i !== index);
    setPhases(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put(`/project/${project._id}/roadmap`, { roadmap: phases });
      toast.success('Project Roadmap updated successfully!');
      if (onUpdated) onUpdated(res.data.roadmap);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Roadmap & Phases</h2>
              <p className="text-xs text-slate-400">Manage project milestones and deliverables timeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phase List Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {phases.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-400">
                  Phase {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={p.status || 'pending'}
                    onChange={(e) => handlePhaseChange(idx, 'status', e.target.value)}
                    className="text-[11px] font-semibold rounded-lg px-2 py-1 bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none"
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="active">🔄 Active</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removePhase(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove Phase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Phase Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={p.phase}
                    onChange={(e) => handlePhaseChange(idx, 'phase', e.target.value)}
                    placeholder="e.g. Research, UI Design, Core Backend"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Short Description / Scope
                  </label>
                  <input
                    type="text"
                    value={p.description || ''}
                    onChange={(e) => handlePhaseChange(idx, 'description', e.target.value)}
                    placeholder="Deliverables included..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPhase}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Another Phase
          </button>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
            >
              {loading ? 'Saving Roadmap...' : 'Save & Publish Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoadmapModal;
