// Analytics tracking for command usage and errors (Postgres)
import { query } from './dbClient.js';

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

export const initAnalytics = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS command_usage (
      id SERIAL PRIMARY KEY,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id SERIAL PRIMARY KEY,
      command TEXT NOT NULL,
      error TEXT NOT NULL,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command);
    CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
  `);
};

export const trackCommand = async (usage: CommandUsage) => {
  try {
    await query(
      'INSERT INTO command_usage (command, user_id, guild_id, timestamp, type) VALUES ($1, $2, $3, $4, $5)',
      [usage.command, usage.userId, usage.guildId, usage.timestamp, usage.type]
    );
  } catch (err) {
    console.error('Failed to track command:', err);
  }
};

export const trackError = async (errorLog: ErrorLog) => {
  try {
    await query('INSERT INTO error_logs (command, error, user_id, guild_id, timestamp) VALUES ($1, $2, $3, $4, $5)', [
      errorLog.command,
      errorLog.error,
      errorLog.userId,
      errorLog.guildId,
      errorLog.timestamp
    ]);
  } catch (err) {
    console.error('Failed to track error:', err);
  }
};

export const getCommandStats = async (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const { rows } = await query(
    `SELECT command, COUNT(*) as count, type
     FROM command_usage
     WHERE timestamp > $1
     GROUP BY command, type
     ORDER BY count DESC`,
    [cutoff]
  );
  return rows;
};

export const getErrorStats = async (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const { rows } = await query(
    `SELECT command, COUNT(*) as count
     FROM error_logs
     WHERE timestamp > $1
     GROUP BY command
     ORDER BY count DESC`,
    [cutoff]
  );
  return rows;
};

export const getTotalUsage = async (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const { rows } = await query<{ total: number }>(
    `SELECT COUNT(*) as total
     FROM command_usage
     WHERE timestamp > $1`,
    [cutoff]
  );
  return { total: Number(rows[0]?.total || 0) };
};

export const getActiveUsers = async (days = 7) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const { rows } = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT user_id) as count
     FROM command_usage
     WHERE timestamp > $1`,
    [cutoff]
  );
  return { count: Number(rows[0]?.count || 0) };
};
