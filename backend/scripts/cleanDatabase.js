const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Submission = require('../models/Submission');

async function cleanDatabase() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected to database.');

  console.log('\n🧹 Deleting all demo data & test accounts...');

  const deletedUsers = await User.deleteMany({});
  const deletedProjects = await Project.deleteMany({});
  const deletedTasks = await Task.deleteMany({});
  const deletedSubmissions = await Submission.deleteMany({});

  console.log(`✅ Deleted ${deletedUsers.deletedCount} Users.`);
  console.log(`✅ Deleted ${deletedProjects.deletedCount} Projects.`);
  console.log(`✅ Deleted ${deletedTasks.deletedCount} Tasks.`);
  console.log(`✅ Deleted ${deletedSubmissions.deletedCount} Submissions.`);

  // Verify DB is clean
  const usersRemaining = await User.countDocuments();
  const projectsRemaining = await Project.countDocuments();
  const tasksRemaining = await Task.countDocuments();

  console.log('\n📊 DATABASE STATUS AFTER CLEANUP:');
  console.log(`- Users: ${usersRemaining}`);
  console.log(`- Projects: ${projectsRemaining}`);
  console.log(`- Tasks: ${tasksRemaining}`);

  if (usersRemaining === 0 && projectsRemaining === 0 && tasksRemaining === 0) {
    console.log('\n🎉 DATABASE IS 100% CLEAN AND READY FOR PRODUCTION DEPLOYMENT!');
  } else {
    console.warn('\n⚠️ Some documents remain.');
  }

  await mongoose.disconnect();
}

cleanDatabase().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
