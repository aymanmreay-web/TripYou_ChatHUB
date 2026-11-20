import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

import { requirePermission } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/contacts/lists
 * إنشاء قائمة اتصال جديدة لإدارة الحملات من جهات الاتصال المحددة
 * Body: { title: string, description?: string, contact_ids: string[] }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'contacts.manage');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const title = (body.title || '').trim();
    const description = (body.description || '').trim() || null;
    const contactIds = Array.isArray(body.contact_ids) ? body.contact_ids.filter(Boolean) : [];

    if (!title) {
      return NextResponse.json({ error: 'اسم القائمة مطلوب' }, { status: 400 });
    }

    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'يجب تحديد جهة اتصال واحدة على الأقل' }, { status: 400 });
    }

    // 1. إنشاء القائمة في public.contact_lists
    const createRes = await q<{ id: string }>(
      `INSERT INTO public.contact_lists (title, description, created_at)
       VALUES ($1, $2, now())
       RETURNING id`,
      [title, description]
    );

    const listId = createRes[0]?.id;
    if (!listId) {
      throw new Error('فشل إنشاء القائمة في قاعدة البيانات');
    }

    // 2. إدراج الأعضاء في public.contact_list_members
    await q(
      `INSERT INTO public.contact_list_members (list_id, contact_id, added_at)
       SELECT $1, unnest($2::uuid[]), now()
       ON CONFLICT DO NOTHING`,
      [listId, contactIds]
    );

    // 3. جلب عدد الأعضاء الفعليين المضافين
    const countRes = await q<{ count: number }>(
      `SELECT count(*)::int as count FROM public.contact_list_members WHERE list_id = $1`,
      [listId]
    );
    const totalMembers = countRes[0]?.count || contactIds.length;

    return NextResponse.json({
      success: true,
      list_id: listId,
      title,
      members_count: totalMembers,
      message: `تم بنجاح إنشاء القائمة "${title}" وتضمين ${totalMembers} جهة اتصال فيها، وأصبحت متاحة فوراً في قسم إدارة الحملات.`,
    });
  } catch (err: any) {
    console.error('[POST /api/contacts/lists]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
