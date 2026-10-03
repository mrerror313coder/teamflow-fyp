const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getMembers,
  regenerateWhatsappPin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.get('/members', protect, getMembers);
router.post('/regenerate-pin', protect, regenerateWhatsappPin);

module.exports = router;
