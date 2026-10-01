const mongoose = require('mongoose');
const dns = require('dns');
const crypto = require('crypto');
require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Project = require('../models/Project');
  const projects = await Project.find();
  for (const p of projects) {
    if (!p.inviteCode) {
      p.inviteCode = 'TF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      await p.save();
      console.log(`Generated invite code for ${p.name}: ${p.inviteCode}`);
    } else {
      console.log(`Project ${p.name} already has code: ${p.inviteCode}`);
    }
  }
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
