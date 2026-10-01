const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const runTests = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const Project = require('../models/Project');
  const Task = require('../models/Task');
  const { handleIncomingMessage } = require('../bot/commandParser');

  console.log('=== TEST 1: Setup a temporary member to remove ===');
  const project = await Project.findOne({ inviteCode: 'TF-H81TT' });
  const leader = await User.findById(project.leaderId);

  let tempMember = await User.findOne({ email: 'testremove@teamflow.local' });
  if (!tempMember) {
    tempMember = await User.create({
      name: 'Temp Student',
      email: 'testremove@teamflow.local',
      password: 'password123',
      phone: '923987654321',
      role: 'member',
      projectId: project._id,
    });
  } else {
    tempMember.projectId = project._id;
    await tempMember.save();
  }

  if (!project.members.some((m) => m.toString() === tempMember._id.toString())) {
    project.members.push(tempMember._id);
    await project.save();
  }

  // Create a task assigned to tempMember
  const task = await Task.create({
    title: 'Temporary Task to Unassign',
    projectId: project._id,
    assignedTo: tempMember._id,
    deadline: new Date(Date.now() + 86400000),
    status: 'pending',
  });

  console.log(`Created member "${tempMember.name}" in project "${project.name}" with a task.`);

  console.log('\n=== TEST 2: Leader removes member via WhatsApp !remove command ===');
  const res = await handleIncomingMessage(leader.phone, '!remove Temp Student', {
    isFromMe: true,
  });
  console.log(res);

  if (!res.includes('MEMBER REMOVED FROM PROJECT')) {
    throw new Error('Test 2 failed: WhatsApp !remove did not return success!');
  }

  // Verify DB state
  const updatedProject = await Project.findById(project._id);
  const isStillMember = updatedProject.members.some((m) => m.toString() === tempMember._id.toString());
  if (isStillMember) throw new Error('Test failed: Member is still in project.members array!');

  const updatedUser = await User.findById(tempMember._id);
  if (updatedUser.projectId) throw new Error('Test failed: User still has projectId assigned!');

  const updatedTask = await Task.findById(task._id);
  if (updatedTask.assignedTo) throw new Error('Test failed: Task was not unassigned!');

  console.log('\n=== TEST 3: Non-leader tries to use !remove command ===');
  const nonLeaderRes = await handleIncomingMessage('923012345678', '!remove Ali');
  console.log(nonLeaderRes);
  if (!nonLeaderRes.includes('LEADER ONLY')) {
    throw new Error('Test 3 failed: Non-leader was not blocked from using !remove!');
  }

  // Cleanup
  await Task.findByIdAndDelete(task._id);
  await User.findByIdAndDelete(tempMember._id);

  console.log('\n✅ ALL MEMBER REMOVAL TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
