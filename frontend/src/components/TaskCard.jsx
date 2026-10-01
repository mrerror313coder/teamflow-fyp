import React from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  Send,
  FileText,
  User as UserIcon,
} from 'lucide-react';

const TaskCard = ({
  task,
  onStatusChange,
  onDelete,
  onSubmitClick,
  isLeader = false,
  currentUserId,
}) => {
  const isAssignedToMe = task.assignedTo?._id === currentUserId || task.assignedTo === currentUserId;

  // Deadline formatting & overdue calculation
  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const now = new Date();
  const isOverdue = deadlineDate && deadlineDate < now && task.status !== 'completed';

  const getDaysLeft = () => {
    if (!deadlineDate) return '';
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today!';
    return `${diffDays}d left`;
  };

  const priorityStyles = {
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  const statusColors = {
    pending: 'text-slate-400 bg-slate-800 border-slate-700',
    in_progress: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blocked: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200 shadow-lg shadow-black/20">
      {/* Top Row: Phase Tag & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50 truncate max-w-[150px]">
          {task.phase || 'General'}
        </span>
        <span
          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
            priorityStyles[task.priority] || priorityStyles.medium
          }`}
        >
          {task.priority}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-200 transition-colors line-clamp-2 mb-1.5">
        {task.title}
      </h3>
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Assignee & Deadline */}
      <div className="space-y-2 pt-2 border-t border-slate-800/70 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
              {task.assignedTo?.name ? task.assignedTo.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="truncate text-slate-300 font-medium">
              {task.assignedTo?.name || 'Unassigned'}
            </span>
          </div>

          {/* Deadline Countdown */}
          {deadlineDate && (
            <div
              className={`flex items-center gap-1 font-medium ${
                isOverdue ? 'text-rose-400 animate-pulse' : 'text-slate-400'
              }`}
            >
              {isOverdue ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{getDaysLeft()}</span>
            </div>
          )}
        </div>

        {/* Status Dropdown & Action Controls */}
        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Status selector (Allowed if Leader OR Assigned to current user) */}
          {isLeader || isAssignedToMe ? (
            <select
              value={task.status}
              onChange={(e) => onStatusChange && onStatusChange(task._id, e.target.value)}
              className={`text-[11px] font-semibold rounded-lg px-2 py-1 border focus:outline-none cursor-pointer ${
                statusColors[task.status] || statusColors.pending
              }`}
            >
              <option value="pending" className="bg-slate-900 text-slate-300">Pending</option>
              <option value="in_progress" className="bg-slate-900 text-indigo-300">In Progress</option>
              <option value="completed" className="bg-slate-900 text-emerald-300">Completed</option>
              <option value="blocked" className="bg-slate-900 text-rose-300">Blocked</option>
            </select>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                statusColors[task.status] || statusColors.pending
              }`}
            >
              {task.status.replace('_', ' ')}
            </span>
          )}

          <div className="flex items-center gap-1">
            {/* Submission preview link if submitted */}
            {(task.submission?.docLink || task.submission?.fileUrl) && (
              <a
                href={task.submission.docLink || task.submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                title="View Submitted Work"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Member "Submit Work" button */}
            {isAssignedToMe && task.status !== 'completed' && (
              <button
                onClick={() => onSubmitClick && onSubmitClick(task)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
              >
                <Send className="w-3 h-3" />
                Submit
              </button>
            )}

            {/* Leader delete task */}
            {isLeader && onDelete && (
              <button
                onClick={() => onDelete(task._id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
