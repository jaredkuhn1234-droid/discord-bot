import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'bot.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mod_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      welcome_channel_id TEXT,
      welcome_message TEXT,
      role_message_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL
    );
  `);
};

export const addWarning = (guildId: string, userId: string, reason: string) => {
  const stmt = db.prepare('INSERT INTO warnings (guild_id, user_id, reason) VALUES (?, ?, ?)');
  return stmt.run(guildId, userId, reason);
};

export const getWarnings = (guildId: string, userId: string) => {
  const stmt = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY issued_at DESC');
  return stmt.all(guildId, userId) as unknown[];
};

export const logModAction = (guildId: string, action: string, userId: string, moderatorId: string, reason: string) => {
  const stmt = db.prepare('INSERT INTO mod_logs (guild_id, action, user_id, moderator_id, reason) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(guildId, action, userId, moderatorId, reason);
};

export const getGuildConfig = (guildId: string) => {
  const stmt = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?');
  return stmt.get(guildId) as Record<string, unknown> | undefined;
};

export const setGuildConfig = (guildId: string, config: Record<string, unknown>) => {
  const current = getGuildConfig(guildId);
  if (current) {
    const updates = Object.entries(config)
      .map(([k]) => `${k} = ?`)
      .join(', ');
    const values = Object.values(config);
    const stmt = db.prepare(`UPDATE guild_config SET ${updates} WHERE guild_id = ?`);
    return stmt.run(...values, guildId);
  }
  const keys = Object.keys(config);
  const placeholders = keys.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO guild_config (guild_id, ${keys.join(', ')}) VALUES (?, ${placeholders})`);
  return stmt.run(guildId, ...Object.values(config));
};

export const addRoleReaction = (guildId: string, messageId: string, emoji: string, roleId: string) => {
  const stmt = db.prepare('INSERT INTO role_reactions (guild_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?)');
  return stmt.run(guildId, messageId, emoji, roleId);
};

export const getRoleReactions = (guildId: string, messageId: string) => {
  const stmt = db.prepare('SELECT * FROM role_reactions WHERE guild_id = ? AND message_id = ?');
  return stmt.all(guildId, messageId) as unknown[];
};
