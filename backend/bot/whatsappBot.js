const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let currentQR = null;
let currentQRImage = null;
let currentQRBuffer = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
let reconnectTimer = null;

const AUTH_FOLDER = path.join(__dirname, '../whatsapp-auth');

const getBotStatus = () => ({
  status: connectionStatus,
  hasQR: !!currentQR,
  qrDataUrl: currentQRImage,
  qrRaw: currentQR,
});

const getQrBuffer = () => currentQRBuffer;

const isConnected = () => connectionStatus === 'connected' && !!sock;

const sendWhatsAppMessage = async (phoneNumber, text) => {
  if (!sock || connectionStatus !== 'connected') {
    console.log(`[WhatsApp Mock Dispatch] To: ${phoneNumber} | Message: ${text.slice(0, 80)}...`);
    return false;
  }

  try {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error.message);
    return false;
  }
};

/**
 * Request an 8-character Pairing Code for seamless phone linking (No QR scanning needed!)
 */
const requestPairingCode = async (phoneNumber) => {
  if (!phoneNumber) throw new Error('Phone number is required');
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  if (connectionStatus === 'connected') {
    throw new Error('WhatsApp Bot is already connected!');
  }

  // Ensure socket is active and ready
  if (!sock || connectionStatus === 'disconnected') {
    await startBot(true);
    // Brief handshake wait
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!sock) {
    throw new Error('Could not initialize WhatsApp socket. Please try again.');
  }

  try {
    const code = await sock.requestPairingCode(cleanPhone);
    console.log(`🔑 Generated WhatsApp Pairing Code for +${cleanPhone}: ${code}`);
    return code;
  } catch (err) {
    console.error('Pairing code request error:', err.message);
    throw err;
  }
};

const startBot = async (forceRestart = false) => {
  if (process.env.WHATSAPP_BOT_ENABLED === 'false') {
    console.log('ℹ️ WhatsApp Bot disabled via WHATSAPP_BOT_ENABLED=false');
    return null;
  }

  // Clear pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Cleanly close existing socket instance
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch (e) {}
    sock = null;
  }

  // If force restart and not connected, clear stale auth lock files
  if (forceRestart && connectionStatus !== 'connected') {
    try {
      if (fs.existsSync(AUTH_FOLDER)) {
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        console.log('🧹 Cleaned stale WhatsApp session folder for fresh pairing.');
      }
    } catch (e) {
      console.warn('Could not clean auth folder:', e.message);
    }
  }

  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🚀 Starting WhatsApp Bot with Baileys v${version.join('.')}`);

    connectionStatus = 'connecting';

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }), // Keep server logs clean
      printQRInTerminal: false,
      auth: state,
      browser: ['TeamFlow FYP', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        connectionStatus = 'qr_ready';
        console.log('📱 WhatsApp QR Code generated & ready for scanning in dashboard!');

        try {
          currentQRImage = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          currentQRBuffer = await QRCode.toBuffer(qr, { width: 400, margin: 2 });
        } catch (e) {
          console.error('Error creating QR image:', e);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        currentQR = null;
        currentQRImage = null;
        currentQRBuffer = null;
        console.log(`⚠️ WhatsApp connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          reconnectTimer = setTimeout(() => startBot(false), 5000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        currentQR = null;
        currentQRImage = null;
        currentQRBuffer = null;
        console.log('✅ WhatsApp Bot Connected & Listening for Commands!');

        // Greet connected user
        try {
          const rawId = sock.user?.id || '';
          const connectedPhone = rawId.split(':')[0]?.replace(/\D/g, '');
          if (connectedPhone) {
            const selfJid = `${connectedPhone}@s.whatsapp.net`;
            await sock.sendMessage(selfJid, {
              text: `🤖 *TEAMFLOW BOT IS CONNECTED & READY!*
━━━━━━━━━━━━━━━━━━
Welcome! Your TeamFlow WhatsApp Bot is now active and listening for commands.

You can test commands directly in this chat:
• *!progress* — Overall project progress report
• *!mytasks* — Your personal pending tasks & deadlines
• *!ai <question>* — Ask the AI Project Copilot
• *!roadmap* — Project milestones & phases
• *!overdue* — List of late deliverables
• *!help* — View all available commands

👥 *Group Chats:* Add me to your FYP WhatsApp Group and send *!linkgroup* to link your workspace! 🚀`,
            });
            console.log(`📢 Sent welcome message to linked account: +${connectedPhone}`);

            const User = require('../models/User');
            await User.findOneAndUpdate({ role: 'leader' }, { phone: connectedPhone });
          }
        } catch (greetErr) {
          console.error('Error sending WhatsApp welcome message:', greetErr.message);
        }
      }
    });

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      try {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid === 'status@broadcast') continue;

          // Extract text from message
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '';

          if (!text || !text.trim().startsWith('!')) continue;

          const isGroup = remoteJid.endsWith('@g.us');
          let senderJid = isGroup
            ? (msg.key.participant || msg.participant || '')
            : remoteJid;

          let pnJid = isGroup ? msg.key?.participantAlt : msg.key?.remoteJidAlt;
          if (!pnJid && (senderJid.endsWith('@lid') || senderJid.length >= 18)) {
            try {
              pnJid = await sock?.signalRepository?.lidMapping?.getPNForLID?.(senderJid);
            } catch (e) {}
          }

          const rawUser = (pnJid || senderJid || '').split('@')[0].split(':')[0];
          const senderPhone = rawUser.replace(/\D/g, '');

          const senderLid = senderJid.includes('@lid') || (!pnJid && senderPhone.length >= 14)
            ? senderJid.split('@')[0].split(':')[0]
            : null;

          console.log(`📩 [WhatsApp ${isGroup ? 'Group' : 'Direct'} from +${senderPhone}${senderLid ? ` (LID: ${senderLid})` : ''}]: ${text}`);

          const { handleIncomingMessage } = require('./commandParser');
          const options = {
            isGroup,
            remoteJid,
            senderJid,
            senderLid,
            pnJid,
            isFromMe: !!msg.key?.fromMe,
            pushName: msg.pushName || '',
          };
          const reply = await handleIncomingMessage(senderPhone, text.trim(), options);

          if (reply) {
            await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });
          }
        }
      } catch (err) {
        console.error('Error handling WhatsApp message upsert:', err);
      }
    });

    return sock;
  } catch (error) {
    console.error('⚠️ Failed to start WhatsApp Bot:', error.message);
    connectionStatus = 'disconnected';
    return null;
  }
};

const getWhatsAppSocket = () => sock;

module.exports = {
  startBot,
  sendWhatsAppMessage,
  getBotStatus,
  getQrBuffer,
  requestPairingCode,
  isConnected,
  getWhatsAppSocket,
};
