import { Pool } from 'pg';

// Lazy-initialised pool — avoids crashing `next build` when DATABASE_URL
// is only available at runtime (e.g. Docker / CI).
let _pool: Pool | undefined;

function getPool(): Pool {
  if (_pool) return _pool;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  });

  return _pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Proxy so `import { pool }` and `pool.query(...)` work without changes
// across all existing callsites, while deferring actual Pool creation.
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

export default pool;
