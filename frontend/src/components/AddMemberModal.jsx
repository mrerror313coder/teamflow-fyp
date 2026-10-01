import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  X,
  UserPlus,
  Mail,
  Phone,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  User as UserIcon,
  MessageSquare,
  Trash2,
  Loader2,
} from 'lucide-react';

const AddMemberModal = ({ project, onClose, onMemberAdded }) => {
  const [inviteInput, setInviteInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteCode = project?.inviteCode || 'TF-READY';
  const joinLink = `${window.location.origin}/register?join=${inviteCode}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Project Invite Code copied!');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Shareable Registration Link copied!');
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `👋 Salam! Join our FYP Project "${project.name}" on TeamFlow.\n\n🔑 Project Invite Code: *${inviteCode}*\n🔗 Registration Link: ${joinLink}\n\nRegister now and start tracking deliverables and WhatsApp bot updates!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;

    try {
      setAdding(true);
      const isEmail = inviteInput.includes('@');
      const payload = isEmail
        ? { email: inviteInput.trim() }
        : { phone: inviteInput.trim() };

      const res = await api.post(`/project/${project._id}/add-member`, payload);
      toast.success(res.data.message || 'Member added to project!');
      setInviteInput('');
      if (onMemberAdded) onMemberAdded(res.data.project);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'User not found. Ask them to register using your Project Invite Code!'
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this project workspace?`)) {
      return;
    }

    try {
      setRemovingId(memberId);
      const res = await api.delete(`/project/${project._id}/members/${memberId}`);
      toast.success(res.data.message || `${memberName} removed from project`);
      if (onMemberAdded) onMemberAdded(res.data.project);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Members & Invites</h2>
              <p className="text-xs text-slate-400">{project?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Invite Code Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  Workspace Join Code
                </span>
                <p className="text-xs text-slate-300">
                  Share this code with your group members:
                </p>
              </div>
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 tracking-wider">
                {inviteCode}
              </span>
            </div>

            {/* Action buttons for invite */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(inviteCode, 'code')}
                className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Share WhatsApp</span>
              </button>
            </div>
          </div>

          {/* 2. Direct Add by Email or Phone */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Or Add Directly by Email / WhatsApp Phone:
            </label>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Student Email (e.g. ali@teamflow.com) or Phone..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={adding || !inviteInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>
            <p className="text-[11px] text-slate-500">
              If the student is not registered yet, send them your Invite Code above.
            </p>
          </div>

          {/* 3. Current Project Members (ONLY THIS PROJECT) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Active Project Members ({project?.members?.length || 0})
              </span>
              <span className="text-[11px] text-slate-500">Only your group</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {project?.members && project.members.length > 0 ? (
                project.members.map((m) => (
                  <div
                    key={m._id}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{m.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {m.email} {m.phone ? `• +${m.phone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                        {m.role || 'Member'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id, m.name)}
                        disabled={removingId === m._id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={`Remove ${m.name} from project`}
                      >
                        {removingId === m._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No members added to this project yet. Share your Invite Code!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
