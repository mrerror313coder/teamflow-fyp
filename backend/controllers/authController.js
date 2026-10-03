const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { standardizePhone, maskPhone } = require('../utils/phoneHelper');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'teamflow_super_secret_jwt_key_2026_fyp_98765', {
    expiresIn: '7d',
  });
};

// @desc    Register a new user (Leader or Member)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, phone.',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // Standardize phone (converts 0305... or +92... to 92305...)
    const cleanedPhone = standardizePhone(phone);

    const Project = require('../models/Project');
    let matchedProject = null;
    if (req.body.inviteCode && req.body.inviteCode.trim()) {
      const code = req.body.inviteCode.trim().toUpperCase();
      matchedProject = await Project.findOne({ inviteCode: code });
      if (!matchedProject) {
        return res.status(400).json({
          success: false,
          message: `Project Invite Code "${code}" was not found. Please verify the code with your Project Leader or clear the field to register without a group.`,
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: cleanedPhone,
      role: role === 'leader' ? 'leader' : 'member',
      projectId: matchedProject ? matchedProject._id : null,
    });

    if (matchedProject) {
      if (!matchedProject.members.some(m => m.toString() === user._id.toString())) {
        matchedProject.members.push(user._id);
        await matchedProject.save();
      }
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        projectId: user.projectId,
        whatsappPin: user.whatsappPin,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Auto-migrate phone to international format if needed
    const stdPhone = standardizePhone(user.phone);
    if (stdPhone && stdPhone !== user.phone) {
      user.phone = stdPhone;
      await user.save();
    }

    // Ensure user has a whatsappPin
    if (!user.whatsappPin) {
      user.whatsappPin = Math.floor(100000 + Math.random() * 900000).toString();
      await user.save();
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        projectId: user.projectId,
        whatsappPin: user.whatsappPin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('-password');
    if (user && !user.whatsappPin) {
      user.whatsappPin = Math.floor(100000 + Math.random() * 900000).toString();
      await user.save();
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
    });
  }
};

// @desc    Regenerate Secret WhatsApp Link PIN
// @route   POST /api/auth/regenerate-pin
// @access  Private
exports.regenerateWhatsappPin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.whatsappPin = Math.floor(100000 + Math.random() * 900000).toString();
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'New WhatsApp Link PIN generated!',
      whatsappPin: user.whatsappPin,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get list of all users or members
// @route   GET /api/auth/members
// @access  Private
exports.getMembers = async (req, res) => {
  try {
    const members = await User.find().select('name email phone role projectId');
    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve members',
    });
  }
};

// @desc    Request password reset OTP (sent via WhatsApp bot)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered Email or WhatsApp phone number.',
      });
    }

    const trimmed = identifier.trim();
    let user = null;

    if (trimmed.includes('@')) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).select('+password +resetPasswordOtp +resetPasswordOtpExpire');
    } else {
      const rawDigits = trimmed.replace(/\D/g, '');
      const stdPhone = standardizePhone(rawDigits);
      const searchSuffix = rawDigits.slice(-9);
      user = await User.findOne({
        $or: [
          { phone: stdPhone },
          { phone: rawDigits },
          { phone: rawDigits.startsWith('0') ? '92' + rawDigits.slice(1) : rawDigits },
          { phone: { $regex: searchSuffix + '$' } },
        ],
      }).select('+password +resetPasswordOtp +resetPasswordOtpExpire');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email or WhatsApp phone number.',
      });
    }

    // Auto-normalize user's phone in database if it was saved as 03... or missing country code
    const stdPhone = standardizePhone(user.phone);
    if (stdPhone && stdPhone !== user.phone) {
      user.phone = stdPhone;
      await user.save();
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Mask phone number for privacy display: e.g. 92305••••888
    const maskedPhone = maskPhone(user.phone);

    // Send via WhatsApp bot if connected
    let whatsappSent = false;
    try {
      const { isConnected, sendWhatsAppMessage } = require('../bot/whatsappBot');
      if (isConnected && isConnected()) {
        const resetUrl = `${process.env.APP_URL || 'https://teamflow-fyp.onrender.com'}/forgot-password?identifier=${encodeURIComponent(user.email)}`;
        const message = `🔐 *TEAMFLOW PASSWORD RESET*
━━━━━━━━━━━━━━━━━━
Hello *${user.name}*!

A request was received to reset your password for TeamFlow.

Your 6-digit Verification Code is:
👉 *${otp}* 👈

⏱️ Valid for 15 minutes.
🌐 Reset page: ${resetUrl}

_If you did not request this, please disregard this message._`;

        await sendWhatsAppMessage(user.phone, message);
        whatsappSent = true;
      }
    } catch (botErr) {
      console.warn('Could not send OTP via WhatsApp bot:', botErr.message);
    }

    return res.status(200).json({
      success: true,
      message: whatsappSent
        ? `A 6-digit reset code has been sent to your WhatsApp (${maskedPhone}).`
        : `Reset code generated! (Note: WhatsApp Bot is currently offline — use your account's 6-digit WhatsApp PIN).`,
      maskedPhone,
      email: user.email,
      whatsappSent,
      // Provide fallback code in response if bot is offline so users are never locked out
      fallbackOtp: !whatsappSent ? otp : undefined,
    });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error processing password reset request',
    });
  }
};

// @desc    Reset password using OTP or WhatsApp PIN
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide identifier, 6-digit verification code, and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const trimmed = identifier.trim();
    let user = null;

    if (trimmed.includes('@')) {
      user = await User.findOne({ email: trimmed.toLowerCase() }).select('+password +resetPasswordOtp +resetPasswordOtpExpire');
    } else {
      const rawDigits = trimmed.replace(/\D/g, '');
      const stdPhone = standardizePhone(rawDigits);
      const searchSuffix = rawDigits.slice(-9);
      user = await User.findOne({
        $or: [
          { phone: stdPhone },
          { phone: rawDigits },
          { phone: rawDigits.startsWith('0') ? '92' + rawDigits.slice(1) : rawDigits },
          { phone: { $regex: searchSuffix + '$' } },
        ],
      }).select('+password +resetPasswordOtp +resetPasswordOtpExpire');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Auto-normalize phone
    const stdUserPhone = standardizePhone(user.phone);
    if (stdUserPhone && stdUserPhone !== user.phone) {
      user.phone = stdUserPhone;
    }

    const cleanOtp = otp.toString().trim();
    const isOtpValid = user.resetPasswordOtp &&
      user.resetPasswordOtp === cleanOtp &&
      user.resetPasswordOtpExpire &&
      new Date(user.resetPasswordOtpExpire).getTime() > Date.now();

    const isPinValid = user.whatsappPin && user.whatsappPin === cleanOtp;

    if (!isOtpValid && !isPinValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired 6-digit verification code.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpire = null;
    user.whatsappPin = Math.floor(100000 + Math.random() * 900000).toString();
    await user.save();

    // Notify user on WhatsApp if bot is active
    try {
      const { isConnected, sendWhatsAppMessage } = require('../bot/whatsappBot');
      if (isConnected && isConnected()) {
        const message = `✅ *PASSWORD CHANGED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━
Hello *${user.name}*! Your TeamFlow account password was just successfully reset.
If you did not make this change, please contact your project leader immediately.`;
        await sendWhatsAppMessage(user.phone, message);
      }
    } catch (e) {
      // Ignore notification failure
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('ResetPassword error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error resetting password',
    });
  }
};
