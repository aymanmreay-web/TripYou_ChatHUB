import { NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/contacts/stats
 * إحصائيات شاملة دقيقة 100% مستخرجة مباشرة من hub.contacts عبر pool مشترك
 */
export async function GET() {
  try {
    const statsRes = await q(`
      SELECT 
        count(*)::int as total,
        count(*) FILTER (WHERE entity_type = 'individual' AND (wa_jid IS NULL OR wa_jid NOT LIKE '%@lid%'))::int as individual,
        count(*) FILTER (WHERE entity_type = 'organization')::int as organization,
        count(*) FILTER (WHERE entity_type = 'group' AND (wa_jid IS NULL OR (wa_jid NOT LIKE '%@newsletter%' AND wa_jid NOT LIKE '%@broadcast%')))::int as "group",
        count(*) FILTER (WHERE wa_jid LIKE '%@lid%')::int as lids,
        count(*) FILTER (WHERE wa_jid LIKE '%@newsletter%' OR wa_jid LIKE '%@broadcast%')::int as newsletters,
        count(*) FILTER (WHERE commercial_role = 'b2c')::int as b2c,
        count(*) FILTER (WHERE commercial_role = 'b2b')::int as b2b,
        count(*) FILTER (WHERE commercial_role = 'vendor')::int as vendor,
        count(*) FILTER (WHERE commercial_role = 'partner')::int as partner,
        count(*) FILTER (WHERE commercial_role = 'staff')::int as staff,
        count(*) FILTER (WHERE source = 'evolution')::int as evolution,
        count(*) FILTER (WHERE source = 'excel_import')::int as excel_import,
        count(*) FILTER (WHERE source = 'contacts_file')::int as contacts_file,
        count(*) FILTER (WHERE source = 'system')::int as system,
        count(*) FILTER (WHERE source = 'manual')::int as manual,
        count(*) FILTER (WHERE country_code = 'SA')::int as saudi,
        count(*) FILTER (WHERE country_code IN ('AE', 'KW', 'QA', 'OM', 'BH'))::int as gulf,
        count(*) FILTER (WHERE country_code IN ('EG', 'JO', 'IQ', 'YE', 'SY', 'LB', 'MA', 'DZ', 'TN', 'SD'))::int as arab
      FROM hub.contacts;
    `);

    const evoLinesRes = await q(`
      SELECT source_detail, count(*)::int as cnt
      FROM hub.contacts
      WHERE source = 'evolution' AND source_detail IS NOT NULL
      GROUP BY source_detail;
    `);

    const countriesRes = await q(`
      SELECT country_code, count(*)::int as cnt
      FROM hub.contacts
      WHERE country_code IS NOT NULL
      GROUP BY country_code
      ORDER BY cnt DESC
      LIMIT 10;
    `);

    const row = statsRes[0] || {};
    const evolutionLinesBreakdown: Record<string, number> = {};
    evoLinesRes.forEach((r: any) => {
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
          lids: row.lids || 0,
          newsletters: row.newsletters || 0,
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
        by_country: {
          saudi: row.saudi || 0,
          gulf: row.gulf || 0,
          arab: row.arab || 0,
          top_countries: countriesRes,
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
    console.error('[API /api/contacts/stats Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
