/**
 * أداة تطبيق ملفات SQL على قاعدة Supabase مباشرةً (يُستخدم للترحيلات).
 * الاستخدام: node scripts/apply_sql.mjs db/migrations/0012_reports_attendance.sql
 * يقرأ DATABASE_URL من env أو من apps/hub-web/.env.local تلقائياً.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply_sql.mjs <path-to.sql>');
  process.exit(1);
}

function loadDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(resolve(root, 'apps/hub-web/.env.local'), 'utf8');
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  throw new Error('DATABASE_URL not found');
}

const sqlPath = resolve(root, file);
const sql = readFileSync(sqlPath, 'utf8');

const { Pool } = await import('pg');
const pool = new Pool({
  connectionString: loadDbUrl(),
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 20_000,
});

try {
  console.log(`[apply_sql] file: ${sqlPath}`);
  console.log(`[apply_sql] statements: ${sql.split(';').length}, size: ${sql.length} bytes`);
  const res = await pool.query(sql);
  console.log('[apply_sql] ✅ applied successfully');
  if (Array.isArray(res)) {
    console.log(`[apply_sql] ${res.length} result sets`);
  }
} catch (err) {
  console.error('[apply_sql] ❌ FAILED:', err.message);
  console.error(err.detail || '');
  process.exitCode = 1;
} finally {
  await pool.end();
}
