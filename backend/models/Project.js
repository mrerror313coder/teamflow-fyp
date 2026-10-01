const mongoose = require('mongoose');

const roadmapPhaseSchema = new mongoose.Schema({
  phase: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending',
  },
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    whatsappGroupJid: {
      type: String,
      default: null,
    },
    roadmap: [roadmapPhaseSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
