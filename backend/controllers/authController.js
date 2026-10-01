const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    // Standardize phone (remove non-digits like +, spaces, dashes)
    const cleanedPhone = phone.replace(/\D/g, '');

    const Project = require('../models/Project');
    let matchedProject = null;
    if (req.body.inviteCode) {
      matchedProject = await Project.findOne({ inviteCode: req.body.inviteCode.trim().toUpperCase() });
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
      matchedProject.members.push(user._id);
      await matchedProject.save();
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
