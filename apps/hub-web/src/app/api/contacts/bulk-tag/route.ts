import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

import { requirePermission } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';

/**
 * POST /api/contacts/bulk-tag
 * تعيين أو إزالة وسم لمجموعة من جهات الاتصال دفعة واحدة
 * Body: { contact_ids: string[], tag_id: string, action: 'add' | 'remove' }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'contacts.manage');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const contactIds: string[] = Array.isArray(body.contact_ids)
      ? body.contact_ids.filter(Boolean)
      : [];
    const tagId: string = (body.tag_id || '').trim();
    const action: string = body.action === 'remove' ? 'remove' : 'add';

    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'يجب تحديد جهة اتصال واحدة على الأقل' }, { status: 400 });
    }
    if (!tagId) {
      return NextResponse.json({ error: 'معرف الوسم مطلوب' }, { status: 400 });
    }

    // التحقق من وجود الوسم
    const tagCheck = await q<{ id: string; name_ar: string }>(
      `SELECT id, name_ar FROM hub.hub_tags WHERE id = $1 LIMIT 1`,
      [tagId]
    );
    if (!tagCheck.length) {
      return NextResponse.json({ error: 'الوسم المحدد غير موجود' }, { status: 404 });
    }

    let affected = 0;
    if (action === 'add') {
      const res = await q(
        `INSERT INTO hub.contact_tags (contact_id, tag_id)
         SELECT unnest($1::uuid[]), $2::uuid
         ON CONFLICT DO NOTHING
         RETURNING contact_id`,
        [contactIds, tagId]
      );
      affected = res.length;
    } else {
      const res = await q(
        `DELETE FROM hub.contact_tags
         WHERE tag_id = $1 AND contact_id = ANY($2::uuid[])
         RETURNING contact_id`,
        [tagId, contactIds]
      );
      affected = res.length;
    }

    return NextResponse.json({
      success: true,
      action,
      tag_id: tagId,
      tag_name: tagCheck[0].name_ar,
      affected_count: affected,
      message: action === 'add'
        ? `تم إضافة وسم «${tagCheck[0].name_ar}» لـ ${affected} جهة اتصال`
        : `تم إزالة وسم «${tagCheck[0].name_ar}» من ${affected} جهة اتصال`,
    });
  } catch (err: any) {
    console.error('[POST /api/contacts/bulk-tag]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
