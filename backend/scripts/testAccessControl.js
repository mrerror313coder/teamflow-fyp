const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const runTests = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const { handleIncomingMessage } = require('../bot/commandParser');
  const User = require('../models/User');
  const Project = require('../models/Project');

  console.log('=== TEST 1: Unregistered number sends !progress ===');
  const res1 = await handleIncomingMessage('999988887777666', '!progress');
  console.log(res1);
  if (!res1.includes('ACCESS DENIED')) throw new Error('Test 1 failed: Unregistered number was not denied!');

  console.log('\n=== TEST 2: Unregistered number sends !insight ===');
  const res2 = await handleIncomingMessage('923999999999', '!insight');
  console.log(res2);
  if (!res2.includes('ACCESS DENIED')) throw new Error('Test 2 failed: Unregistered number got insight!');

  console.log('\n=== TEST 3: Unregistered number sends !help ===');
  const res3 = await handleIncomingMessage('923999999999', '!help');
  console.log(res3);
  if (!res3.includes('Unregistered / Guest')) throw new Error('Test 3 failed: Help menu status mismatch');

  console.log('\n=== TEST 4: Registered Member (Ali Ahmed 923012345678) sends !progress ===');
  const res4 = await handleIncomingMessage('923012345678', '!progress');
  console.log(res4);
  if (!res4.includes('PROJECT STATUS')) throw new Error('Test 4 failed: Member could not see project status');

  console.log('\n=== TEST 5: Registered Member (Ali Ahmed) sends !mytasks ===');
  const res5 = await handleIncomingMessage('923012345678', '!mytasks');
  console.log(res5);
  if (!res5.includes('ALI AHMED')) throw new Error('Test 5 failed: Member tasks mismatch');

  console.log('\n=== TEST 6: WhatsApp Group chat isolation ===');
  // Group JID linked to TeamFlow project
  const tfProject = await Project.findOne({ inviteCode: 'TF-H81TT' });
  const otherProject = await Project.findOne({ name: 'All' });
  const mockGroupJid = '120363025958889584@g.us';
  tfProject.whatsappGroupJid = mockGroupJid;
  await tfProject.save();

  // Create an outsider user in Project "All"
  let outsider = await User.findOne({ email: 'outsider@test.com' });
  if (!outsider) {
    outsider = await User.create({
      name: 'Outsider Student',
      email: 'outsider@test.com',
      password: 'password123',
      phone: '923888888888',
      role: 'member',
      projectId: otherProject._id,
    });
  } else {
    outsider.projectId = otherProject._id;
    await outsider.save();
  }

  // Outsider (belongs to Project "All", NOT "TeamFlow") tries to send !progress in TeamFlow's WhatsApp group
  const res6 = await handleIncomingMessage('923888888888', '!progress', {
    isGroup: true,
    remoteJid: mockGroupJid,
  });
  console.log(res6);
  if (!res6.includes('ACCESS DENIED')) throw new Error('Test 6 failed: Cross-group isolation failed!');

  console.log('\n=== TEST 7: LID User links account via !verify asad@ul.edu.pk ===');
  const res7 = await handleIncomingMessage('184933389705320', '!verify asad@ul.edu.pk', {
    senderLid: '184933389705320',
  });
  console.log(res7);
  if (!res7.includes('ACCOUNT VERIFIED & LINKED')) throw new Error('Test 7 failed: !verify failed!');

  console.log('\n=== TEST 8: Verified LID User sends !progress ===');
  const res8 = await handleIncomingMessage('184933389705320', '!progress', {
    senderLid: '184933389705320',
  });
  console.log(res8);
  if (!res8.includes('PROJECT STATUS')) throw new Error('Test 8 failed: Verified LID user could not see project!');

  console.log('\n✅ ALL 8 ACCESS CONTROL & LID VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
