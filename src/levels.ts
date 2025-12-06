// Level and XP system
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'levels.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const XP_PER_MESSAGE = 10;
const XP_COOLDOWN = 60000; // 1 minute cooldown between XP gains

const xpCooldowns = new Map<string, number>();

export const initLevels = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      last_message DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON user_levels(guild_id, xp DESC);
  `);
};

export const addXP = (guildId: string, userId: string, amount: number = XP_PER_MESSAGE) => {
  const key = `${guildId}-${userId}`;
  const now = Date.now();
  const lastXP = xpCooldowns.get(key) || 0;

  if (now - lastXP < XP_COOLDOWN) {
    return null; // Still on cooldown
  }

  xpCooldowns.set(key, now);

  const stmt = db.prepare(`
    INSERT INTO user_levels (guild_id, user_id, xp, level, last_message)
    VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp = xp + ?,
      last_message = CURRENT_TIMESTAMP
  `);
  
  stmt.run(guildId, userId, amount, amount);

  // Get updated stats
  const user = getUserLevel(guildId, userId);
  if (user) {
    const newLevel = calculateLevel(user.xp);
    if (newLevel > user.level) {
      // Level up!
      const updateStmt = db.prepare('UPDATE user_levels SET level = ? WHERE guild_id = ? AND user_id = ?');
      updateStmt.run(newLevel, guildId, userId);
      return { levelUp: true, newLevel, xp: user.xp };
    }
  }

  return null;
};

export const getUserLevel = (guildId: string, userId: string) => {
  const stmt = db.prepare('SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?');
  return stmt.get(guildId, userId) as { guild_id: string; user_id: string; xp: number; level: number } | undefined;
};

export const getLeaderboard = (guildId: string, limit: number = 10) => {
  const stmt = db.prepare('SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?');
  return stmt.all(guildId, limit) as { guild_id: string; user_id: string; xp: number; level: number }[];
};

export const getUserRank = (guildId: string, userId: string): number => {
  const stmt = db.prepare(`
    SELECT COUNT(*) as rank FROM user_levels
    WHERE guild_id = ? AND xp > (
      SELECT xp FROM user_levels WHERE guild_id = ? AND user_id = ?
    )
  `);
  const result = stmt.get(guildId, guildId, userId) as { rank: number } | undefined;
  return (result?.rank || 0) + 1;
};

// Calculate level based on XP (formula: level = floor(sqrt(xp / 100)))
export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100));
};

// Calculate XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  return (currentLevel + 1) ** 2 * 100;
};
