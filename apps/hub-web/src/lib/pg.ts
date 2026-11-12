/**
 * تجمع اتصالات Postgres مشترك (singleton) لكل عمليات السيرفر الثقيلة
 * (الويب هوك، المؤشرات، محرك الحملات) — بدل فتح اتصال جديد لكل طلب.
 * ملاحظة: استيراد pg ديناميكي (نفس نمط api/contacts/stats) لتفادي مشاكل تجميع Next.
 */
const globalForPg = globalThis as any;

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.aypnxljvudjtasofiuhp:gkaYY9j%2B2M%25Z%26BD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

export async function getPool(): Promise<any> {
  if (!globalForPg.__hubPgPool) {
    // @ts-ignore — pg بدون أنواع (نفس نمط api/contacts/stats)
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    pool.on('error', (err: Error) => {
      console.error('[pg pool] idle client error:', err.message);
    });
    globalForPg.__hubPgPool = pool;
  }
  return globalForPg.__hubPgPool;
}

/** استعلام سريع باتصال من التجمع */
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = await getPool();
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
