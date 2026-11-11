import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م5 — تفاصيل حملة واحدة + جدول مستلميها (تحديث حي كل 3 ثوانٍ من الصفحة).
 * GET /api/campaigns/[id]?status=pending|sent|failed|skipped [&limit=200]
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500);

    const campRows = await q(
      `select id, title, description, status, line_instance, audience, text, media,
              throttle, scheduled_at, started_at, finished_at, stats, created_at
       from public.campaigns where id = $1 limit 1`,
      [params.id]
    );
    if (campRows.length === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const recipients = await q(
      `select id, phone_e164, display_name, status, skip_reason, error, sent_at, created_at
       from public.campaign_recipients
       where campaign_id = $1
       ${status ? 'and status = $2' : ''}
       order by created_at
       limit $${status ? 3 : 2}`,
      status ? [params.id, status, limit] : [params.id, limit]
    );

    // عدادات الحالات لكل الحملة (لا تتأثر بالفلتر)
    const counts = await q<{ status: string; c: number }>(
      `select status, count(*)::int c from public.campaign_recipients where campaign_id = $1 group by status`,
      [params.id]
    );
    const byStatus: Record<string, number> = {};
    counts.forEach((x) => { byStatus[x.status] = x.c; });

    return NextResponse.json({ campaign: campRows[0], recipients, counts: byStatus });
  } catch (err: any) {
    console.error('[campaigns/[id] GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
