import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  LogOut,
  MessageSquare,
  ShieldCheck,
  User as UserIcon,
  Layers,
} from 'lucide-react';
import WhatsAppBotModal from './WhatsAppBotModal';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [botModalOpen, setBotModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => navigate(user?.role === 'leader' ? '/leader-dashboard' : '/member-dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  TeamFlow
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  AI + WhatsApp
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">FYP Workspace</p>
            </div>
          </div>

          {/* Right Navigation & User Controls */}
          {user && (
            <div className="flex items-center gap-3">
              {/* WhatsApp Bot Connection & Terminal Button */}
              <button
                onClick={() => setBotModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200"
                title="Open WhatsApp Bot QR & Command Simulator"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp Bot</span>
              </button>

              {/* User Role Badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                {user.role === 'leader' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        user.role === 'leader' ? 'bg-amber-400' : 'bg-indigo-400'
                      }`}
                    />
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* WhatsApp Bot Modal */}
      {botModalOpen && <WhatsAppBotModal onClose={() => setBotModalOpen(false)} />}
    </>
  );
};

export default Navbar;
