# Discord Bot V2 - Deployment Guide

## Quick Start: Choose Your Platform

### Option 1: Railway (Recommended - Easiest)
- Free tier available
- GitHub integration
- Auto-deploy on push
- Custom domain
- **Setup time: 5 minutes**

### Option 2: Heroku
- Hobby tier
- BuildPack support
- Easy CLI deployment
- **Setup time: 10 minutes**

### Option 3: VPS (DigitalOcean, Linode, AWS)
- Full control
- Best for production
- More expensive
- **Setup time: 20 minutes**

---

## 🚀 Railway Deployment (EASIEST)

### Step 1: Push to GitHub
```powershell
cd "C:\Users\jared\Desktop\Discord bot V1"
git init
git add .
git commit -m "Initial bot deployment"
git remote add origin https://github.com/YOUR_USERNAME/discord-bot.git
git push -u origin main
```

### Step 2: Connect Railway
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your `discord-bot` repository
4. Railway auto-detects Node.js project

### Step 3: Configure Environment
1. In Railway dashboard, go to "Variables"
2. Add these variables:
   - `DISCORD_TOKEN` – Your bot token
   - `DISCORD_CLIENT_ID` – Your app ID
   - `COMMAND_PREFIX` – `!` (or your prefix)
   - `NODE_ENV` – `production`

### Step 4: Deploy
- Click "Deploy"
- Takes 2-3 minutes
- Railway logs show bot starting
- **Done!** Bot runs 24/7

### Cost: Free (with paid options)
- Free tier: 500 hours/month (enough for 1 bot)
- Upgrade to Premium for more

---

## 🎯 Heroku Deployment (Alternative)

### Step 1: Install Heroku CLI
```powershell
# Download from https://devcenter.heroku.com/articles/heroku-cli
heroku --version  # Verify installation
```

### Step 2: Login to Heroku
```powershell
heroku login
```

### Step 3: Create App
```powershell
cd "C:\Users\jared\Desktop\Discord bot V1"
heroku create your-bot-name
```

### Step 4: Set Environment Variables
```powershell
heroku config:set DISCORD_TOKEN=your_token_here
heroku config:set DISCORD_CLIENT_ID=your_client_id_here
heroku config:set COMMAND_PREFIX=!
heroku config:set NODE_ENV=production
```

### Step 5: Deploy
```powershell
git push heroku main
```

### Step 6: Keep Bot Running (Worker Dyno)
Create `Procfile` in root:
```
worker: npm start
```

### Cost: $7-50/month
- Free dyno hours ended (Heroku policy change 2022)
- Cheapest: $7/month for basic dyno

---

## 💻 VPS Deployment (Full Control)

### Prerequisites
- DigitalOcean, Linode, or AWS account
- Ubuntu 20.04+ server
- SSH access

### Step 1: Create Server
**DigitalOcean:**
1. Create Droplet (Ubuntu 20.04, $6/month)
2. Copy IP address

### Step 2: Connect via SSH
```powershell
# From PowerShell
ssh root@YOUR_SERVER_IP
```

### Step 3: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

### Step 4: Clone Repository
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/discord-bot.git
cd discord-bot
npm install
```

### Step 5: Configure Environment
```bash
nano .env
# Add:
# DISCORD_TOKEN=your_token
# DISCORD_CLIENT_ID=your_client_id
# COMMAND_PREFIX=!
# NODE_ENV=production
```

### Step 6: Use PM2 for Auto-Restart
```bash
sudo npm install -g pm2
pm2 start npm --name "discord-bot" -- start
pm2 startup
pm2 save
```

### Step 7: Monitor
```bash
pm2 logs discord-bot
pm2 status
```

### Cost: $6+/month
- DigitalOcean: $6/month (1GB RAM, 1 CPU)
- Linode: $5/month
- AWS: Variable (free tier available)

---

## 📋 Pre-Deployment Checklist

- [ ] Bot tested locally with `npm run dev`
- [ ] All tests passing: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] `.env` has valid `DISCORD_TOKEN`
- [ ] `.env` has valid `DISCORD_CLIENT_ID`
- [ ] Bot invited to test server
- [ ] Prefix commands work (`!ping`)
- [ ] Repository pushed to GitHub (if using Railway/Heroku)
- [ ] Database backup strategy planned

---

## 🔐 Security Before Deployment

### Never Commit Secrets
- ✅ `.env` is in `.gitignore`
- ✅ Use platform environment variables
- ✅ Rotate token if ever exposed

### Use Separate Bot Account
- Don't use personal Discord account token
- Use bot token from Developer Portal
- Bot should have minimal required permissions

### Restrict Permissions
Give bot only needed permissions:
```
Permissions Required:
- Send Messages
- Embed Links
- Kick Members (for moderation)
- Ban Members (for moderation)
- Read Message History
```

---

## 📊 Monitoring After Deployment

### Log Files Location
- **Railway**: View in dashboard
- **Heroku**: `heroku logs --tail`
- **VPS**: `/home/bot/logs/` (check with PM2)

### Check Bot Status
```
!stats              # View usage stats
!help               # Check if responding
!uptime             # See how long running
```

### Monitor Databases
All databases auto-created:
- `bot.db` – Main database
- `levels.db` – XP/levels
- `custom_commands.db` – Custom commands
- `analytics.db` – Usage tracking

---

## 🚨 Troubleshooting Deployment

### Bot offline after deploy?
```
1. Check environment variables set
2. Check DISCORD_TOKEN is valid
3. Check logs for errors
4. Restart bot process
```

### Commands not responding?
```
1. Bot invited to server?
2. Prefix correct (default: !)
3. Try: !ping
4. Check logs for errors
```

### Database errors?
```
1. Databases auto-created on startup
2. Check file permissions (VPS)
3. Review logs for SQL errors
```

---

## 💡 Recommended: Railway + GitHub

**Why Railway?**
- ✅ Easiest setup (5 minutes)
- ✅ Free tier sufficient
- ✅ Auto-deploy on push
- ✅ Built-in logging
- ✅ No credit card for free tier
- ✅ Scales easily

**Setup Summary:**
1. Push code to GitHub
2. Connect GitHub to Railway
3. Add 3 environment variables
4. Done - bot runs 24/7

---

## 🎉 Next: Choose Platform

**Which platform?**
1. **Railway** – Easiest (recommended)
2. **Heroku** – Traditional
3. **VPS** – Full control

Reply with your choice and I'll guide you through setup! 🚀
