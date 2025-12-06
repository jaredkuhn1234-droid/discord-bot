// Custom command manager
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'custom_commands.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export interface CustomCommand {
  id?: number;
  guild_id: string;
  name: string;
  response: string;
  creator_id: string;
  uses: number;
  created_at?: string;
}

export const initCustomCommands = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      response TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      uses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
  `);
};

export const addCustomCommand = (guildId: string, name: string, response: string, creatorId: string): boolean => {
  try {
    const stmt = db.prepare('INSERT INTO custom_commands (guild_id, name, response, creator_id) VALUES (?, ?, ?, ?)');
    stmt.run(guildId, name.toLowerCase(), response, creatorId);
    return true;
  } catch {
    return false; // Likely duplicate name
  }
};

export const getCustomCommand = (guildId: string, name: string): CustomCommand | undefined => {
  const stmt = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?');
  return stmt.get(guildId, name.toLowerCase()) as CustomCommand | undefined;
};

export const deleteCustomCommand = (guildId: string, name: string): boolean => {
  const stmt = db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?');
  const result = stmt.run(guildId, name.toLowerCase());
  return result.changes > 0;
};

export const listCustomCommands = (guildId: string): CustomCommand[] => {
  const stmt = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY uses DESC, name ASC');
  return stmt.all(guildId) as CustomCommand[];
};

export const incrementCommandUse = (guildId: string, name: string) => {
  const stmt = db.prepare('UPDATE custom_commands SET uses = uses + 1 WHERE guild_id = ? AND name = ?');
  stmt.run(guildId, name.toLowerCase());
};

export const getCommandStats = (guildId: string) => {
  const stmt = db.prepare('SELECT COUNT(*) as total, SUM(uses) as total_uses FROM custom_commands WHERE guild_id = ?');
  return stmt.get(guildId) as { total: number; total_uses: number } | undefined;
};
