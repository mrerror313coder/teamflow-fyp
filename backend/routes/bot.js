const express = require('express');
const router = express.Router();
const {
  getBotStatus,
  getQrBuffer,
  startBot,
  sendWhatsAppMessage,
  requestPairingCode,
} = require('../bot/whatsappBot');
const { handleIncomingMessage } = require('../bot/commandParser');
const { protect } = require('../middleware/auth');
const { leaderOnly } = require('../middleware/roleCheck');

// @route   GET /api/bot/status
// @desc    Get WhatsApp connection status & QR code
router.get('/status', protect, (req, res) => {
  const status = getBotStatus();
  return res.status(200).json({ success: true, ...status });
});

// @route   GET /api/bot/qr.png
// @desc    Direct raw PNG image stream of WhatsApp QR Code (easy to open in new tab)
router.get('/qr.png', (req, res) => {
  const buffer = getQrBuffer();
  if (!buffer) {
    return res.status(404).send('QR code not currently ready or bot is already connected. Please check dashboard.');
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(buffer);
});

// @route   POST /api/bot/pairing-code
// @desc    Request 8-character pairing code for phone number (No camera / QR scanning required!)
router.post('/pairing-code', protect, leaderOnly, async (req, res) => {
  try {
    const phone = req.body.phone || req.user.phone;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required for pairing code' });
    }

    const code = await requestPairingCode(phone);
    return res.status(200).json({
      success: true,
      pairingCode: code,
      phone,
      instructions: 'Open WhatsApp on your phone -> Linked Devices -> Link a Device -> tap "Link with phone number instead" -> enter this code.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/bot/restart
// @desc    Restart WhatsApp Bot socket with fresh session
router.post('/restart', protect, leaderOnly, async (req, res) => {
  try {
    await startBot(true);
    return res.status(200).json({ success: true, message: 'WhatsApp bot restarting with fresh handshake...' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/bot/simulate
// @desc    Simulate WhatsApp bot command from web dashboard (for instant demo/testing)
router.post('/simulate', protect, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, message: 'Command is required' });
    }

    const senderPhone = req.user.phone || '923001234567';
    const reply = await handleIncomingMessage(senderPhone, command);

    return res.status(200).json({
      success: true,
      command,
      senderPhone,
      reply: reply || 'Command processed with no output.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/bot/send-test
// @desc    Send test message to specified phone number
router.post('/send-test', protect, leaderOnly, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone and message are required' });
    }

    const sent = await sendWhatsAppMessage(phone, message);
    return res.status(200).json({
      success: sent,
      message: sent ? 'Message dispatched successfully!' : 'WhatsApp bot is currently offline or disconnected.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
