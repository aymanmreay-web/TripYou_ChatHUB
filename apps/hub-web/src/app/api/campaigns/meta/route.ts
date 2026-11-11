import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م5 — القوالب والقوائم المساعدة لمعالج إنشاء الحملة.
 * GET /api/campaigns/templates → قوالب الرسائل النشطة
 * GET /api/campaigns/lists     → قوائم الجمهور المحفوظة مع عدد الأعضاء
 * GET /api/campaigns/lines     → الخطوط المتاحة للإرسال
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') || 'templates';

    if (kind === 'templates') {
      const rows = await q(
        `select id, title, category, body, variables, media, usage_count
         from public.message_templates
         where is_active = true
         order by usage_count desc, created_at desc
         limit 100`
      );
      return NextResponse.json({ data: rows });
    }

    if (kind === 'lists') {
      const rows = await q(
        `select l.id, l.title, l.description, l.created_at,
                (select count(*)::int from public.contact_list_members m where m.list_id = l.id) as members_count
         from public.contact_lists l
         order by l.created_at desc
         limit 100`
      );
      return NextResponse.json({ data: rows });
    }

    if (kind === 'lines') {
      const rows = await q(
        `select instance_name, title_ar, status, daily_cap
         from hub.lines
         where status in ('connected')
         order by instance_name`
      );
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: 'kind must be templates|lists|lines' }, { status: 400 });
  } catch (err: any) {
    console.error('[campaigns/meta GET]', err?.message);
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}
