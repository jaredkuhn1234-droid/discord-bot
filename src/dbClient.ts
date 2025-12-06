import { Pool, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please configure a Postgres connection string.');
}

const useSsl = process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  // Cloud-optimized connection pool settings
  max: 10,                    // Max connections (Zeabur typically allows ~10-20)
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout if can't acquire connection in 5s
  statement_timeout: 10000,   // Query timeout: 10s (prevent hung queries)
  application_name: 'discord-bot'
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number | null }> => {
  return pool.query<T>(text, params);
};

// Graceful pool shutdown
export const closePool = async () => {
  await pool.end();
};

