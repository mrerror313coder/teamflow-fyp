import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Layers,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Phone,
  ShieldAlert,
  Info,
} from 'lucide-react';
import api from '../utils/api';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset Password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);

  // Pre-fill identifier from query params if clicked from WhatsApp bot
  useEffect(() => {
    const param = searchParams.get('identifier') || searchParams.get('email') || '';
    if (param) {
      setIdentifier(param);
    }
  }, [searchParams]);

  // Step 1: Request 6-digit OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your email or WhatsApp number');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      setResetInfo(res.data);
      toast.success(res.data.message || 'Verification code sent!');
      setStep(2);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to send reset code'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP & Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });

      toast.success(res.data.message || 'Password reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Failed to reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Decorative gradient glow blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center shadow-lg shadow-indigo-500/25 mb-3">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            TeamFlow <span className="text-indigo-400">Security</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Account recovery & password reset portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800/80">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {step === 1 ? 'Forgot Password' : 'Set New Password'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {step === 1
                  ? 'We will send a 6-digit verification code to your WhatsApp'
                  : 'Enter the code and choose a secure new password'}
              </p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center gap-2 my-5">
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'
              }`}
            />
          </div>

          {/* STEP 1: Enter Identifier */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  Email Address or WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. user@teamflow.com or 923059108301"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-start gap-1.5 text-indigo-300 font-medium">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>How it works:</span>
                </div>
                <p>
                  TeamFlow will instantly generate a secure 6-digit code and deliver it to your registered WhatsApp phone number via the bot.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Verify Code & Reset */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Notice Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Code Sent to WhatsApp</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  A 6-digit verification code was generated for{' '}
                  <span className="font-semibold text-white">
                    {resetInfo?.maskedPhone ? `+${resetInfo.maskedPhone}` : identifier}
                  </span>
                  .
                </p>
                {resetInfo?.fallbackOtp && (
                  <p className="text-[11px] text-amber-300 pt-1 font-mono">
                    ℹ️ Offline Bot Fallback Code: <strong>{resetInfo.fallbackOtp}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    6-Digit Verification Code
                  </span>
                  <span className="text-[10px] text-slate-500">Or use WhatsApp PIN</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 582910"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Change Email / Phone
                </button>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
