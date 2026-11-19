import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

import { requirePermission, requireStaff } from '../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/tags
 * جلب قائمة الوسوم من قاعدة البيانات مع إحصاءات الاستخدام
 * ?scope=conversation|contact|both — فلترة حسب النطاق
 * ?kind=custom|system — فلترة حسب النوع
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || '';
    const kind = searchParams.get('kind') || '';

    const where: string[] = ["t.kind != 'whatsapp'"];
    const params: any[] = [];

    if (scope && scope !== 'all') {
      params.push(scope);
      where.push(`(t.scope = $${params.length} OR t.scope = 'both' OR t.scope = 'all')`);
    }

    if (kind && kind !== 'all') {
      params.push(kind);
      where.push(`t.kind = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const tags = await q<{
      id: string;
      key: string;
      name_ar: string;
      color: string;
      kind: string;
      scope: string;
      sort_order: number;
      conv_count: number;
      contact_count: number;
    }>(
      `SELECT
        t.id,
        t.key,
        t.name_ar,
        t.color,
        t.kind,
        t.scope,
        t.sort_order,
        COUNT(DISTINCT ct.conversation_id)::int AS conv_count,
        COUNT(DISTINCT cot.contact_id)::int AS contact_count
      FROM hub.hub_tags t
      LEFT JOIN hub.conversation_tags ct ON ct.tag_id = t.id
      LEFT JOIN hub.contact_tags cot ON cot.tag_id = t.id
      ${whereClause}
      GROUP BY t.id, t.key, t.name_ar, t.color, t.kind, t.scope, t.sort_order
      ORDER BY t.sort_order ASC NULLS LAST, t.name_ar ASC`,
      params
    );

    return NextResponse.json({ tags: tags || [] });
  } catch (err: any) {
    console.error('[GET /api/tags]', err.message);
    return NextResponse.json({ tags: [], error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/tags
 * إنشاء وسم جديد
 * Body: { name, color, scope?, kind? }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'tags.manage');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { name, color = '#8b5cf6', scope = 'both', kind = 'custom' } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم الوسم مطلوب' }, { status: 400 });
    }

    const key = `tag_${Date.now().toString(36)}`;

    const rows = await q<{ id: string; key: string; name_ar: string }>(
      `INSERT INTO hub.hub_tags (key, name_ar, color, kind, scope, sort_order)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM hub.hub_tags))
       RETURNING id, key, name_ar`,
      [key, name.trim(), color, kind, scope]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'تعذّر إنشاء الوسم' }, { status: 500 });
    }

    return NextResponse.json({ tag: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/tags]', err.message);
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'وسم بهذا الاسم موجود مسبقاً' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
