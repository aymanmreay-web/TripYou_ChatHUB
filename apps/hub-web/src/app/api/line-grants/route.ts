import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';
import { insertNotification } from '../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * C4 — إذن الرد من خط غير خط الوارد (نظام موافقة المدير):
 *
 * POST { action: 'request',  staff_id, line_id, chat_jid, reason? }
 *   → ينشئ طلباً معلقاً + يخطر المشرفين (kind: line_permission_request)
 *
 * GET  ?staff_id=...              → { granted: [line_id...] }              (للمنتقي في الصندوق)
 * GET  ?pending=1                 → { requests: [...] } مع أسماء           (لوحة المدير)
 *
 * POST { action: 'decide', request_id, decision: 'approved'|'rejected', decided_by }
 *   → يحدّث الطلب؛ الموافقة تنشئ منحاً دائماً (staff,line) + يخطر الطالب بالنتيجة
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staff_id');
    const pending = searchParams.get('pending');

    if (pending === '1') {
      const rows = await q(
        `select r.id, r.chat_jid, r.reason, r.status, r.created_at,
                s.full_name as staff_name, l.title_ar as line_title, l.instance_name,
                c.display_name as contact_name
         from hub.line_send_requests r
         join hub.staff s on s.id = r.staff_id
         join hub.lines l on l.id = r.line_id
         left join hub.contacts c on c.wa_jid = r.chat_jid
         where r.status = 'pending'
         order by r.created_at desc
         limit 100`
      );
      return NextResponse.json({ requests: rows });
    }

    if (!staffId) {
      return NextResponse.json({ error: 'staff_id required' }, { status: 400 });
    }
    const rows = await q<{ line_id: string; instance_name: string }>(
      `select g.line_id, l.instance_name
       from hub.line_send_grants g
       join hub.lines l on l.id = g.line_id
       where g.staff_id = $1`,
      [staffId]
    );
    return NextResponse.json({ granted: rows.map((r) => r.instance_name) });
  } catch (err: any) {
    console.error('[line-grants GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ─── طلب إذن من موظف ───
    if (body.action === 'request') {
      const { staff_id, line_id, chat_jid, reason } = body;
      if (!staff_id || !line_id || !chat_jid) {
        return NextResponse.json({ error: 'staff_id, line_id, chat_jid required' }, { status: 400 });
      }

      // طلب معلق لنفس (موظف، خط) موجود؟ لا تكرر
      const existing = await q<{ id: string }>(
        `select id from hub.line_send_requests where staff_id = $1 and line_id = $2 and status = 'pending' limit 1`,
        [staff_id, line_id]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: true, already_pending: true, request_id: existing[0].id });
      }

      const ins = await q<{ id: string }>(
        `insert into hub.line_send_requests (staff_id, line_id, chat_jid, reason)
         values ($1, $2, $3, $4) returning id`,
        [staff_id, line_id, chat_jid, reason || null]
      );

      // أسماء للإشعار
      const meta = await q<{ staff_name: string; line_title: string }>(
        `select s.full_name as staff_name, coalesce(l.title_ar, l.instance_name) as line_title
         from hub.staff s, hub.lines l where s.id = $1 and l.id = $2`,
        [staff_id, line_id]
      );
      const staffName = meta[0]?.staff_name || 'موظف';
      const lineTitle = meta[0]?.line_title || 'خط';

      // إخطار المشرفين (super_admin + supervisor)
      await q(
        `insert into public.notifications (staff_id, kind, title, body, link, chat_jid)
         select s.id, 'line_permission_request', $2, $3, '/admin_dashboard?approvals=1', $4
         from hub.staff s
         join hub.roles r on r.id = s.role_id
         where r.key in ('super_admin', 'supervisor') and s.status = 'active'`,
        [
          `🔐 طلب إذن رد من خط آخر`,
          `${staffName} يطلب الرد من «${lineTitle}» على محادثة خارج خطها الوارد — راجع الطلبات في لوحة الإدارة`,
          chat_jid,
        ]
      ).catch((e: Error) => console.warn('[line-grants notify] non-critical:', e.message));

      return NextResponse.json({ success: true, request_id: ins[0]?.id });
    }

    // ─── قرار المدير ───
    if (body.action === 'decide') {
      const { request_id, decision, decided_by } = body;
      if (!request_id || !['approved', 'rejected'].includes(decision)) {
        return NextResponse.json({ error: 'request_id and decision(approved|rejected) required' }, { status: 400 });
      }

      const rows = await q<{ staff_id: string; line_id: string; chat_jid: string }>(
        `update hub.line_send_requests
         set status = $2, decided_by = $3, decided_at = now()
         where id = $1 and status = 'pending'
         returning staff_id, line_id, chat_jid`,
        [request_id, decision, decided_by || null]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'الطلب غير موجود أو مقرر سابقاً' }, { status: 404 });
      }
      const r = rows[0];

      if (decision === 'approved') {
        // منح دائم (staff, line) — يفعّل الخط للطالب
        await q(
          `insert into hub.line_send_grants (staff_id, line_id, granted_by)
           values ($1, $2, $3)
           on conflict (staff_id, line_id) do nothing`,
          [r.staff_id, r.line_id, decided_by || null]
        );
      }

      // إخطار الطالب بالنتيجة
      const meta = await q<{ line_title: string }>(
        `select coalesce(title_ar, instance_name) as line_title from hub.lines where id = $1`,
        [r.line_id]
      );
      const lineTitle = meta[0]?.line_title || 'الخط';
      await insertNotification({
        staffId: r.staff_id,
        kind: 'line_permission_result',
        title: decision === 'approved' ? `✅ وُافق على الرد من «${lineTitle}»` : `⛔ رُفض الرد من «${lineTitle}»`,
        body: decision === 'approved'
          ? `المدير وافق — يمكنك الآن الرد من هذا الخط على المحادثات`
          : `المدير رفض الطلب — الرد إلزامي من نفس الرقم الذي وردت منه المحادثة`,
        link: `/inbox?chat=${encodeURIComponent(r.chat_jid)}`,
        chatJid: r.chat_jid,
      }).catch(() => {});

      return NextResponse.json({ success: true, decision });
    }

    return NextResponse.json({ error: 'action must be request|decide' }, { status: 400 });
  } catch (err: any) {
    console.error('[line-grants POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
