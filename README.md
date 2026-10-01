# 🚀 TeamFlow — 100% FREE WhatsApp & AI-Integrated Project Management System (FYP)

> **Final Year Project (FYP)**: An AI-driven group task and roadmap orchestrator built specifically for university student project teams, integrating automated WhatsApp notifications & conversational bots, Google Gemini AI intelligence, and a modern glassmorphic web dashboard.

---

## 🧰 100% FREE Tech Stack

| Component | Free Tool | Why It's 100% Free? |
|---|---|---|
| **WhatsApp Bot** | **Baileys Multi-Device** (`@whiskeysockets/baileys`) | Direct WhatsApp Web protocol connection — **no Twilio or paid APIs needed**! |
| **AI Agent** | **Google Gemini API** (`@google/generative-ai`) | Official Free Tier: 15 RPM with model `gemini-2.5-flash` / `gemini-2.0-flash` |
| **Database** | **MongoDB Atlas / Local** | 512MB free tier M0 cluster on MongoDB Atlas |
| **Backend** | **Node.js + Express** | Open-source REST API + Cron scheduler |
| **Frontend** | **React + Vite + Tailwind CSS** | Ultra-responsive, glassmorphism dark-mode UI with Lucide icons |
| **File Storage** | **Cloudinary + Local Fallback** | 25GB free tier cloud storage with auto local disk fallback |
| **Export / Sync**| **Google Sheets API & CSV Engine** | Built-in CSV export + Google Sheets sync connector |

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIVERSITY USERS                           │
│                                                                 │
│   👑 Project Leader                         👥 Team Members     │
│   ┌──────────────┐                          ┌──────────────┐    │
│   │ WhatsApp App │                          │ WhatsApp App │    │
│   └──────┬───────┘                          └──────┬───────┘    │
│          │                                         │            │
│   ┌──────┴───────────────┐                  ┌──────┴───────┐    │
│   │   Leader Dashboard   │                  │    Member    │    │
│   │ (Kanban, AI, Roadmap)│                  │  Dashboard   │    │
│   └──────────────┬───────┘                  └──────┬───────┘    │
└──────────────────┼─────────────────────────────────┼────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND APPLICATION SERVER                     │
│                     (Node.js + Express)                         │
│                                                                 │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────────┐  │
│  │  Auth & Roles  │    │  Task Engine   │    │  File Upload  │  │
│  │ (JWT + bcrypt) │    │  (CRUD/Status) │    │ (Cloudinary)  │  │
│  └───────┬────────┘    └───────┬────────┘    └───────┬───────┘  │
│          │                     │                     │          │
│  ┌───────┴─────────────────────┴─────────────────────┴───────┐  │
│  │                  AI COPILOT AGENT                         │  │
│  │          (Google Gemini 2.0 / 2.5 Flash Free)             │  │
│  │  • Natural language task creation (!ai ...)               │  │
│  │  • Automated risk detection & timeline prediction         │  │
│  │  • Weekly executive progress summaries                    │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │                 WHATSAPP BOT ENGINE                       │  │
│  │                  (Baileys Free Socket)                    │  │
│  │  • QR code terminal & browser dashboard pairing           │  │
│  │  • Command parsing (!progress, !mytasks, !done, !submit)  │  │
│  │  • Automated deadline alerts (Node-Cron 9 AM sweep)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
         ┌───────────────────────┼──────────────────────┐
         ▼                       ▼                      ▼
  ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
  │   MongoDB   │         │ Cloudinary  │        │   Google    │
  │    Atlas    │         │ Cloud Files │        │ Sheets / CSV│
  │    FREE     │         │    FREE     │        │    FREE     │
  └─────────────┘         └─────────────┘        └─────────────┘
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Configure Environment (`backend/.env`)
Open `backend/.env` and update credentials (or use defaults for initial local testing):
```ini
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/teamflow?retryWrites=true&w=majority
JWT_SECRET=teamflow_super_secret_jwt_key_2026_fyp_98765
GEMINI_API_KEY=your_free_gemini_api_key_from_aistudio
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
WHATSAPP_BOT_ENABLED=true
```
*(Tip: If you don't have Gemini or Cloudinary keys yet, the system includes automatic local storage and smart AI heuristic fallbacks so everything works right out of the box!)*

### 3. Seed Database with Sample FYP Data
Populate 1 Leader, 3 Members, Roadmap phases, and sample tasks:
```bash
npm run seed
```

### 4. Run the Full Application (Backend + Frontend)
Run both backend (`localhost:5000`) and frontend (`localhost:5173`) concurrently:
```bash
npm run dev
```

---

## 🔑 Pre-Configured Demo Accounts

| Role | Name | Email | Password | WhatsApp Phone |
|---|---|---|---|---|
| **👑 Leader** | Hamza Khan | `leader@teamflow.com` | `password123` | `923001234567` |
| **👥 Member** | Ali Ahmed | `ali@teamflow.com` | `password123` | `923012345678` |
| **👥 Member** | Sara Malik | `sara@teamflow.com` | `password123` | `923023456789` |
| **👥 Member** | Ahmed Raza | `ahmed@teamflow.com` | `password123` | `923034567890` |

*(Tip: On the Login screen, click the **1-Click Quick Fill** buttons for instant login during demonstrations!)*

---

## 🤖 WhatsApp Bot Commands Reference

When texting the TeamFlow WhatsApp bot (or using the **Interactive Simulator** modal inside the web dashboard):

| Command | Description | Example |
|---|---|---|
| `!progress` | View overall project velocity and each member's completion % | `!progress` |
| `!mytasks` | View your pending deliverables and approaching deadlines | `!mytasks` |
| `!done <task>` | Mark an assigned task as completed | `!done Literature Review` |
| `!submit <task> <link>` | Submit Google Docs, Figma, or GitHub deliverable URL | `!submit UI Design https://figma.com/...` |
| `!overdue` | List all tasks past their deadline | `!overdue` |
| `!roadmap` | View all project phases and milestone status | `!roadmap` |
| `!insight` | Trigger Gemini AI risk assessment and timeline prediction | `!insight` |
| `!report` | Generate weekly executive summary | `!report` |
| `!remove <name/phone>` | Remove a member from the project workspace (Leader only) | `!remove Ali` |
| `!join <inviteCode>` | Join an FYP project using the leader's invite code | `!join TF-K92X1` |
| `!verify <email/phone>` | Link your WhatsApp number/LID to your registered web profile | `!verify asad@ul.edu.pk` |
| `!ai <command>` | Natural language command parsing to assign tasks | `!ai assign Ali UI design by Friday high priority` |
| `!help` | Display command directory | `!help` |

---

## 📝 FYP Thesis / Report Structure

1. **Chapter 1: Introduction** — Problem statement in university group work, free-tier constraint, and project objectives.
2. **Chapter 2: Literature Review** — Evaluation of commercial tools (Jira, Asana, Trello) and justification of WhatsApp + conversational AI integration.
3. **Chapter 3: Methodology & Architecture** — Baileys multi-device protocol, Google Gemini prompt pipelines, and MongoDB entity models.
4. **Chapter 4: Implementation** — Express REST APIs, React Vite Kanban UI, and automated Node-Cron scheduling.
5. **Chapter 5: Testing & Evaluation** — Usability evaluation, latency benchmarking, and group velocity tracking.
6. **Chapter 6: Conclusion & Future Enhancements** — Supervisor portal, audio voice note parsing, and multilingual Urdu/English support.
