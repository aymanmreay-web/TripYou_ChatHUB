#!/usr/bin/env node
/**
 * أداة تنفيذ ملف SQL على قاعدة بيانات Supabase.
 * الاستخدام:
 *   DATABASE_URL="postgresql://..." node scripts/run-sql.js db/public_features_setup.sql
 * ملاحظة: للسكربتات متعددة الجمل استخدم منفذ 5432 (وضع الجلسة) وليس 6543.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const [,, sqlPath] = process.argv;
  if (!sqlPath || !process.env.DATABASE_URL) {
    console.error('Usage: DATABASE_URL="postgresql://..." node scripts/run-sql.js <file.sql>');
    process.exit(1);
  }
  // @ts-ignore
  const { Client } = require('pg');
  const sql = fs.readFileSync(path.resolve(sqlPath), 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`OK — executed ${sqlPath} (${sql.length} chars)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
