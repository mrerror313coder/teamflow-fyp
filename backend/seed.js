const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Submission = require('./models/Submission');

// Configure reliable DNS servers to resolve MongoDB Atlas SRV/TXT records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore
}

dotenv.config();

const seedData = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teamflow';
    if (mongoUri.includes('<') && mongoUri.includes('>')) {
      mongoUri = mongoUri.replace(/<([^>]+)>/g, '$1');
    }
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(' Connected to MongoDB for database seeding.');


    // Clear existing collections
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Submission.deleteMany({});
    console.log('🧹 Purged existing collections.');

    // 1. Create Leader
    const leader = await User.create({
      name: 'Hamza Khan (Leader)',
      email: 'leader@teamflow.com',
      password: 'password123',
      phone: '923001234567',
      role: 'leader',
    });

    // 2. Create Members
    const ali = await User.create({
      name: 'Ali Ahmed',
      email: 'ali@teamflow.com',
      password: 'password123',
      phone: '923012345678',
      role: 'member',
    });

    const sara = await User.create({
      name: 'Sara Malik',
      email: 'sara@teamflow.com',
      password: 'password123',
      phone: '923023456789',
      role: 'member',
    });

    const ahmed = await User.create({
      name: 'Ahmed Raza',
      email: 'ahmed@teamflow.com',
      password: 'password123',
      phone: '923034567890',
      role: 'member',
    });

    // 3. Create Project with Roadmap
    const project = await Project.create({
      name: 'TeamFlow - AI Collaborative Work System',
      description: 'University Final Year Project: An AI-driven task and roadmap orchestrator integrated with WhatsApp and modern web dashboard.',
      leaderId: leader._id,
      members: [ali._id, sara._id, ahmed._id],
      roadmap: [
        {
          phase: 'Research & Literature Review',
          description: 'Study Trello, Jira, WhatsApp APIs, and LLM orchestration algorithms.',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-14'),
          status: 'completed',
        },
        {
          phase: 'System Design & Architecture',
          description: 'Design ER diagrams, API schemas, UI wireframes, and Baileys architecture.',
          startDate: new Date('2026-09-15'),
          endDate: new Date('2026-09-30'),
          status: 'active',
        },
        {
          phase: 'Development & Integration',
          description: 'Express backend, React Vite UI, Gemini API prompts, and WhatsApp webhook bots.',
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-25'),
          status: 'pending',
        },
        {
          phase: 'Evaluation & Documentation',
          description: 'Usability testing, stress tests, final report chapters 1-6, and viva presentation.',
          startDate: new Date('2026-10-26'),
          endDate: new Date('2026-11-15'),
          status: 'pending',
        },
      ],
    });

    // Associate project with users
    await User.updateMany({}, { projectId: project._id });

    // 4. Create 10 sample tasks with diverse statuses
    const now = new Date();
    const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

    const tasksData = [
      // Ali's Tasks
      {
        title: 'Conduct Literature Review on Task Tracking Tools',
        description: 'Examine literature related to Jira, Asana, and conversational agents for group coordination.',
        assignedTo: ali._id,
        projectId: project._id,
        phase: 'Research & Literature Review',
        status: 'completed',
        priority: 'high',
        deadline: daysAgo(10),
        submission: {
          docLink: 'https://docs.google.com/document/d/sample-literature-review',
          notes: 'Completed all 15 citations and comparative matrix.',
          submittedAt: daysAgo(11),
        },
        completedAt: daysAgo(11),
      },
      {
        title: 'Database Schema & ER Diagram Design',
        description: 'Design Mongoose schemas for User, Project, Task, and Submissions.',
        assignedTo: ali._id,
        projectId: project._id,
        phase: 'System Design & Architecture',
        status: 'completed',
        priority: 'high',
        deadline: daysAgo(2),
        submission: {
          fileUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
          notes: 'Diagram created in dbdiagram.io and exported.',
          submittedAt: daysAgo(2),
        },
        completedAt: daysAgo(2),
      },
      {
        title: 'Implement Baileys WhatsApp Connection Manager',
        description: 'Configure multi-file auth state and automated reconnect handlers for WhatsApp socket.',
        assignedTo: ali._id,
        projectId: project._id,
        phase: 'Development & Integration',
        status: 'in_progress',
        priority: 'high',
        deadline: daysFromNow(2),
      },
      {
        title: 'Write Baileys QR Code Render Component',
        description: 'Render the QR code on the React dashboard for easy pairing.',
        assignedTo: ali._id,
        projectId: project._id,
        phase: 'Development & Integration',
        status: 'pending',
        priority: 'medium',
        deadline: daysFromNow(5),
      },

      // Sara's Tasks
      {
        title: 'Comparative Analysis with Slack and WhatsApp bots',
        description: 'Benchmark interaction latency and student engagement.',
        assignedTo: sara._id,
        projectId: project._id,
        phase: 'Research & Literature Review',
        status: 'completed',
        priority: 'medium',
        deadline: daysAgo(8),
        submission: {
          docLink: 'https://docs.google.com/spreadsheets/d/sample-analysis-matrix',
          notes: 'Completed survey of 30 university classmates.',
          submittedAt: daysAgo(9),
        },
        completedAt: daysAgo(9),
      },
      {
        title: 'Build Interactive Kanban Board in React',
        description: 'Implement drag-and-drop or column card state transitions for Pending, In Progress, Completed, Blocked.',
        assignedTo: sara._id,
        projectId: project._id,
        phase: 'Development & Integration',
        status: 'in_progress',
        priority: 'high',
        deadline: daysFromNow(3),
      },
      {
        title: 'Integrate Google Gemini 2.0 Flash API',
        description: 'Construct prompt templates for natural language command parsing and risk assessment.',
        assignedTo: sara._id,
        projectId: project._id,
        phase: 'Development & Integration',
        status: 'pending',
        priority: 'high',
        deadline: daysFromNow(4),
      },

      // Ahmed's Tasks
      {
        title: 'Finalize System Architecture Specification Document',
        description: 'Document backend micro-modules and deployment topologies.',
        assignedTo: ahmed._id,
        projectId: project._id,
        phase: 'System Design & Architecture',
        status: 'completed',
        priority: 'medium',
        deadline: daysAgo(5),
        submission: {
          docLink: 'https://docs.google.com/document/d/architecture-spec',
          notes: 'Approved by project supervisor.',
          submittedAt: daysAgo(5),
        },
        completedAt: daysAgo(5),
      },
      {
        title: 'Configure Cloudinary Storage & Multer Pipeline',
        description: 'Set up signed uploads for student document and PDF submissions.',
        assignedTo: ahmed._id,
        projectId: project._id,
        phase: 'System Design & Architecture',
        status: 'pending',
        priority: 'high',
        deadline: daysAgo(1), // Intentionally overdue for realistic demo!
      },
      {
        title: 'Implement Automated Daily Node-Cron Reminders',
        description: 'Schedule daily 9 AM sweeps for tasks with deadlines approaching within 24 hours.',
        assignedTo: ahmed._id,
        projectId: project._id,
        phase: 'Development & Integration',
        status: 'blocked',
        priority: 'medium',
        deadline: daysFromNow(6),
      },
    ];

    const createdTasks = await Task.insertMany(tasksData);
    console.log(` Created ${createdTasks.length} sample tasks.`);

    console.log(`
===========================================================
✨ TEAMFLOW SEED DATA CREATED SUCCESSFULLY!
===========================================================
👑 LEADER LOGIN:
   Email:    leader@teamflow.com
   Password: password123
   Phone:    923001234567

👥 MEMBER LOGINS (Password: password123):
   1. Ali Ahmed   - ali@teamflow.com   (Phone: 923012345678)
   2. Sara Malik  - sara@teamflow.com  (Phone: 923023456789)
   3. Ahmed Raza  - ahmed@teamflow.com (Phone: 923034567890)
===========================================================
    `);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
