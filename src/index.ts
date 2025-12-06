import dotenv from 'dotenv';
import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  REST,
  Routes,
  EmbedBuilder,
  GuildMember,
  PermissionsBitField,
  TextChannel
} from 'discord.js';
import { initDb, getGuildConfig, setGuildConfig, addWarning, getWarnings, logModAction } from './db.js';
import { logger } from './logger.js';
import { checkRateLimit } from './rateLimit.js';
import { initAnalytics, trackCommand, trackError, getCommandStats, getActiveUsers, getTotalUsage } from './analytics.js';
import { checkAutomod, getAutomodConfig, setAutomodConfig } from './automod.js';
import { initLevels, addXP, getUserLevel, getLeaderboard, getUserRank, xpForNextLevel } from './levels.js';
import { initCustomCommands, addCustomCommand, getCustomCommand, deleteCustomCommand, listCustomCommands, incrementCommandUse } from './customCommands.js';

dotenv.config();

try {
  await initDb();
  await initAnalytics();
  await initLevels();
  await initCustomCommands();
  logger.info('All databases initialized successfully');
} catch (err) {
  logger.error('Failed to initialize databases', err);
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const defaultPrefix = process.env.COMMAND_PREFIX || '!';

if (!token) {
  logger.error('Missing DISCORD_TOKEN in environment variables');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const startedAt = Date.now();

const eightBallResponses = [
  'It is certain.',
  'Without a doubt.',
  'You may rely on it.',
  'Most likely.',
  'Outlook good.',
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  "Don't count on it.",
  'My reply is no.',
  'Very doubtful.'
];

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  'Why did the scarecrow win an award? He was outstanding in his field!',
  'What did the ocean say to the beach? Nothing, it just waved.',
  "Why don't eggs tell jokes? They'd crack each other up.",
  'What do you call a fake noodle? An impasta!'
];

const formatUptime = () => {
  const diff = Date.now() - startedAt;
  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h ${minutes}m ${seconds}s`;
};

const parseRoll = (raw: string) => {
  const match = raw.match(/^(\d+)?d(\d+)$/i);
  const count = Math.min(Number(match?.[1] || 1), 10);
  const sides = Number(match?.[2] || 20);
  if (!match || count < 1 || sides < 2 || sides > 1000) {
    return null;
  }
  const rolls: number[] = [];
  for (let i = 0; i < count; i += 1) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return { raw, rolls, total: rolls.reduce((sum, n) => sum + n, 0) };
};

const getPrefix = async (guildId?: string) => {
  if (!guildId) return defaultPrefix;
  try {
    const config = await getGuildConfig(guildId);
    return (config?.prefix as string) || defaultPrefix;
  } catch (err) {
    logger.error(`Failed to get prefix for guild ${guildId}`, err);
    return defaultPrefix;
  }
};

const isModerator = (member: GuildMember | null) => {
  if (!member) return false;
  return (
    member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
};

const botHasPermission = (member: GuildMember | null, permission: bigint): boolean => {
  if (!member) return false;
  return member.permissions.has(permission);
};

const registerSlashCommands = async () => {
  if (!clientId) {
    logger.warn('DISCORD_CLIENT_ID missing; slash commands not registered');
    return;
  }

  const commands = [
    { name: 'ping', description: 'Reply with Pong!' },
    { name: 'help', description: 'List available commands' },
    { name: 'uptime', description: 'Show bot uptime' },
    {
      name: 'roll',
      description: 'Roll dice (e.g. 1d20)',
      options: [{ name: 'dice', description: 'Dice notation like 1d20', type: 3, required: false }]
    },
    {
      name: 'eightball',
      description: 'Ask the magic 8-ball',
      options: [{ name: 'question', description: 'Your question', type: 3, required: true }]
    },
    { name: 'server', description: 'Show server info (guild only)' },
    { name: 'joke', description: 'Get a random joke' },
    { name: 'flip', description: 'Flip a coin' },
    {
      name: 'pick',
      description: 'Pick from options',
      options: [{ name: 'options', description: 'Comma-separated options', type: 3, required: true }]
    },
    {
      name: 'userinfo',
      description: 'Get user info',
      options: [{ name: 'user', description: 'User to lookup', type: 6, required: false }]
    },
    { name: 'botinfo', description: 'Get bot info' },
    {
      name: 'avatar',
      description: "Get a user's avatar",
      options: [{ name: 'user', description: 'User to lookup', type: 6, required: false }]
    },
    {
      name: 'warn',
      description: 'Warn a user',
      options: [
        { name: 'user', description: 'User to warn', type: 6, required: true },
        { name: 'reason', description: 'Reason for warning', type: 3, required: false }
      ]
    },
    {
      name: 'warnings',
      description: 'Check user warnings',
      options: [{ name: 'user', description: 'User to check', type: 6, required: false }]
    },
    {
      name: 'kick',
      description: 'Kick a user',
      options: [
        { name: 'user', description: 'User to kick', type: 6, required: true },
        { name: 'reason', description: 'Reason for kick', type: 3, required: false }
      ]
    },
    {
      name: 'ban',
      description: 'Ban a user',
      options: [
        { name: 'user', description: 'User to ban', type: 6, required: true },
        { name: 'reason', description: 'Reason for ban', type: 3, required: false }
      ]
    },
    {
      name: 'welcome',
      description: 'Set welcome message channel',
      options: [{ name: 'channel', description: 'Channel for welcome messages', type: 7, required: true }]
    }
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info(`Slash commands registered to guild ${guildId} (instant)`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info('Slash commands registered globally (may take up to 1 hour)');
    }
  } catch (err) {
    logger.error('Failed to register slash commands', err);
  }
};

const handleMessageCommand = async (msg: Message, prefix: string) => {
  const content = msg.content.trim();
  if (!content.startsWith(prefix)) return false;

  // Rate limit check
  if (!checkRateLimit(msg.author.id)) {
    await msg.reply('You are being rate limited. Please slow down!').catch(() => undefined);
    return true;
  }

  const withoutPrefix = content.slice(prefix.length);
  const args = withoutPrefix.split(/\s+/);
  const cmd = args[0]?.toLowerCase();
  if (!cmd) return false;

  try {
    switch (cmd) {
      case 'ping':
        await msg.reply('Pong!');
        return true;
      case 'help': {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📚 Bot Commands')
          .setDescription(`Use \`${prefix}\` prefix for commands or use slash commands (/)`)
          .addFields(
            {
              name: '🔧 Utility',
              value: `\`ping\` - Check bot latency\n\`help\` - Show this menu\n\`uptime\` - Bot uptime\n\`server\` - Server info`,
              inline: true
            },
            {
              name: '🎮 Fun & Games',
              value: `\`roll 1d20\` - Roll dice\n\`8ball <q>\` - Magic 8-ball\n\`joke\` - Random joke\n\`flip\` - Coin flip\n\`pick a b c\` - Pick random`,
              inline: true
            },
            {
              name: '📊 Info',
              value: `\`userinfo [@user]\` - User details\n\`botinfo\` - Bot stats\n\`avatar [@user]\` - User avatar`,
              inline: true
            },
            {
              name: '⚡ Levels & XP',
              value: `\`rank [@user]\` - Check rank\n\`leaderboard\` - Top users\n\`level [@user]\` - Level info`,
              inline: true
            },
            {
              name: '🛡️ Moderation',
              value: `\`warn @user\` - Warn user\n\`warnings [@user]\` - Check warns\n\`kick @user\` - Kick member\n\`ban @user\` - Ban member`,
              inline: true
            },
            {
              name: '⚙️ Custom Commands',
              value: `\`cc add <name> <text>\` - Add command\n\`cc delete <name>\` - Remove command\n\`cc list\` - Show all custom`,
              inline: true
            },
            {
              name: '📈 Analytics',
              value: `\`stats\` - Bot usage stats`,
              inline: true
            },
            {
              name: '🚫 Automod',
              value: `\`automod status\` - Check settings\n\`automod toggle\` - Enable/disable`,
              inline: true
            }
          )
          .setFooter({ text: `Use ${prefix}command or /command` });
        await msg.reply({ embeds: [embed] });
        return true;
      }
      case 'uptime':
        await msg.reply(`Uptime: ${formatUptime()}`);
        return true;
      case 'roll': {
        const dice = args[1] || '1d20';
        const result = parseRoll(dice);
        if (!result) {
          await msg.reply('Use format `1d20` (max 10 dice, 1000 sides).');
          return true;
        }
        await msg.reply(`Rolled ${result.raw}: [${result.rolls.join(', ')}] (total ${result.total})`);
        return true;
      }
      case '8ball': {
        const question = withoutPrefix.slice(cmd.length).trim();
        if (!question) {
          await msg.reply('Ask a question!');
          return true;
        }
        const choice = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
        await msg.reply(choice);
        return true;
      }
      case 'server':
        await msg.reply(`Server: ${msg.guild?.name || 'N/A'} | Members: ${msg.guild?.memberCount || 'N/A'}`);
        return true;
      case 'joke':
        await msg.reply(jokes[Math.floor(Math.random() * jokes.length)]);
        return true;
      case 'flip':
        await msg.reply(Math.random() > 0.5 ? 'Heads!' : 'Tails!');
        return true;
      case 'pick': {
        const options = withoutPrefix.slice(cmd.length).trim().split(/\s+/);
        if (options.length < 2) {
          await msg.reply('Provide at least 2 options.');
          return true;
        }
        await msg.reply(`I pick: **${options[Math.floor(Math.random() * options.length)]}**`);
        return true;
      }
      case 'userinfo': {
        const user = msg.mentions.users.first() || msg.author;
        const embed = new EmbedBuilder()
          .setTitle(`User Info: ${user.username}`)
          .setDescription(`ID: ${user.id}`)
          .addFields(
            { name: 'Created', value: user.createdAt.toDateString(), inline: true },
            { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }
          )
          .setThumbnail(user.displayAvatarURL());
        await msg.reply({ embeds: [embed] });
        return true;
      }
      case 'botinfo': {
        const embed = new EmbedBuilder()
          .setTitle('Bot Info')
          .addFields(
            { name: 'Uptime', value: formatUptime(), inline: true },
            { name: 'Guilds', value: String(client.guilds.cache.size), inline: true }
          );
        await msg.reply({ embeds: [embed] });
        return true;
      }
      case 'avatar': {
        const user = msg.mentions.users.first() || msg.author;
        await msg.reply(user.displayAvatarURL({ size: 1024 }));
        return true;
      }
      case 'warn': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        if (!isModerator(msg.member as GuildMember)) {
          await msg.reply('You need moderator permissions.');
          return true;
        }
        const user = msg.mentions.users.first();
        if (!user) {
          await msg.reply('Mention a user to warn.');
          return true;
        }
        const reason = args.slice(2).join(' ') || 'No reason';
        try {
          await addWarning(msg.guild.id, user.id, reason);
          await logModAction(msg.guild.id, 'warn', user.id, msg.author.id, reason);
          await msg.reply(`Warned ${user.username}: ${reason}`);
          logger.info(`User ${user.id} warned in guild ${msg.guild.id} by ${msg.author.id}`);
        } catch (err) {
          logger.error('Failed to warn user', err);
          await msg.reply('Failed to warn user. Please try again.');
        }
        return true;
      }
      case 'warnings': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        const user = msg.mentions.users.first() || msg.author;
        try {
          const warns = (await getWarnings(msg.guild.id, user.id)) as Array<Record<string, unknown>>;
          await msg.reply(`${user.username} has ${warns.length} warning(s).`);
        } catch (err) {
          logger.error('Failed to fetch warnings', err);
          await msg.reply('Failed to fetch warnings.');
        }
        return true;
      }
      case 'kick': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        if (!isModerator(msg.member as GuildMember)) {
          await msg.reply('You need moderator permissions.');
          return true;
        }
        const botMember = msg.guild.members.cache.get(client.user!.id);
        if (!botHasPermission(botMember || null, PermissionsBitField.Flags.KickMembers)) {
          await msg.reply('I need KICK_MEMBERS permission.');
          return true;
        }
        const user = msg.mentions.users.first();
        if (!user) {
          await msg.reply('Mention a user to kick.');
          return true;
        }
        const reason = args.slice(2).join(' ') || 'No reason';
        try {
          const member = await msg.guild.members.fetch(user.id);
          await member.kick(reason);
          logModAction(msg.guild.id, 'kick', user.id, msg.author.id, reason);
          await msg.reply(`Kicked ${user.username}: ${reason}`);
          logger.info(`User ${user.id} kicked from guild ${msg.guild.id} by ${msg.author.id}`);
        } catch (err) {
          logger.error('Failed to kick user', err);
          await msg.reply(`Failed to kick: ${err instanceof Error ? err.message : String(err)}`);
        }
        return true;
      }
      case 'ban': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        if (!isModerator(msg.member as GuildMember)) {
          await msg.reply('You need moderator permissions.');
          return true;
        }
        const botMember = msg.guild.members.cache.get(client.user!.id);
        if (!botHasPermission(botMember || null, PermissionsBitField.Flags.BanMembers)) {
          await msg.reply('I need BAN_MEMBERS permission.');
          return true;
        }
        const user = msg.mentions.users.first();
        if (!user) {
          await msg.reply('Mention a user to ban.');
          return true;
        }
        const reason = args.slice(2).join(' ') || 'No reason';
        try {
          await msg.guild.bans.create(user.id, { reason });
          logModAction(msg.guild.id, 'ban', user.id, msg.author.id, reason);
          await msg.reply(`Banned ${user.username}: ${reason}`);
          logger.info(`User ${user.id} banned from guild ${msg.guild.id} by ${msg.author.id}`);
        } catch (err) {
          logger.error('Failed to ban user', err);
          await msg.reply(`Failed to ban: ${err instanceof Error ? err.message : String(err)}`);
        }
        return true;
      }
      case 'rank': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        const user = msg.mentions.users.first() || msg.author;
        try {
          const userLevel = await getUserLevel(msg.guild.id, user.id);
          if (!userLevel) {
            await msg.reply(`${user.username} has no level data yet. Keep chatting!`);
            return true;
          }
          const rank = await getUserRank(msg.guild.id, user.id);
          const nextLevelXp = xpForNextLevel(userLevel.level);
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`${user.username}'s Rank`)
            .addFields(
              { name: 'Level', value: String(userLevel.level), inline: true },
              { name: 'XP', value: String(userLevel.xp), inline: true },
              { name: 'Server Rank', value: `#${rank}`, inline: true },
              { name: 'XP for Next Level', value: String(nextLevelXp), inline: true }
            )
            .setThumbnail(user.displayAvatarURL());
          await msg.reply({ embeds: [embed] });
        } catch (err) {
          logger.error('Failed to fetch rank', err);
          await msg.reply('Failed to fetch rank.');
        }
        return true;
      }
      case 'leaderboard': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        try {
          const leaders = await getLeaderboard(msg.guild.id, 10);
          if (leaders.length === 0) {
            await msg.reply('No users have levels yet!');
            return true;
          }
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🏆 Leaderboard')
            .setDescription(
              leaders
                .map((l, i) => `${i + 1}. <@${l.user_id}> - Level ${l.level} (${l.xp} XP)`)
                .join('\n')
            );
          await msg.reply({ embeds: [embed] });
        } catch (err) {
          logger.error('Failed to fetch leaderboard', err);
          await msg.reply('Failed to fetch leaderboard.');
        }
        return true;
      }
      case 'stats': {
        try {
          const totalUsage = await getTotalUsage(7);
          const activeUsers = await getActiveUsers(7);
          const cmdStats = (await getCommandStats(7)) as Array<{ command: string; count: number }>;
          const topCommands = cmdStats.slice(0, 5);
          
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('📊 Bot Analytics (7 days)')
            .addFields(
              { name: 'Total Commands', value: String(totalUsage.total), inline: true },
              { name: 'Active Users', value: String(activeUsers.count), inline: true },
              { name: 'Top Commands', value: topCommands.map(c => `\`${c.command}\`: ${c.count}`).join('\n') || 'No data' }
            );
          await msg.reply({ embeds: [embed] });
        } catch (err) {
          logger.error('Failed to fetch stats', err);
          await msg.reply('Failed to fetch stats.');
        }
        return true;
      }
      case 'cc': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        const subCmd = args[1]?.toLowerCase();
        if (subCmd === 'add') {
          const name = args[2]?.toLowerCase();
          const response = args.slice(3).join(' ');
          if (!name || !response) {
            await msg.reply(`Usage: \`${prefix}cc add <name> <response>\``);
            return true;
          }
          try {
            const success = await addCustomCommand(msg.guild.id, name, response, msg.author.id);
            if (success) {
              await msg.reply(`✅ Custom command \`${name}\` created!`);
              logger.info(`Custom command '${name}' created in guild ${msg.guild.id}`);
            } else {
              await msg.reply(`❌ Command \`${name}\` already exists!`);
            }
          } catch (err) {
            logger.error('Failed to add custom command', err);
            await msg.reply('Failed to add command.');
          }
          return true;
        }
        if (subCmd === 'delete') {
          const name = args[2]?.toLowerCase();
          if (!name) {
            await msg.reply(`Usage: \`${prefix}cc delete <name>\``);
            return true;
          }
          try {
            const success = await deleteCustomCommand(msg.guild.id, name);
            if (success) {
              await msg.reply(`✅ Custom command \`${name}\` deleted!`);
            } else {
              await msg.reply(`❌ Command \`${name}\` not found!`);
            }
          } catch (err) {
            logger.error('Failed to delete custom command', err);
            await msg.reply('Failed to delete command.');
          }
          return true;
        }
        if (subCmd === 'list') {
          try {
            const commands = await listCustomCommands(msg.guild.id);
            if (commands.length === 0) {
              await msg.reply('No custom commands yet!');
              return true;
            }
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('Custom Commands')
              .setDescription(
                commands
                  .map(c => `\`${c.name}\` (${c.uses} uses) - by <@${c.creator_id}>`)
                  .join('\n')
              );
            await msg.reply({ embeds: [embed] });
          } catch (err) {
            logger.error('Failed to list custom commands', err);
            await msg.reply('Failed to fetch commands.');
          }
          return true;
        }
        return false;
      }
      case 'automod': {
        if (!msg.guild) {
          await msg.reply('This command only works in servers.');
          return true;
        }
        if (!isModerator(msg.member as GuildMember)) {
          await msg.reply('You need moderator permissions.');
          return true;
        }
        const subCmd = args[1]?.toLowerCase();
        if (subCmd === 'status') {
          const config = getAutomodConfig(msg.guild.id);
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('Automod Status')
            .addFields(
              { name: 'Enabled', value: config.enabled ? '✅' : '❌', inline: true },
              { name: 'Spam Threshold', value: `${config.spamThreshold}/5s`, inline: true },
              { name: 'Caps Threshold', value: `${config.capsThreshold}%`, inline: true },
              { name: 'Link Filter', value: config.linkFilter ? '✅' : '❌', inline: true }
            );
          await msg.reply({ embeds: [embed] });
          return true;
        }
        if (subCmd === 'toggle') {
          const config = getAutomodConfig(msg.guild.id);
          setAutomodConfig(msg.guild.id, { enabled: !config.enabled });
          await msg.reply(`Automod ${config.enabled ? '**disabled**' : '**enabled**'}!`);
          return true;
        }
        return false;
      }
      default:
        // Check for custom commands
        if (msg.guild) {
          try {
            const customCmd = await getCustomCommand(msg.guild.id, cmd);
            if (customCmd) {
              await msg.reply(customCmd.response);
              await incrementCommandUse(msg.guild.id, cmd);
              await trackCommand({
                command: cmd,
                userId: msg.author.id,
                guildId: msg.guild.id,
                timestamp: Date.now(),
                type: 'prefix'
              });
              return true;
            }
          } catch (err) {
            logger.error('Failed to fetch custom command', err);
          }
        }
        return false;
    }
  } catch (err) {
    logger.error(`Message command '${cmd}' failed`, err);
    await msg.reply('Something went wrong processing your command.').catch(() => undefined);
    return true;
  }
};

