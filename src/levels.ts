// Level and XP system using Postgres
import { query } from './dbClient.js';

const XP_PER_MESSAGE = 10;
const XP_COOLDOWN = 60000; // 1 minute cooldown between XP gains

const xpCooldowns = new Map<string, number>();

export const initLevels = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS user_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      last_message TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON user_levels(guild_id, xp DESC);
  `);
};

export const addXP = async (guildId: string, userId: string, amount: number = XP_PER_MESSAGE) => {
  const key = `${guildId}-${userId}`;
  const now = Date.now();
  const lastXP = xpCooldowns.get(key) || 0;

  if (now - lastXP < XP_COOLDOWN) {
    return null; // Still on cooldown
  }

  xpCooldowns.set(key, now);

  await query(
    `INSERT INTO user_levels (guild_id, user_id, xp, level, last_message)
     VALUES ($1, $2, $3, 0, NOW())
     ON CONFLICT(guild_id, user_id) DO UPDATE SET
       xp = user_levels.xp + EXCLUDED.xp,
       last_message = NOW()`,
    [guildId, userId, amount]
  );

  const user = await getUserLevel(guildId, userId);
  if (user) {
    const newLevel = calculateLevel(user.xp);
    if (newLevel > user.level) {
      await query('UPDATE user_levels SET level = $1 WHERE guild_id = $2 AND user_id = $3', [
        newLevel,
        guildId,
        userId
      ]);
      return { levelUp: true, newLevel, xp: user.xp };
    }
  }

  return null;
};

export const getUserLevel = async (guildId: string, userId: string) => {
  const { rows } = await query<{
    guild_id: string;
    user_id: string;
    xp: number;
    level: number;
  }>('SELECT * FROM user_levels WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return rows[0];
};

export const getLeaderboard = async (guildId: string, limit: number = 10) => {
  const { rows } = await query<{ guild_id: string; user_id: string; xp: number; level: number }>(
    'SELECT * FROM user_levels WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2',
    [guildId, limit]
  );
  return rows;
};

export const getUserRank = async (guildId: string, userId: string): Promise<number> => {
  const { rows } = await query<{ rank: number }>(
    `SELECT COUNT(*) as rank FROM user_levels
     WHERE guild_id = $1 AND xp > (
       SELECT xp FROM user_levels WHERE guild_id = $1 AND user_id = $2
     )`,
    [guildId, userId]
  );
  const rank = Number(rows[0]?.rank || 0);
  return rank + 1;
};

// Calculate level based on XP (formula: level = floor(sqrt(xp / 100)))
export const calculateLevel = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100));
};

// Calculate XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  return (currentLevel + 1) ** 2 * 100;
};
