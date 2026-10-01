import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  X,
  QrCode,
  Terminal,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
} from 'lucide-react';

const WhatsAppBotModal = ({ onClose }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'qr' | 'testmsg'
  
  // Simulator state
  const [commandInput, setCommandInput] = useState('!progress');
  const [simHistory, setSimHistory] = useState([
    {
      sender: 'bot',
      text: '🤖 *TeamFlow WhatsApp Bot is ready!*\nType any command (e.g., !progress, !mytasks, !help, !insight, !ai assign ...) below to test.',
    },
  ]);
  const [simLoading, setSimLoading] = useState(false);

  // Test Message state
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('Hello from TeamFlow FYP Bot! 🚀');
  const [sendingTest, setSendingTest] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bot/status');
      setStatusData(res.data);
    } catch (err) {
      console.error('Error fetching bot status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartBot = async () => {
    try {
      toast.loading('Restarting WhatsApp Bot...', { id: 'restart' });
      await api.post('/bot/restart');
      toast.success('Restart initiated. Please wait a few seconds.', { id: 'restart' });
      fetchStatus();
    } catch (err) {
      toast.error('Failed to restart bot: ' + err.message, { id: 'restart' });
    }
  };

  const handleSimulateCommand = async (e) => {
    e?.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    setSimHistory((prev) => [...prev, { sender: 'user', text: cmd }]);
    setCommandInput('');
    setSimLoading(true);

    try {
      const res = await api.post('/bot/simulate', { command: cmd });
      setSimHistory((prev) => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (err) {
      setSimHistory((prev) => [
        ...prev,
        { sender: 'bot', text: '❌ Execution Error: ' + (err.response?.data?.message || err.message) },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone) {
      toast.error('Please enter a phone number with country code');
      return;
    }

    try {
      setSendingTest(true);
      const res = await api.post('/bot/send-test', { phone: testPhone, message: testMsg });
      if (res.data.success) {
        toast.success('WhatsApp message dispatched!');
      } else {
        toast.error(res.data.message || 'WhatsApp Bot is offline');
      }
    } catch (err) {
      toast.error('Failed to send: ' + (err.response?.data?.message || err.message));
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = statusData?.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                WhatsApp Bot Center
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : statusData?.status === 'qr_ready'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {statusData?.status ? statusData.status.toUpperCase() : 'CHECKING...'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Baileys Multi-Device & Simulated Bot Controller</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestartBot}
              title="Restart Bot Engine"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'simulator'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Interactive Bot Simulator
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'qr'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Pairing QR Code
          </button>
          <button
            onClick={() => setActiveTab('testmsg')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'testmsg'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Direct Test Message
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* TAB 1: INTERACTIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="flex flex-col h-[400px]">
              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['!progress', '!mytasks', '!insight', '!report', '!overdue', '!roadmap', '!help'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setCommandInput(cmd);
                    }}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 border border-slate-700 transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              {/* Chat View */}
              <div className="flex-1 bg-slate-950 rounded-xl p-3.5 overflow-y-auto space-y-3 font-mono text-xs border border-slate-800">
                {simHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${
                        item.sender === 'user'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
                {simLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-400 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      Bot processing command...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSimulateCommand} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type a bot command (e.g. !progress, !ai assign Ali UI design friday)..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={simLoading || !commandInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {isConnected ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 max-w-md">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">WhatsApp Bot Connected!</h3>
                  <p className="text-xs text-slate-300">
                    Your WhatsApp account is active and connected via Baileys Multi-Device. All incoming student commands will be automatically answered.
                  </p>
                </div>
              ) : statusData?.qrDataUrl ? (
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-300 mb-4">
                    <img
                      src={statusData.qrDataUrl}
                      alt="WhatsApp QR Code"
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Scan this QR Code with WhatsApp</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Open WhatsApp on your phone &rarr; Linked Devices &rarr; Link a Device &rarr; Point your camera at this screen.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 max-w-md">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-spin" />
                  <h3 className="text-sm font-bold text-white mb-1">Generating QR Code...</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Waiting for Baileys WhatsApp authentication handshake. Please click Refresh or Restart if it takes more than 10 seconds.
                  </p>
                  <button
                    onClick={handleRestartBot}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Restart WhatsApp Bot
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT TEST MESSAGE */}
          {activeTab === 'testmsg' && (
            <form onSubmit={handleSendTestMessage} className="space-y-4 max-w-md mx-auto py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recipient WhatsApp Number (with country code):
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 923001234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Message Content:
                </label>
                <textarea
                  rows={4}
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || !testPhone}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingTest ? 'Sending...' : 'Dispatch WhatsApp Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBotModal;