const handleSlashCommand = async (interaction: ChatInputCommandInteraction) => {
  // Rate limit check
  if (!checkRateLimit(interaction.user.id)) {
    await interaction
      .reply({ content: 'You are being rate limited. Please slow down!', ephemeral: true })
      .catch(() => undefined);
    return;
  }

  try {
    switch (interaction.commandName) {
      case 'ping':
        await interaction.reply('Pong!');
        break;
      case 'help':
        await interaction.reply(
          'All commands available via `/`. Try `/userinfo`, `/roll`, `/joke`, `/warn`, `/kick`, `/ban`, etc.'
        );
        break;
      case 'uptime':
        await interaction.reply(`Uptime: ${formatUptime()}`);
        break;
      case 'roll': {
        const dice = interaction.options.getString('dice') || '1d20';
        const result = parseRoll(dice);
        if (!result) {
          await interaction.reply({ content: 'Invalid format. Use 1d20 format.', ephemeral: true });
          break;
        }
        await interaction.reply(`Rolled ${result.raw}: [${result.rolls.join(', ')}] (total ${result.total})`);
        break;
      }
      case 'eightball': {
        interaction.options.getString('question'); // User question (for context)
        const choice = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
        await interaction.reply(choice);
        break;
      }
      case 'server':
        await interaction.reply(
          `Server: ${interaction.guild?.name || 'N/A'} | Members: ${interaction.guild?.memberCount || 'N/A'}`
        );
        break;
      case 'joke':
        await interaction.reply(jokes[Math.floor(Math.random() * jokes.length)]);
        break;
      case 'flip':
        await interaction.reply(Math.random() > 0.5 ? 'Heads!' : 'Tails!');
        break;
      case 'pick': {
        const opts = interaction.options.getString('options')?.split(',').map((o) => o.trim()) || [];
        if (opts.length < 2) {
          await interaction.reply({ content: 'Provide at least 2 options', ephemeral: true });
          break;
        }
        await interaction.reply(`I pick: **${opts[Math.floor(Math.random() * opts.length)]}**`);
        break;
      }
      case 'userinfo': {
        const user = interaction.options.getUser('user') || interaction.user;
        const embed = new EmbedBuilder()
          .setTitle(`User Info: ${user.username}`)
          .setDescription(`ID: ${user.id}`)
          .addFields(
            { name: 'Created', value: user.createdAt.toDateString(), inline: true },
            { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }
          )
          .setThumbnail(user.displayAvatarURL());
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'botinfo': {
        const embed = new EmbedBuilder()
          .setTitle('Bot Info')
          .addFields(
            { name: 'Uptime', value: formatUptime(), inline: true },
            { name: 'Guilds', value: String(client.guilds.cache.size), inline: true }
          );
        await interaction.reply({ embeds: [embed] });
        break;
      }
      case 'avatar': {
        const user = interaction.options.getUser('user') || interaction.user;
        await interaction.reply(user.displayAvatarURL({ size: 1024 }));
        break;
      }
      case 'warn': {
        if (!interaction.guild || !isModerator(interaction.member as GuildMember)) {
          await interaction.reply({ content: 'You need moderator permissions', ephemeral: true });
          break;
        }
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason';
        if (!user) {
          await interaction.reply({ content: 'User not found', ephemeral: true });
          break;
        }
        try {
          await addWarning(interaction.guild.id, user.id, reason);
          await logModAction(interaction.guild.id, 'warn', user.id, interaction.user.id, reason);
          await interaction.reply(`Warned ${user.username}: ${reason}`);
          logger.info(`User ${user.id} warned in guild ${interaction.guild.id} by ${interaction.user.id}`);
        } catch (err) {
          logger.error('Failed to warn user', err);
          await interaction.reply({ content: 'Failed to warn user.', ephemeral: true });
        }
        break;
      }
      case 'warnings': {
        if (!interaction.guild) {
          await interaction.reply({ content: 'This command only works in servers', ephemeral: true });
          break;
        }
        const user = interaction.options.getUser('user') || interaction.user;
        try {
          const warns = (await getWarnings(interaction.guild.id, user.id)) as Array<Record<string, unknown>>;
          await interaction.reply(`${user.username} has ${warns.length} warning(s).`);
        } catch (err) {
          logger.error('Failed to fetch warnings', err);
          await interaction.reply({ content: 'Failed to fetch warnings.', ephemeral: true });
        }
        break;
      }
      case 'kick': {
        if (!interaction.guild || !isModerator(interaction.member as GuildMember)) {
          await interaction.reply({ content: 'You need moderator permissions', ephemeral: true });
          break;
        }
        const botMember = interaction.guild.members.cache.get(client.user!.id);
        if (!botHasPermission(botMember || null, PermissionsBitField.Flags.KickMembers)) {
          await interaction.reply({ content: 'I need KICK_MEMBERS permission', ephemeral: true });
          break;
        }
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason';
        if (!user) {
          await interaction.reply({ content: 'User not found', ephemeral: true });
          break;
        }
        try {
          const member = await interaction.guild.members.fetch(user.id);
          await member.kick(reason);
          await logModAction(interaction.guild.id, 'kick', user.id, interaction.user.id, reason);
          await interaction.reply(`Kicked ${user.username}: ${reason}`);
          logger.info(`User ${user.id} kicked from guild ${interaction.guild.id} by ${interaction.user.id}`);
        } catch (err) {
          logger.error('Failed to kick user', err);
          await interaction.reply({
            content: `Failed to kick: ${err instanceof Error ? err.message : String(err)}`,
            ephemeral: true
          });
        }
        break;
      }
      case 'ban': {
        if (!interaction.guild || !isModerator(interaction.member as GuildMember)) {
          await interaction.reply({ content: 'You need moderator permissions', ephemeral: true });
          break;
        }
        const botMember = interaction.guild.members.cache.get(client.user!.id);
        if (!botHasPermission(botMember || null, PermissionsBitField.Flags.BanMembers)) {
          await interaction.reply({ content: 'I need BAN_MEMBERS permission', ephemeral: true });
          break;
        }
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason';
        if (!user) {
          await interaction.reply({ content: 'User not found', ephemeral: true });
          break;
        }
        try {
          await interaction.guild.bans.create(user.id, { reason });
          await logModAction(interaction.guild.id, 'ban', user.id, interaction.user.id, reason);
          await interaction.reply(`Banned ${user.username}: ${reason}`);
          logger.info(`User ${user.id} banned from guild ${interaction.guild.id} by ${interaction.user.id}`);
        } catch (err) {
          logger.error('Failed to ban user', err);
          await interaction.reply({
            content: `Failed to ban: ${err instanceof Error ? err.message : String(err)}`,
            ephemeral: true
          });
        }
        break;
      }
      case 'welcome': {
        if (!interaction.guild || !isModerator(interaction.member as GuildMember)) {
          await interaction.reply({ content: 'You need moderator permissions', ephemeral: true });
          break;
        }
        const channel = interaction.options.getChannel('channel');
        if (!channel || !(channel instanceof TextChannel)) {
          await interaction.reply({ content: 'Please select a valid text channel', ephemeral: true });
          break;
        }
        try {
          await setGuildConfig(interaction.guild.id, { welcome_channel_id: channel.id });
          await interaction.reply(`Welcome messages will post to ${channel}`);
          logger.info(`Welcome channel set to ${channel.id} in guild ${interaction.guild.id}`);
        } catch (err) {
          logger.error('Failed to set welcome channel', err);
          await interaction.reply({ content: 'Failed to set welcome channel.', ephemeral: true });
        }
        break;
      }
      default:
        await interaction.reply({ content: 'Command not implemented.', ephemeral: true });
    }
  } catch (err) {
    logger.error(`Slash command '${interaction.commandName}' failed`, err);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction
        .reply({ content: 'Something went wrong processing your command.', ephemeral: true })
        .catch(() => undefined);
    }
  }
};

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleSlashCommand(interaction);
    // Track analytics
    await trackCommand({
      command: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId || 'dm',
      timestamp: Date.now(),
      type: 'slash'
    });
    // Add XP for slash commands too
    if (interaction.guildId) {
      await addXP(interaction.guildId, interaction.user.id);
    }
  } catch (err) {
    logger.error('Slash command failed', err);
    await trackError({
      command: interaction.commandName,
      error: err instanceof Error ? err.message : String(err),
      userId: interaction.user.id,
      guildId: interaction.guildId || 'dm',
      timestamp: Date.now()
    });
  }
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !msg.guild) return;

  // Check automod
  await checkAutomod(msg);

  // Add XP
  const xpResult = await addXP(msg.guild.id, msg.author.id);
  if (xpResult?.levelUp) {
    await msg
      .reply(
        `🎉 **${msg.author.username}** reached level **${xpResult.newLevel}**! (${xpResult.xp} XP)`
      )
      .catch(() => undefined);
  }

  // Handle commands
  const prefix = await getPrefix(msg.guild.id);
  const handled = await handleMessageCommand(msg, prefix);
  
  // Track analytics
  if (handled) {
    const cmd = msg.content.split(/\s+/)[0].slice(prefix.length).toLowerCase();
    await trackCommand({
      command: cmd,
      userId: msg.author.id,
      guildId: msg.guild.id,
      timestamp: Date.now(),
      type: 'prefix'
    });
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!member.guild) return;
  try {
    const config = await getGuildConfig(member.guild.id);
    if (config?.welcome_channel_id) {
      const channel = member.guild.channels.cache.get(config.welcome_channel_id as string);
      if (channel?.isTextBased()) {
        const message = (config.welcome_message as string) || `Welcome ${member.user.username}!`;
        await channel.send(message);
        logger.info(`Welcome message sent for user ${member.id} in guild ${member.guild.id}`);
      }
    }
  } catch (err) {
    logger.error('Failed to send welcome message', err);
  }
});

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Logged in as ${readyClient.user.tag}`);
  await registerSlashCommands();
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Logging out...`);
  await client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

client.login(token).catch((error) => {
  logger.error('Failed to login', error);
  process.exit(1);
});
