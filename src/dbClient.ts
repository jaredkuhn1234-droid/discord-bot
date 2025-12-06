import { Pool, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please configure a Postgres connection string.');
}

const useSsl = process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number | null }> => {
  return pool.query<T>(text, params);
};
