# Discord Bot V2

Feature-rich Discord bot in TypeScript with prefix and slash commands, SQLite database, moderation, and events.

## Prerequisites
- Node.js 18+
- A Discord bot token with Message Content intent enabled.
- Discord Application (for slash commands) and its Application ID.

## Setup
1) Copy `.env.example` to `.env` and set:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID` (required for slash commands deploy)
   - `COMMAND_PREFIX` (optional, default `!`)
2) Install dependencies:
   ```powershell
   npm install
   ```
3) Run in watch mode:
   ```powershell
   npm run dev
   ```
4) Build and run production output:
   ```powershell
   npm run build
   npm start
   ```

## Linting, formatting, and testing
- Lint: `npm run lint`
- Format check: `npm run format`
- Format write: `npm run format:fix`
- Test: `npm test`
- Test (watch): `npm run test:watch`
- Test (coverage): `npm run test:coverage`

## Features
- **Slash & Prefix commands** (auto-registered, configurable)
- **SQLite database** (warnings, mod logs, guild configs, levels, custom commands)
- **Welcome messages** on member join
- **Moderation** (warn, kick, ban with logging)
- **Fun & Games** (joke, flip, pick, 8ball, roll)
- **Info commands** (userinfo, botinfo, avatar)
- **Level & XP System** (earn XP per message, rank tracking, leaderboard)
- **Custom Commands** (create, delete, list guild-specific commands)
- **Automod** (spam, caps, link filters with configuration)
- **Analytics** (command usage tracking, error logging)
- **Rate Limiting** (5 commands per 10s per user)
- **Error Handling** (comprehensive try-catch, unhandled rejection handlers)

## Commands

### Built-in Commands (Utility, Fun, Info, Moderation)
- **Utility**: `ping`, `help`, `uptime`, `server`, `botinfo`
- **Games/Fun**: `joke`, `flip`, `pick`, `8ball`, `roll`
- **Info**: `userinfo`, `avatar`
- **Moderation** (requires mod perms): `warn`, `warnings`, `kick`, `ban`, `welcome`

### Levels & Ranking
- `!rank [@user]` or `/rank` – Check your or another user's level/XP/rank
- `!leaderboard` or `/leaderboard` – View top 10 users by XP
- Auto XP gain: +10 XP per message (1 minute cooldown to prevent spam)

### Custom Commands (Guild-specific)
- `!cc add <name> <response>` – Create custom command
- `!cc delete <name>` – Remove custom command
- `!cc list` – Show all guild custom commands

### Analytics
- `!stats` – View 7-day command usage statistics

### Automod Management (Mod only)
- `!automod status` – View automod settings
- `!automod toggle` – Enable/disable automod
- Default filters: Spam (5 msgs/5s), Caps (70% threshold), Links (optional)

### Prefix Commands (default `!`)
- `!ping` – reply pong
- `!help` – categorized command menu (embedded)
- `!uptime` – show bot uptime
- `!roll 1d20` – roll dice (default 1d20; max 10 dice, 1000 sides)
- `!8ball <question>` – magic 8-ball
- `!server` – server name and member count
- `!joke` – random joke
- `!flip` – coin flip
- `!pick a b c` – pick random option
- `!userinfo [@user]` – user details
- `!botinfo` – bot stats
- `!avatar [@user]` – user avatar
- `!warn @user [reason]` – warn user (mod only)
- `!warnings [@user]` – check warnings
- `!kick @user [reason]` – kick user (mod only)
- `!ban @user [reason]` – ban user (mod only)
- `!rank [@user]` – level/rank info
- `!leaderboard` – top users by XP
- `!stats` – usage analytics
- `!cc add/delete/list` – custom commands
- `!automod status/toggle` – automod control

### Slash Commands
- `/ping`, `/help`, `/uptime`, `/roll`, `/eightball`, `/server`
- `/joke`, `/flip`, `/pick`, `/userinfo`, `/botinfo`, `/avatar`
- `/warn`, `/warnings`, `/kick`, `/ban`, `/welcome`
- (Slash variants for levels, custom commands, and automod coming soon)

## Database
- **bot.db** (Main database):
  - `warnings` – User warnings per guild
  - `mod_logs` – Kick/ban/warn history
  - `guild_config` – Prefix, welcome channel, settings
  - `role_reactions` – Emoji role assignments (future)
  
- **levels.db** (Level & XP system):
  - `user_levels` – XP, level, and rank data per guild/user
  
- **custom_commands.db** (Guild-specific commands):
  - `custom_commands` – User-created commands per guild
  
- **analytics.db** (Usage tracking):
  - `command_usage` – All commands run with timestamps
  - `error_logs` – Command failures and exceptions

All use SQLite with WAL mode for optimal concurrency.

## Advanced Features

### Level System
- **XP Formula**: Each message = +10 XP (with 60-second cooldown)
- **Level Calculation**: `level = floor(sqrt(xp / 100))`
  - Level 1: 100 XP
  - Level 2: 400 XP
  - Level 3: 900 XP
  - Level 10: 10,000 XP
- **Leaderboard**: Track top 10 users per server
- **Rank Display**: Shows level, XP, server rank, and XP for next level

### Automod System
Configurable per-guild with these filters:
- **Spam Detection** (default: 5 messages per 5 seconds)
- **Caps Filter** (default: trigger at 70% caps)
- **Link Filter** (optional, blocks URLs except for moderators)
- **Bad Words** (custom list per guild)
- All violations logged to mod_logs for review

### Custom Commands
- Create unlimited guild-specific commands
- Track usage statistics per command
- Only moderators can manage (add/delete)
- Anyone can use custom commands

### Analytics & Monitoring
- **Command Tracking**: Every command recorded with timestamp, user, guild
- **Usage Stats**: View top commands, active users, total usage (7-day rolling)
- **Error Logging**: All errors captured to separate error log
- Two separate databases prevent analytics from affecting bot performance

### Testing
- **Unit Tests**: 21 tests covering levels, automod, rate limiting
- **Run Tests**: `npm test` or `npm run test:watch`
- **Coverage**: `npm run test:coverage` for detailed coverage report

## Production Features
- **Error Handling**: Comprehensive try-catch blocks on all commands and database operations
- **Rate Limiting**: 5 commands per 10 seconds per user to prevent spam/abuse
- **Logging**: Winston file logging (`logs/error.log`, `logs/combined.log`) with structured JSON
- **Permission Validation**: Bot checks its own permissions before attempting moderation actions
- **Process Handlers**: Catches unhandled rejections and uncaught exceptions

## Deployment

### Environment Variables
Required:

Optional:
 - `DATABASE_URL`: Postgres connection string (required for persistence)
 - `PGSSL` (optional): Set to `true` if your Postgres host requires SSL without CA (common on hosted providers)

### Hosting Options
- **Railway**: Node.js support, automatic deployments from GitHub
- **Heroku**: Free tier available, easy setup with Heroku CLI
- **VPS**: Full control, recommended for larger bots (DigitalOcean, Linode, etc.)
- **Dedicated Server**: Best for high-traffic production bots

### Security Best Practices
- Never commit `.env` file (already in `.gitignore`)
- Regularly rotate bot token if exposed
- Use environment secrets in hosting platform (don't hardcode credentials)
- Keep dependencies updated (`npm audit`, `npm update`)

### Database Backups
- **bot.db** contains all warnings, mod logs, and guild configs
- Recommended: Daily automated backups to external storage
- SQLite uses WAL mode for better concurrency
- Backup strategy: `cp bot.db bot.db.backup` or use hosting platform snapshots

### Monitoring & Maintenance
- Check `logs/error.log` for errors and exceptions
- Monitor `logs/combined.log` for activity patterns
- Set up log rotation to prevent disk space issues
- Consider uptime monitoring (UptimeRobot, BetterStack)

### Rate Limiting Customization
Edit `src/rateLimit.ts`:
- `MAX_REQUESTS`: Commands allowed per window (default: 5)
- `TIME_WINDOW`: Time window in milliseconds (default: 10000 = 10 seconds)

### Permission Requirements
Bot needs these Discord permissions:
- `Send Messages`, `Embed Links` – Basic functionality
- `Kick Members`, `Ban Members` – Moderation commands
- `Manage Roles` – Future role reaction features
- `Read Message History` – Context for commands

## Notes
- Make sure the bot is added to your server with the proper intents. Enable the Message Content intent in the Discord Developer Portal for replies to work.
- Slash commands are registered globally on startup when `DISCORD_CLIENT_ID` is set; global deploys can take up to 1 hour to propagate.
- Moderation commands require `MODERATE_MEMBERS` or `ADMINISTRATOR` perms.
- Bot validates its own permissions before attempting kick/ban actions
