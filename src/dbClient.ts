import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please configure a Postgres connection string.');
}

const useSsl = process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

export const query = async <T = unknown>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> => {
  return pool.query<T>(text, params);
};
