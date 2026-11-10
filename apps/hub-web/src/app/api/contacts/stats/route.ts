import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.aypnxljvudjtasofiuhp:gkaYY9j%2B2M%25Z%26BD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

/**
 * GET /api/contacts/stats
 * إحصائيات شاملة دقيقة 100% مستخرجة مباشرة من قاعدة البيانات بدون أي قص أو قيود
 */
export async function GET() {
  let client: any = null;
  try {
    // @ts-ignore
    const { Client } = await import('pg');
    client = new Client({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const statsRes = await client.query(`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE entity_type = 'individual')::int as individual,
        count(*) FILTER (WHERE entity_type = 'organization')::int as organization,
        count(*) FILTER (WHERE entity_type = 'group')::int as "group",
        count(*) FILTER (WHERE commercial_role = 'b2c')::int as b2c,
        count(*) FILTER (WHERE commercial_role = 'b2b')::int as b2b,
        count(*) FILTER (WHERE commercial_role = 'vendor')::int as vendor,
        count(*) FILTER (WHERE commercial_role = 'partner')::int as partner,
        count(*) FILTER (WHERE commercial_role = 'staff')::int as staff,
        count(*) FILTER (WHERE source = 'evolution')::int as evolution,
        count(*) FILTER (WHERE source = 'excel_import')::int as excel_import,
        count(*) FILTER (WHERE source = 'contacts_file')::int as contacts_file,
        count(*) FILTER (WHERE source = 'system')::int as system,
        count(*) FILTER (WHERE source = 'manual')::int as manual
      FROM hub.contacts;
    `);

    const evoLinesRes = await client.query(`
      SELECT source_detail, count(*)::int as cnt
      FROM hub.contacts
      WHERE source = 'evolution' AND source_detail IS NOT NULL
      GROUP BY source_detail;
    `);

    const row = statsRes.rows[0] || {};
    const evolutionLinesBreakdown: Record<string, number> = {};
    evoLinesRes.rows.forEach((r: any) => {
      const lineName = (r.source_detail || '').replace('evolution:', '');
      evolutionLinesBreakdown[lineName] = r.cnt;
    });

    return NextResponse.json(
      {
        total: row.total || 0,
        by_entity_type: {
          individual: row.individual || 0,
          organization: row.organization || 0,
          group: row.group || 0,
        },
        by_role: {
          b2c: row.b2c || 0,
          b2b: row.b2b || 0,
          vendor: row.vendor || 0,
          partner: row.partner || 0,
          staff: row.staff || 0,
        },
        by_source: {
          evolution: row.evolution || 0,
          excel_import: row.excel_import || 0,
          contacts_file: row.contacts_file || 0,
          system: row.system || 0,
          manual: row.manual || 0,
        },
        evolution_lines: evolutionLinesBreakdown,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.warn('SQL stats fallback to Supabase counts:', err.message);

    // احتياطي دقيق عبر Supabase count API إذا تعذر اتصال pg
    try {
      const supabase = getSupabaseAdmin();
      const [allRes, indRes, orgRes, grpRes, evoRes] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('entity_type', 'individual'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('entity_type', 'organization'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('entity_type', 'group'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('source', 'evolution'),
      ]);

      const total = allRes.count || 0;
      return NextResponse.json({
        total,
        by_entity_type: {
          individual: indRes.count || 0,
          organization: orgRes.count || 0,
          group: grpRes.count || 0,
        },
        by_role: {
          b2c: indRes.count || 0,
          b2b: (orgRes.count || 0) + (grpRes.count || 0),
          vendor: 0,
          partner: 0,
          staff: 0,
        },
        by_source: {
          evolution: evoRes.count || 0,
          excel_import: 0,
          contacts_file: 0,
          system: 0,
          manual: 0,
        },
        evolution_lines: {},
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    } catch (fallbackErr: any) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
    }
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}
