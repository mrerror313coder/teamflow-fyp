const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let sock = null;
let currentQR = null;
let currentQRImage = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

const AUTH_FOLDER = path.join(__dirname, '../whatsapp-auth');

const getBotStatus = () => ({
  status: connectionStatus,
  hasQR: !!currentQR,
  qrDataUrl: currentQRImage,
  qrRaw: currentQR,
});

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

const startBot = async () => {
  if (process.env.WHATSAPP_BOT_ENABLED === 'false') {
    console.log('ℹ️ WhatsApp Bot disabled via WHATSAPP_BOT_ENABLED=false');
    return;
  }

  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(` Starting WhatsApp Bot with Baileys v${version.join('.')}`);

    connectionStatus = 'connecting';

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }), // Keep terminal clean
      printQRInTerminal: false,
      auth: state,
      browser: ['TeamFlow FYP', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        connectionStatus = 'qr_ready';
        console.log('\n=========================================');
        console.log('📱 SCAN THIS WHATSAPP QR CODE TO CONNECT:');
        console.log('=========================================');
        qrcodeTerminal.generate(qr, { small: true });

        try {
          currentQRImage = await QRCode.toDataURL(qr);
        } catch (e) {
          currentQRImage = null;
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionStatus = 'disconnected';
        currentQR = null;
        currentQRImage = null;
        console.log(`⚠️ WhatsApp connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(() => startBot(), 5000);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        currentQR = null;
        currentQRImage = null;
        console.log(' WhatsApp Bot Connected & Listening for Commands!');

        // Send a welcome message directly to the linked account's chat ("Message yourself")
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
• *!insight* — Gemini AI risk assessment & suggestions
• *!roadmap* — Project milestones & phases
• *!overdue* — List of late deliverables
• *!help* — View all available commands

👥 *Group Chats:* You can also add me to your FYP WhatsApp Group and send *!linkgroup* to link your workspace! 🚀`,
            });
            console.log(` Sent welcome message to linked account: +${connectedPhone}`);

            // Automatically sync the Leader's phone number in MongoDB
            const User = require('../models/User');
            await User.findOneAndUpdate({ role: 'leader' }, { phone: connectedPhone });
            console.log(` Synced Leader profile phone to +${connectedPhone}`);
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

          // Strictly only respond to commands starting with "!"
          if (!text || !text.trim().startsWith('!')) continue;

          const isGroup = remoteJid.endsWith('@g.us');
          let senderJid = isGroup
            ? (msg.key.participant || msg.participant || '')
            : remoteJid;

          // Check if WhatsApp sent a Phone Number Alt JID for this sender (LID resolution)
          let pnJid = isGroup ? msg.key?.participantAlt : msg.key?.remoteJidAlt;
          if (!pnJid && (senderJid.endsWith('@lid') || senderJid.length >= 18)) {
            try {
              pnJid = await sock?.signalRepository?.lidMapping?.getPNForLID?.(senderJid);
            } catch (e) {}
          }

          // Strip device suffix (:1, :15, etc.) and domain
          const rawUser = (pnJid || senderJid || '').split('@')[0].split(':')[0];
          const senderPhone = rawUser.replace(/\D/g, '');

          // Check if sender is using an internal WhatsApp LID
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
            // Reply directly to the chat, quoting the trigger message
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
  isConnected,
  getWhatsAppSocket,
};
