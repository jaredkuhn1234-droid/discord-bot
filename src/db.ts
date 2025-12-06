import { query } from './dbClient.js';

export const initDb = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      issued_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mod_logs (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      welcome_channel_id TEXT,
      welcome_message TEXT,
      role_message_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS role_reactions (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL
    );
  `);
};

export const addWarning = async (guildId: string, userId: string, reason: string) => {
  await query('INSERT INTO warnings (guild_id, user_id, reason) VALUES ($1, $2, $3)', [guildId, userId, reason]);
};

export const getWarnings = async (guildId: string, userId: string) => {
  const { rows } = await query('SELECT * FROM warnings WHERE guild_id = $1 AND user_id = $2 ORDER BY issued_at DESC', [
    guildId,
    userId
  ]);
  return rows as unknown[];
};

export const logModAction = async (
  guildId: string,
  action: string,
  userId: string,
  moderatorId: string,
  reason: string
) => {
  await query('INSERT INTO mod_logs (guild_id, action, user_id, moderator_id, reason) VALUES ($1, $2, $3, $4, $5)', [
    guildId,
    action,
    userId,
    moderatorId,
    reason
  ]);
};

export interface GuildConfig {
  guild_id: string;
  prefix?: string;
  welcome_channel_id?: string;
  welcome_message?: string;
  role_message_id?: string;
}

export const getGuildConfig = async (guildId: string) => {
  const { rows } = await query<GuildConfig>('SELECT * FROM guild_config WHERE guild_id = $1', [guildId]);
  return rows[0];
};

export const setGuildConfig = async (guildId: string, config: Partial<Omit<GuildConfig, 'guild_id'>>) => {
  const keys = Object.keys(config) as (keyof Omit<GuildConfig, 'guild_id'>)[];
  if (keys.length === 0) return;

  const columns = keys.map((k, idx) => `${k} = $${idx + 2}`).join(', ');
  const insertColumns = ['guild_id', ...keys];
  const insertPlaceholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');

  const values = [guildId, ...keys.map((k) => config[k])];

  await query(
    `INSERT INTO guild_config (${insertColumns.join(', ')}) VALUES (${insertPlaceholders})
     ON CONFLICT (guild_id) DO UPDATE SET ${columns}`,
    values
  );
};

export const addRoleReaction = async (guildId: string, messageId: string, emoji: string, roleId: string) => {
  await query('INSERT INTO role_reactions (guild_id, message_id, emoji, role_id) VALUES ($1, $2, $3, $4)', [
    guildId,
    messageId,
    emoji,
    roleId
  ]);
};

export const getRoleReactions = async (guildId: string, messageId: string) => {
  const { rows } = await query('SELECT * FROM role_reactions WHERE guild_id = $1 AND message_id = $2', [
    guildId,
    messageId
  ]);
  return rows as unknown[];
};
