import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/contacts/[id]/tags
 * جلب وسوم جهة اتصال محددة بمعرفها
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id;

    if (!contactId) {
      return NextResponse.json({ error: 'معرف جهة الاتصال مطلوب' }, { status: 400 });
    }

    const tags = await q<{
      id: string;
      key: string;
      name_ar: string;
      color: string;
      scope: string;
      applied_at: string;
    }>(
      `SELECT
        t.id,
        t.key,
        t.name_ar,
        t.color,
        t.scope,
        ct.created_at AS applied_at
      FROM hub.contact_tags ct
      JOIN hub.hub_tags t ON t.id = ct.tag_id
      WHERE ct.contact_id = $1
      ORDER BY t.sort_order ASC NULLS LAST, t.name_ar ASC`,
      [contactId]
    );

    return NextResponse.json({ tags: tags || [] });
  } catch (err: any) {
    console.error('[GET /api/contacts/:id/tags]', err.message);
    return NextResponse.json({ tags: [], error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/contacts/[id]/tags
 * إضافة أو إزالة وسم من جهة اتصال
 * Body: { tag_id: string, action: 'add' | 'remove' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactId = params.id;
    const body = await req.json();
    const { tag_id, action } = body;

    if (!contactId || !tag_id || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'contactId, tag_id, و action (add|remove) مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من وجود جهة الاتصال
    const contact = await q<{ id: string }>(
      `SELECT id FROM hub.contacts WHERE id = $1 LIMIT 1`,
      [contactId]
    );

    if (!contact[0]) {
      return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
    }

    if (action === 'add') {
      await q(
        `INSERT INTO hub.contact_tags (contact_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT (contact_id, tag_id) DO NOTHING`,
        [contactId, tag_id]
      );
    } else {
      await q(
        `DELETE FROM hub.contact_tags
         WHERE contact_id = $1 AND tag_id = $2`,
        [contactId, tag_id]
      );
    }

    // إرجاع الوسوم المحدثة لجهة الاتصال
    const tags = await q<{
      id: string;
      key: string;
      name_ar: string;
      color: string;
    }>(
      `SELECT t.id, t.key, t.name_ar, t.color
       FROM hub.contact_tags ct
       JOIN hub.hub_tags t ON t.id = ct.tag_id
       WHERE ct.contact_id = $1
       ORDER BY t.sort_order ASC NULLS LAST, t.name_ar ASC`,
      [contactId]
    );

    return NextResponse.json({ success: true, tags: tags || [] });
  } catch (err: any) {
    console.error('[POST /api/contacts/:id/tags]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
