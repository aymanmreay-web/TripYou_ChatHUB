import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/access-requests
 * طلب ترخيص وصول / إسناد حقيقي — يُسجَّل إشعاراً لصاحب المحادثة المسندة
 * ولكل المشرفين/مسؤولي النظام النشطين، مع اسم المحادثة وسبب الطلب.
 * Body: { staff_id, chat_jid, instance?, request_type: 'read'|'reply'|'reassign', reason }
 */
const TITLES: Record<string, string> = {
  read: '🔓 طلب اطلاع على محادثة',
  reply: '✏️ طلب تدخل مؤقت على محادثة',
  reassign: '🔁 طلب إسناد كامل لمحادثة',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staff_id, chat_jid, instance, request_type, reason } = body;

    if (!staff_id || !chat_jid || !TITLES[request_type]) {
      return NextResponse.json(
        { error: 'staff_id, chat_jid, request_type(read|reply|reassign) مطلوبة' },
        { status: 400 }
      );
    }

    // 1. بيانات الطالب
    const requester = await q<{ id: string; full_name: string }>(
      `select id, full_name from hub.staff where id = $1::uuid and status = 'active' limit 1`,
      [staff_id]
    );
    if (!requester[0]) {
      return NextResponse.json({ error: 'الموظف غير معروف أو غير نشط' }, { status: 403 });
    }

    // 2. المحادثة المستهدفة: اسمها وصاحبها الحالي (إن وُجد)
    const conv = await q<{ id: string; title: string | null; contact_name: string | null; assigned_staff_id: string | null }>(
      `select cv.id, cv.title, c.display_name as contact_name, cv.assigned_staff_id
       from hub.conversations cv
       left join hub.contacts c on c.id = cv.contact_id
       where cv.chat_jid = $1
       order by cv.created_at desc
       limit 1`,
      [chat_jid]
    );
    const convRow = conv[0] || null;
    const convName =
      convRow?.contact_name || convRow?.title || 'محادثة عميل';

    // 3. المستهدفون: صاحب المحادثة الحالي + المشرفون/مسؤولو النظام (بدون الطالب نفسه)
    const targets = await q<{ id: string }>(
      `select distinct s.id
       from hub.staff s
       left join hub.roles r on r.id = s.role_id
       where s.status = 'active'
         and s.id <> $1::uuid
         and (
           s.id = $2::uuid
           or coalesce(r.key, '') in ('super_admin', 'sales_lead')
         )`,
      [staff_id, convRow?.assigned_staff_id ?? null]
    );
    if (targets.length === 0) {
      return NextResponse.json({ error: 'لا يوجد مشرف متاح لاستلام الطلب' }, { status: 422 });
    }

    // 4. إدراج الإشعارات
    const title = TITLES[request_type];
    const bodyText = `${requester[0].full_name} — ${convName}${instance ? ` — ${instance}` : ''}: ${(reason || '').slice(0, 120) || 'بدون مبررات مذكورة'}`;
    const link = `/inbox?chat=${encodeURIComponent(chat_jid)}`;

    await q(
      `insert into public.notifications (staff_id, kind, title, body, link, chat_jid, instance_name)
       select sid, 'access_request', $2, $3, $4, $5, $6
       from unnest($1::uuid[]) as sid`,
      [targets.map((t) => t.id), title, bodyText, link, chat_jid, instance || null]
    );

    return NextResponse.json({ success: true, notified: targets.length });
  } catch (err: any) {
    console.error('[access-requests POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
