// Analytics tracking for command usage and errors
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'analytics.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

interface CommandUsage {
  command: string;
  userId: string;
  guildId: string;
  timestamp: number;
  type: 'prefix' | 'slash';
}

interface ErrorLog {
  command: string;
  error: string;
  userId: string;
  guildId: string;
  timestamp: number;
}

export const initAnalytics = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS command_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      error TEXT NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command);
    CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
  `);
};

export const trackCommand = (usage: CommandUsage) => {
  try {
    const stmt = db.prepare(
      'INSERT INTO command_usage (command, user_id, guild_id, timestamp, type) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(usage.command, usage.userId, usage.guildId, usage.timestamp, usage.type);
  } catch (err) {
    console.error('Failed to track command:', err);
  }
};

export const trackError = (errorLog: ErrorLog) => {
  try {
    const stmt = db.prepare(
      'INSERT INTO error_logs (command, error, user_id, guild_id, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(errorLog.command, errorLog.error, errorLog.userId, errorLog.guildId, errorLog.timestamp);
  } catch (err) {
    console.error('Failed to track error:', err);
  }
};

export const getCommandStats = (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    SELECT command, COUNT(*) as count, type
    FROM command_usage
    WHERE timestamp > ?
    GROUP BY command, type
    ORDER BY count DESC
  `);
  return stmt.all(cutoff);
};

export const getErrorStats = (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    SELECT command, COUNT(*) as count
    FROM error_logs
    WHERE timestamp > ?
    GROUP BY command
    ORDER BY count DESC
  `);
  return stmt.all(cutoff);
};

export const getTotalUsage = (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM command_usage
    WHERE timestamp > ?
  `);
  return stmt.get(cutoff) as { total: number };
};

export const getActiveUsers = (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const stmt = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM command_usage
    WHERE timestamp > ?
  `);
  return stmt.get(cutoff) as { count: number };
};
