import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

const WhatsAppPinBanner = () => {
  const { user, setUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const pin = user?.whatsappPin || '------';
  const verifyCommand = `!verify ${pin}`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(verifyCommand);
    setCopied(true);
    toast.success(`Copied "${verifyCommand}" to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(verifyCommand);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleRegeneratePin = async () => {
    try {
      setRegenerating(true);
      const res = await api.post('/auth/regenerate-pin');
      if (res.data.success) {
        setUser((prev) => ({ ...prev, whatsappPin: res.data.whatsappPin }));
        toast.success('New WhatsApp Link PIN generated!');
      }
    } catch (err) {
      toast.error('Failed to regenerate PIN: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-indigo-950/20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left side: Icon & Title */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                Secret WhatsApp Link PIN
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Anti-Spoofing Protected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl">
              To securely connect your WhatsApp device to your profile, send this private 6-digit PIN to the bot.
              Other members cannot access or hijack your account without your secret PIN.
            </p>
          </div>
        </div>

        {/* Right side: PIN Display & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* PIN Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Your PIN:</span>
            <span className="text-sm font-extrabold text-emerald-400 tracking-widest">{pin}</span>
          </div>

          {/* Copy Command Button */}
          <button
            onClick={handleCopyCommand}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            title="Copy '!verify <code>' to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy Command</span>
              </>
            )}
          </button>

          {/* Send in WhatsApp Button */}
          <button
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-colors"
            title="Open WhatsApp with '!verify <code>'"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Link in WhatsApp</span>
          </button>

          {/* Regenerate PIN Button */}
          <button
            onClick={handleRegeneratePin}
            disabled={regenerating}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Regenerate new PIN"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPinBanner;
