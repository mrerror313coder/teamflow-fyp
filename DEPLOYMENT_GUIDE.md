# 🚀 TeamFlow — 100% FREE Production Deployment Guide

This guide explains how to deploy your FYP project online for **FREE ($0 cost)** so anyone can access it via a public URL and the WhatsApp Bot runs 24/7.

---

## 📋 Pre-Deployment Checklist (Completed ✅)

- [x] All demo accounts & test data wiped from MongoDB Atlas (0 users, 0 projects, 0 tasks).
- [x] `.gitignore` configured (protects `.env`, `node_modules`, and WhatsApp session credentials).
- [x] Login page cleaned for real student registration.
- [x] Anti-spoofing 6-Digit WhatsApp PIN security active.
- [x] Gemini AI Copilot enabled with zero-downtime fallback.
- [x] `render.yaml` blueprint created.

---

## 🛠️ Step 1: Push Code to GitHub

Open terminal in the project root folder (`e:\FYP Chatbot`) and run:

```bash
git init
git add .
git commit -m "TeamFlow production ready"
git branch -M main
```

Create a new repository on [GitHub](https://github.com/new) (e.g. `teamflow-fyp`), then link and push:

```bash
git remote add origin https://github.com/<your-username>/teamflow-fyp.git
git push -u origin main
```

*(Note: Your `.env` and `whatsapp-auth` are automatically ignored by `.gitignore` so your secrets are 100% safe!)*

---

## 🌐 Step 2: Deploy to Render.com (Recommended — All-in-One FREE)

Render allows hosting both the React Frontend and Node.js Backend together on a single free web service.

1. Go to [Render.com](https://render.com) and sign in with GitHub.
2. Click **"New +"** &rarr; select **"Web Service"**.
3. Choose your `teamflow-fyp` GitHub repository.
4. Fill in the deployment details:
   - **Name:** `teamflow-fyp` (or your chosen name)
   - **Region:** Any (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `node backend/server.js`
   - **Instance Type:** `Free`

5. Scroll down to **"Environment Variables"** and click **"Add Environment Variable"** for each:

| Key | Value (Copy from your local `backend/.env`) |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGO_URI` | `your_mongodb_atlas_connection_string_from_env` |
| `JWT_SECRET` | `your_jwt_secret_key_from_env` |
| `GEMINI_API_KEY` | `your_gemini_api_key_from_env` |
| `CLOUDINARY_CLOUD_NAME` | `your_cloudinary_cloud_name_from_env` |
| `CLOUDINARY_API_KEY` | `your_cloudinary_api_key_from_env` |
| `CLOUDINARY_API_SECRET` | `your_cloudinary_api_secret_from_env` |
| `WHATSAPP_BOT_ENABLED` | `true` |

*(Tip: You can simply copy-paste the exact values from your local `backend/.env` file into Render!)*

6. Click **"Deploy Web Service"**!
   Render will build the React frontend, install backend dependencies, and boot your server.
   Your app will be live at: `https://teamflow-fyp.onrender.com`!

---

## 📱 Step 3: Connect WhatsApp Bot in Production

Once your Render web service is live:

1. Open your live app URL (e.g. `https://teamflow-fyp.onrender.com/register`).
2. Register your real account as **Project Leader**.
3. Create your FYP Project workspace.
4. In the top navbar, click the **"WhatsApp Bot"** button.
5. Go to the **"Pairing QR Code"** tab.
6. Open WhatsApp on your phone &rarr; **Linked Devices** &rarr; **Link a Device** &rarr; scan the QR code.
7. Your WhatsApp bot is now connected in the cloud and active 24/7!

---

## 👥 Step 4: Onboarding Real Team Members

1. In your Leader Dashboard, copy your **Project Invite Code** (e.g., `TF-XXXXX`).
2. Send it to your group members on WhatsApp.
3. Members register at your live URL:
   - They enter your Invite Code during registration, OR
   - They send `!join <InviteCode>` directly to the WhatsApp bot!
4. Each member can link their WhatsApp by copying their private 6-digit PIN from their dashboard and sending `!verify <PIN>`.

---

## 🔄 Optional: Keep Render Awake 24/7 (Free Tier Sleep Prevention)

Render free tier services spin down after 15 minutes of inactivity. To keep your WhatsApp Bot online continuously:

1. Go to [Cron-Job.org](https://cron-job.org) (100% Free).
2. Create a free account.
3. Add a new Cron Job:
   - **URL:** `https://your-app.onrender.com/api/health`
   - **Schedule:** Every 10 minutes (`*/10 * * * *`)
4. This pings your health check endpoint every 10 minutes, keeping your server and WhatsApp Bot active 24/7 at zero cost!
