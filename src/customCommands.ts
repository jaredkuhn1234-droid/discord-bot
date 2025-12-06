// Custom command manager (Postgres)
import { query } from './dbClient.js';

export interface CustomCommand {
  id?: number;
  guild_id: string;
  name: string;
  response: string;
  creator_id: string;
  uses: number;
  created_at?: string;
}

export const initCustomCommands = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS custom_commands (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      response TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      uses INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(guild_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
  `);
};

export const addCustomCommand = async (guildId: string, name: string, response: string, creatorId: string): Promise<boolean> => {
  try {
    await query('INSERT INTO custom_commands (guild_id, name, response, creator_id) VALUES ($1, $2, $3, $4)', [
      guildId,
      name.toLowerCase(),
      response,
      creatorId
    ]);
    return true;
  } catch {
    return false; // Likely duplicate name
  }
};

export const getCustomCommand = async (guildId: string, name: string): Promise<CustomCommand | undefined> => {
  const { rows } = await query<CustomCommand>('SELECT * FROM custom_commands WHERE guild_id = $1 AND name = $2', [
    guildId,
    name.toLowerCase()
  ]);
  return rows[0];
};

export const deleteCustomCommand = async (guildId: string, name: string): Promise<boolean> => {
  const result = await query('DELETE FROM custom_commands WHERE guild_id = $1 AND name = $2', [
    guildId,
    name.toLowerCase()
  ]);
  return result.rowCount ? result.rowCount > 0 : false;
};

export const listCustomCommands = async (guildId: string): Promise<CustomCommand[]> => {
  const { rows } = await query<CustomCommand>(
    'SELECT * FROM custom_commands WHERE guild_id = $1 ORDER BY uses DESC, name ASC',
    [guildId]
  );
  return rows;
};

export const incrementCommandUse = async (guildId: string, name: string) => {
  await query('UPDATE custom_commands SET uses = uses + 1 WHERE guild_id = $1 AND name = $2', [
    guildId,
    name.toLowerCase()
  ]);
};

export const getCommandStats = async (guildId: string) => {
  const { rows } = await query<{ total: number; total_uses: number }>(
    'SELECT COUNT(*) as total, COALESCE(SUM(uses),0) as total_uses FROM custom_commands WHERE guild_id = $1',
    [guildId]
  );
  const row = rows[0];
  return row ? { total: Number(row.total), total_uses: Number(row.total_uses) } : undefined;
};
