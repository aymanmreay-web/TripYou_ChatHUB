import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

import { requirePermission } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/contacts/[id]
 * جلب جهة اتصال بالمعرف مباشرة من hub.contacts عبر pg pool
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(req, 'contacts.view');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = params;
    const rows = await q(`select * from hub.contacts where id = $1 limit 1`, [id]);
    if (!rows[0]) {
      return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
    }
    return NextResponse.json({ contact: rows[0] });
  } catch (err: any) {
    console.error('[contacts/[id] GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/contacts/[id]
 * تعديل بيانات جهة الاتصال — يستخدم pg مباشرة (بدل Supabase client الذي لا يرى schema hub)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(req, 'contacts.manage');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = params;
    const body = await req.json();

    // بناء SET clause ديناميكي — نقبل فقط الأعمدة المعروفة
    const ALLOWED = [
      'display_name', 'full_name', 'company', 'facility_name',
      'entity_type', 'commercial_role', 'source', 'source_detail',
      'primary_phone', 'primary_phone_e164', 'email',
      'country_code', 'city', 'district', 'notes', 'tags',
      'avatar_url', 'is_favorite', 'wa_jid',
    ];

    const setClauses: string[] = [];
    const vals: any[] = [];

    for (const col of ALLOWED) {
      if (col in body) {
        vals.push(body[col]);
        setClauses.push(`${col} = $${vals.length}`);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول صالحة للتعديل' }, { status: 400 });
    }

    vals.push(id);
    const sql = `
      update hub.contacts
      set ${setClauses.join(', ')}, updated_at = now()
      where id = $${vals.length}
      returning *
    `;
    const rows = await q(sql, vals);

    if (!rows[0]) {
      return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
    }

    const updated = rows[0];

    // مزامنة المجموعات والمحادثات إذا تغيّر الاسم أو الـ jid
    if (updated?.wa_jid) {
      const newName = updated.display_name || updated.full_name;
      if (newName) {
        if (updated.entity_type === 'group' || updated.wa_jid.endsWith('@g.us')) {
          await q(
            `update hub.whatsapp_groups set subject = $2, updated_at = now() where group_jid = $1`,
            [updated.wa_jid, newName]
          ).catch(() => {});
        }
        await q(
          `update hub.conversations set title = $2, updated_at = now()
           where chat_jid = $1 or contact_id = $3::uuid`,
          [updated.wa_jid, newName, id]
        ).catch(() => {});
      }
    }

    return NextResponse.json({ contact: updated });
  } catch (err: any) {
    console.error('[contacts/[id] PUT]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id]
 * حذف جهة اتصال مع تنظيف التبعيات
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(req, 'contacts.delete');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = params;

    // فك الارتباط أولاً
    await q(`update hub.conversations set contact_id = null where contact_id = $1::uuid`, [id]).catch(() => {});
    await q(`update hub.whatsapp_groups set contact_id = null where contact_id = $1::uuid`, [id]).catch(() => {});
    await q(`delete from hub.contact_phones where contact_id = $1::uuid`, [id]).catch(() => {});
    await q(`delete from hub.contact_tags where contact_id = $1::uuid`, [id]).catch(() => {});

    const rows = await q(`delete from hub.contacts where id = $1 returning id`, [id]);
    if (!rows[0]) {
      return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (err: any) {
    console.error('[contacts/[id] DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
