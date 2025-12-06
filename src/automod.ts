// Automod system with spam, caps, and link filtering
import { Message } from 'discord.js';
import { logModAction } from './db.js';
import { logger } from './logger.js';

interface AutomodConfig {
  enabled: boolean;
  spamThreshold: number; // messages per 5 seconds
  capsThreshold: number; // percentage of caps to trigger (0-100)
  linkFilter: boolean;
  badWords: string[];
}

// Track message counts per user for spam detection
const messageTracker = new Map<string, number[]>();

// Default config
const defaultConfig: AutomodConfig = {
  enabled: true,
  spamThreshold: 5,
  capsThreshold: 70,
  linkFilter: false,
  badWords: []
};

// Per-guild configs (in production, load from database)
const guildConfigs = new Map<string, AutomodConfig>();

export const getAutomodConfig = (guildId: string): AutomodConfig => {
  return guildConfigs.get(guildId) || defaultConfig;
};

export const setAutomodConfig = (guildId: string, config: Partial<AutomodConfig>) => {
  const current = getAutomodConfig(guildId);
  guildConfigs.set(guildId, { ...current, ...config });
};

export const checkAutomod = async (message: Message): Promise<boolean> => {
  if (!message.guild || message.author.bot) return false;
  
  const config = getAutomodConfig(message.guild.id);
  if (!config.enabled) return false;

  const key = `${message.guild.id}-${message.author.id}`;
  
  try {
    // Spam detection
    if (config.spamThreshold > 0) {
      const now = Date.now();
      const timestamps = messageTracker.get(key) || [];
      const recent = timestamps.filter(t => now - t < 5000);
      recent.push(now);
      messageTracker.set(key, recent);

      if (recent.length >= config.spamThreshold) {
        await message.delete().catch(() => undefined);
        if (message.channel.isTextBased() && 'send' in message.channel) {
          await message.channel.send(`${message.author}, please slow down! (Spam detected)`).then((m: Message) => {
            setTimeout(() => m.delete().catch(() => undefined), 3000);
          });
        }
        
        logModAction(
          message.guild.id,
          'automod_spam',
          message.author.id,
          message.client.user?.id || 'system',
          'Spam detection triggered'
        );
        
        logger.info(`Automod: Spam detected from ${message.author.tag} in ${message.guild.name}`);
        return true;
      }
    }

    // Caps detection
    if (config.capsThreshold > 0 && message.content.length > 10) {
      const capsCount = (message.content.match(/[A-Z]/g) || []).length;
      const letterCount = (message.content.match(/[A-Za-z]/g) || []).length;
      const capsPercentage = letterCount > 0 ? (capsCount / letterCount) * 100 : 0;

      if (capsPercentage >= config.capsThreshold) {
        await message.delete().catch(() => undefined);
        if (message.channel.isTextBased() && 'send' in message.channel) {
          await message.channel.send(`${message.author}, please don't use excessive caps!`).then((m: Message) => {
            setTimeout(() => m.delete().catch(() => undefined), 3000);
          });
        }
        
        logModAction(
          message.guild.id,
          'automod_caps',
          message.author.id,
          message.client.user?.id || 'system',
          'Excessive caps'
        );
        
        return true;
      }
    }

    // Link filter
    if (config.linkFilter) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      if (urlRegex.test(message.content)) {
        // Check if user has permission to post links (e.g., moderator)
        const member = message.member;
        if (!member?.permissions.has('ModerateMembers')) {
          await message.delete().catch(() => undefined);
          if (message.channel.isTextBased() && 'send' in message.channel) {
            await message.channel.send(`${message.author}, links are not allowed in this server!`).then((m: Message) => {
              setTimeout(() => m.delete().catch(() => undefined), 3000);
            });
          }
          
          logModAction(
            message.guild.id,
            'automod_link',
            message.author.id,
            message.client.user?.id || 'system',
            'Unauthorized link posted'
          );
          
          return true;
        }
      }
    }

    // Bad word filter
    if (config.badWords.length > 0) {
      const lowerContent = message.content.toLowerCase();
      for (const word of config.badWords) {
        if (lowerContent.includes(word.toLowerCase())) {
          await message.delete().catch(() => undefined);
          if (message.channel.isTextBased() && 'send' in message.channel) {
            await message.channel.send(`${message.author}, please watch your language!`).then((m: Message) => {
              setTimeout(() => m.delete().catch(() => undefined), 3000);
            });
          }
          
          logModAction(
            message.guild.id,
            'automod_badword',
            message.author.id,
            message.client.user?.id || 'system',
            'Inappropriate language'
          );
          
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    logger.error('Automod check failed', err);
    return false;
  }
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of messageTracker.entries()) {
    const recent = timestamps.filter(t => now - t < 5000);
    if (recent.length === 0) {
      messageTracker.delete(key);
    } else {
      messageTracker.set(key, recent);
    }
  }
}, 10000);
