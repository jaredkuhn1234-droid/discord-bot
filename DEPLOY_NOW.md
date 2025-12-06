# Quick Deployment Checklist

## Pre-Deploy (Do This Now)
- [ ] Run `npm run build` – compiles TypeScript
- [ ] Run `npm test` – verifies tests pass
- [ ] Run `npm run lint` – checks code quality
- [ ] Test locally with `npm run dev`
- [ ] Verify `!ping` works in Discord
- [ ] Check all 4 databases created (bot.db, levels.db, custom_commands.db, analytics.db)

## Choose Platform
- [ ] **Railway** (Easiest - Recommended)
- [ ] **Heroku** (Traditional)
- [ ] **VPS** (Full control)

## For Railway (Easiest)

### 1. Initialize Git
```powershell
cd "C:\Users\jared\Desktop\Discord bot V1"
git init
git add .
git commit -m "Initial Discord bot deployment"
```

### 2. Create GitHub Repository
- Go to https://github.com/new
- Create repository: `discord-bot`
- Copy the commands for "push existing repository"
- Example:
  ```powershell
  git remote add origin https://github.com/YOUR_USERNAME/discord-bot.git
  git branch -M main
  git push -u origin main
  ```

### 3. Deploy on Railway
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `discord-bot` repository
5. Railway auto-detects Node.js project

### 4. Configure Environment Variables
In Railway dashboard:
1. Click "Variables"
2. Add these:
   ```
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=1446685955153985537
   COMMAND_PREFIX=!
   NODE_ENV=production
   ```
3. Save and deploy

### 5. Watch Logs
In Railway dashboard → "Logs" tab, you should see:
```
info: All databases initialized successfully
info: Logged in as BOT V2#6350
info: Slash commands registered globally
```

### 6. Done! 🎉
Bot runs 24/7 on Railway's free tier (500 hours/month)

---

## For Heroku (Alternative)

### 1. Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

### 2. Create App
```powershell
heroku login
heroku create your-unique-bot-name
```

### 3. Set Secrets
```powershell
heroku config:set DISCORD_TOKEN=your_token_here
heroku config:set DISCORD_CLIENT_ID=1446685955153985537
heroku config:set COMMAND_PREFIX=!
heroku config:set NODE_ENV=production
```

### 4. Deploy
```powershell
git push heroku main
```

### 5. Watch Logs
```powershell
heroku logs --tail
```

---

## For VPS (DigitalOcean/Linode)

### 1. Create Server
- DigitalOcean: $6/month (1GB RAM)
- Ubuntu 20.04 LTS

### 2. SSH Into Server
```powershell
ssh root@YOUR_SERVER_IP
```

### 3. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Clone & Setup
```bash
git clone https://github.com/YOUR_USERNAME/discord-bot.git
cd discord-bot
npm install
npm run build
```

### 5. Create .env
```bash
nano .env
# Paste:
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=1446685955153985537
COMMAND_PREFIX=!
NODE_ENV=production
```

### 6. Use PM2 for Auto-Restart
```bash
sudo npm install -g pm2
pm2 start npm --name "discord-bot" -- start
pm2 startup
pm2 save
```

### 7. Monitor
```bash
pm2 logs discord-bot
```

---

## After Deployment

### Test Bot
```
!ping              → Should reply "Pong!"
!help              → Should show categorized help menu
!stats             → Should show 7-day usage stats
!rank              → Should show your level/XP
!leaderboard       → Should show top users
```

### Monitor Health
```
!uptime            → Check how long bot's been running
Check logs         → Watch for errors
Database backups   → Plan regular backups
```

### Next: Monetization
- Set up pricing page
- Create subscription system
- Launch to Discord community

---

## Help & Support

**Issues during deployment?**
1. Check environment variables set correctly
2. Check DISCORD_TOKEN is valid
3. Review logs for errors
4. Ensure bot invited to server
5. Try: !ping to test

**Questions?**
- Read DEPLOYMENT.md (detailed guide)
- Check FEATURES.md (feature reference)
- Review README.md (setup help)

---

**Ready? Start with Railway! 🚀**

Next: Choose platform and let's deploy! 🎯
