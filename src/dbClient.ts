import { Pool, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please configure a Postgres connection string.');
}

const useSsl = process.env.PGSSL === 'true';

const createPool = () => {
  const newPool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    // Cloud-optimized connection pool settings
    max: 10, // Max connections (Zeabur typically allows ~10-20)
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout if can't acquire connection in 5s
    statement_timeout: 10000, // Query timeout: 10s (prevent hung queries)
    application_name: 'discord-bot'
  });

  newPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return newPool;
};

let pool = createPool();
let reconnectPromise: Promise<void> | null = null;

const isConnectionError = (err: unknown) => {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; message?: string };
  const message = anyErr.message || '';
  return (
    anyErr.code === 'ECONNRESET' ||
    anyErr.code === 'ECONNREFUSED' ||
    anyErr.code === 'ETIMEDOUT' ||
    anyErr.code === 'EHOSTUNREACH' ||
    anyErr.code === 'ENOTFOUND' ||
    anyErr.code === '57P01' || // admin shutdown
    message.includes('Connection terminated') ||
    message.includes('Connection ended unexpectedly') ||
    message.includes('server closed the connection')
  );
};

const reconnectPool = async () => {
  if (reconnectPromise) return reconnectPromise;
  reconnectPromise = (async () => {
    console.warn('Postgres connection lost. Reconnecting...');
    try {
      await pool.end().catch(() => undefined);
    } catch (err) {
      console.error('Error while ending old pool during reconnect', err);
    }
    pool = createPool();
    // Prime the connection to fail fast if unreachable
    await pool.query('SELECT 1');
    console.info('Postgres connection re-established');
  })().finally(() => {
    reconnectPromise = null;
  });
  return reconnectPromise;
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number | null }> => {
  try {
    return await pool.query<T>(text, params);
  } catch (err) {
    if (isConnectionError(err)) {
      await reconnectPool();
      return pool.query<T>(text, params);
    }
    throw err;
  }
};

// Graceful pool shutdown
export const closePool = async () => {
  await pool.end();
};

