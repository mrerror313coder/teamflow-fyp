const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { handleIncomingMessage } = require('../bot/commandParser');

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected for Security & AI Test');

  // Find a leader and a member
  const leader = await User.findOne({ role: 'leader' });
  const member = await User.findOne({ role: 'member' });
  const project = await Project.findById(leader.projectId);

  console.log(`Testing with Leader: ${leader.name} (${leader.email}), Member: ${member.name}`);

  // Explicitly assign and save a known test PIN
  member.whatsappPin = '654321';
  await member.save();
  const memberOriginalPin = '654321';

  // TEST 1: Attacker tries to hijack Leader's account by typing Leader's phone number
  console.log('\n--- TEST 1: Unauthorized Phone Spoofing Attempt ---');
  const res1 = await handleIncomingMessage('19998887777', `!verify ${leader.phone}`, {
    senderLid: 'attacker_lid_001',
    isGroup: false,
  });
  console.log(res1);
  if (!res1.includes('SECURITY SHIELD') && !res1.includes('Unauthorized Linking Blocked')) {
    throw new Error('Test 1 Failed: Phone spoofing was NOT blocked!');
  }
  console.log('✅ TEST 1 PASSED: Direct phone number linking was blocked!');

  // TEST 2: Attacker tries to hijack Leader's account by typing Leader's name
  console.log('\n--- TEST 2: Unauthorized Name Spoofing Attempt ---');
  const res2 = await handleIncomingMessage('19998887777', `!verify ${leader.name}`, {
    senderLid: 'attacker_lid_001',
    isGroup: false,
  });
  console.log(res2);
  if (!res2.includes('SECURITY SHIELD') && !res2.includes('Unauthorized Linking Blocked')) {
    throw new Error('Test 2 Failed: Name spoofing was NOT blocked!');
  }
  console.log('✅ TEST 2 PASSED: Direct name linking was blocked!');

  // TEST 3: Attacker enters a random 6-digit PIN
  console.log('\n--- TEST 3: Guessing Random 6-Digit PIN ---');
  const res3 = await handleIncomingMessage('19998887777', '!verify 000000', {
    senderLid: 'attacker_lid_001',
    isGroup: false,
  });
  console.log(res3);
  if (!res3.includes('Invalid or Expired PIN')) {
    throw new Error('Test 3 Failed: Invalid PIN was not rejected!');
  }
  console.log('✅ TEST 3 PASSED: Random PIN was rejected!');

  // TEST 4: Legit user verifies with their actual 6-digit dashboard PIN
  console.log('\n--- TEST 4: Legit Verification with Secret 6-Digit PIN ---');
  const legitLid = 'legit_member_lid_555';
  const res4 = await handleIncomingMessage('184933389705320', `!verify ${memberOriginalPin}`, {
    senderLid: legitLid,
    isGroup: false,
  });
  console.log(res4);
  if (!res4.includes('SECURELY VERIFIED & LINKED')) {
    throw new Error('Test 4 Failed: Legit PIN verification failed!');
  }
  console.log('✅ TEST 4 PASSED: Legit user verified securely!');

  // Verify DB state
  const updatedMember = await User.findById(member._id);
  if (updatedMember.whatsappLid !== legitLid) {
    throw new Error('Test 4 DB check failed: whatsappLid not set!');
  }
  if (updatedMember.whatsappPin === memberOriginalPin) {
    throw new Error('Test 4 DB check failed: whatsappPin was not regenerated!');
  }
  console.log('✅ TEST 4 DB CHECK PASSED: PIN was regenerated to:', updatedMember.whatsappPin);

  // TEST 5: Re-using the same PIN should fail
  console.log('\n--- TEST 5: Re-using Expired PIN ---');
  const res5 = await handleIncomingMessage('19998887777', `!verify ${memberOriginalPin}`, {
    senderLid: 'attacker_lid_002',
    isGroup: false,
  });
  console.log(res5);
  if (!res5.includes('Invalid or Expired PIN')) {
    throw new Error('Test 5 Failed: Replay attack was not prevented!');
  }
  console.log('✅ TEST 5 PASSED: Replay attack blocked!');

  // TEST 6: Verified Member asks AI a question (!ai what are our overdue tasks?)
  console.log('\n--- TEST 6: Member asks AI Copilot a question ---');
  const res6 = await handleIncomingMessage('184933389705320', '!ai what are our overdue tasks?', {
    senderLid: legitLid,
    isGroup: false,
  });
  console.log(res6);
  if (res6.includes('Member: null') || res6.includes('Action: query')) {
    throw new Error('Test 6 Failed: Output contains Member: null debug text!');
  }
  if (!res6.includes('TEAMFLOW AI COPILOT')) {
    throw new Error('Test 6 Failed: Response does not have AI Copilot header!');
  }
  console.log('✅ TEST 6 PASSED: Member received intelligent AI response without nulls!');

  // TEST 7: Leader uses AI to assign task
  // Link leader's LID first
  leader.whatsappPin = '123456';
  await leader.save();
  const leaderLid = 'leader_lid_999';
  await handleIncomingMessage('923001234567', '!verify 123456', { senderLid: leaderLid, isGroup: false });

  console.log('\n--- TEST 7: Leader assigns task via AI Copilot ---');
  const res7 = await handleIncomingMessage('923001234567', '!ai assign Ali to develop GPS module by Friday high priority', {
    senderLid: leaderLid,
    isGroup: false,
  });
  console.log(res7);
  if (res7.includes('Member: null')) {
    throw new Error('Test 7 Failed: Member: null detected in assignment!');
  }
  if (!res7.includes('AI TASK CREATED & ASSIGNED')) {
    throw new Error('Test 7 Failed: Task was not created!');
  }
  console.log('✅ TEST 7 PASSED: Leader assigned task via AI Copilot successfully!');

  // TEST 8: Member tries to assign a task
  console.log('\n--- TEST 8: Member tries to assign task via AI Copilot ---');
  const res8 = await handleIncomingMessage('184933389705320', '!ai assign Sara to write report by tomorrow', {
    senderLid: legitLid,
    isGroup: false,
  });
  console.log(res8);
  if (!res8.includes('LEADER ONLY') && !res8.includes('Only the Project Leader')) {
    throw new Error('Test 8 Failed: Member was not restricted from assigning tasks!');
  }
  console.log('✅ TEST 8 PASSED: Task assignment restricted to Leader only!');

  console.log('\n🎉 ALL 8 SECURITY AND AI TESTS PASSED WITH 100% SUCCESS!');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
