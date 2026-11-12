import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';
import { insertNotification } from '../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * نظام الطلبات الموحد (بقرارات المالك):
 * types: line_reply (رد من خط آخر على فردية) | group_join (انضمام خط لمجموعة)
 *        | assignment (طلب إسناد — اقتناص) | read | read_write (قراءة/مشاركة بمحادثة زميل)
 * التوجيه: مشرف الصندوق (hub.inboxes.supervisor_id) — وبعد 10 دقائق بلا رد → المدير (escalated)
 * المنح: لهذه المحادثة فقط (status='approved' مع chat_jid) — لا منح دائم
 */

const TYPE_LABEL: Record<string, string> = {
  line_reply: 'رد من خط آخر (فردية)',
  group_join: 'انضمام خط لمجموعة',
  assignment: 'طلب إسناد محادثة',
  read: 'طلب قراءة محادثة زميل',
  read_write: 'طلب قراءة وكتابة (مشاركة)',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staff_id');
    const pending = searchParams.get('pending');

    if (pending === '1') {
      const rows = await q(
        `select r.id, r.type, r.chat_jid, r.reason, r.status, r.created_at, r.escalated,
                s.full_name as staff_name,
                coalesce(l.title_ar, l.instance_name) as line_title, l.instance_name,
                i.name_ar as inbox_name,
                coalesce(c.display_name, cv.title, r.chat_jid) as chat_name
         from hub.line_send_requests r
         join hub.staff s on s.id = r.staff_id
         left join hub.lines l on l.id = r.line_id
         left join hub.inboxes i on i.id = r.inbox_id
         left join hub.conversations cv on cv.chat_jid = r.chat_jid
         left join hub.contacts c on c.wa_jid = r.chat_jid
         where r.status = 'pending'
         order by r.escalated desc, r.created_at asc
         limit 100`
      );
      return NextResponse.json({
        requests: rows.map((r: any) => ({ ...r, type_label: TYPE_LABEL[r.type] || r.type })),
      });
    }

    if (!staffId) {
      return NextResponse.json({ error: 'staff_id required' }, { status: 400 });
    }
    // المنح المفعّلة لهذا الموظف — لكل محادثة فقط
    const rows = await q<{ chat_jid: string; line_id: string; instance_name: string; type: string }>(
      `select r.chat_jid, r.line_id, l.instance_name, r.type
       from hub.line_send_requests r
       join hub.lines l on l.id = r.line_id
       where r.staff_id = $1 and r.status = 'approved' and r.type in ('line_reply', 'read', 'read_write')`,
      [staffId]
    );
    return NextResponse.json({
      grants: rows.map((r) => ({ chat_jid: r.chat_jid, line: r.instance_name, type: r.type })),
    });
  } catch (err: any) {
    console.error('[permission-requests GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'request') {
      const { type, staff_id, line_id, chat_jid, inbox_id, reason } = body;
      if (!type || !TYPE_LABEL[type] || !staff_id) {
        return NextResponse.json({ error: 'type and staff_id required' }, { status: 400 });
      }

      // طلب معلق مطابق؟ لا تكرر
      const dup = await q<{ id: string }>(
        `select id from hub.line_send_requests
         where staff_id = $1 and type = $2 and coalesce(line_id::text,'') = coalesce($3::text,'')
           and coalesce(chat_jid,'') = coalesce($4,'') and status = 'pending' limit 1`,
        [staff_id, type, line_id || null, chat_jid || null]
      );
      if (dup.length > 0) {
        return NextResponse.json({ success: true, already_pending: true, request_id: dup[0].id });
      }

      const ins = await q<{ id: string }>(
        `insert into hub.line_send_requests (staff_id, type, line_id, chat_jid, inbox_id, reason)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [staff_id, type, line_id || null, chat_jid || null, inbox_id || null, reason || null]
      );

      // أسماء للإشعارات
      const meta = await q<{ staff_name: string; line_title: string; inbox_name: string; chat_name: string }>(
        `select s.full_name as staff_name,
                coalesce(l.title_ar, l.instance_name, '') as line_title,
                coalesce(i.name_ar, '') as inbox_name,
                coalesce(c.display_name, cv.title, $3) as chat_name
         from hub.staff s
         left join hub.lines l on l.id = $2
         left join hub.inboxes i on i.id = $5
         left join hub.contacts c on c.wa_jid = $3
         left join hub.conversations cv on cv.chat_jid = $3
         where s.id = $1
         limit 1`,
        [staff_id, line_id || null, chat_jid || null, 0, inbox_id || null]
      );
      const staffName = meta[0]?.staff_name || 'موظف';
      const lineTitle = meta[0]?.line_title || 'الخط';
      const chatName = meta[0]?.chat_name || 'محادثة';
      const tLabel = TYPE_LABEL[type] || type;

      // التوجيه: مشرف الصندوق أولاً، وإلا كل المشرفين
      const supervisorRows = inbox_id
        ? await q<{ supervisor_id: string | null }>(`select supervisor_id from hub.inboxes where id = $1`, [inbox_id])
        : [{ supervisor_id: null }];
      const supId = supervisorRows[0]?.supervisor_id;

      let notifySql: string;
      const params: any[] = [
        `🔔 ${tLabel} — بانتظار الموافقة`,
        `${staffName}: ${chatName}${lineTitle ? ` • ${lineTitle}` : ''} — راجع الطلبات في لوحة الإدارة`,
        `/admin_dashboard?approvals=1`,
        chat_jid || null,
      ];
      if (supId) {
        notifySql = `insert into public.notifications (staff_id, kind, title, body, link, chat_jid)
                     select s.id, 'permission_request', $1, $2, $3, $4
                     from hub.staff s where s.id = $5::uuid and s.status = 'active'`;
        params.push(supId);
      } else {
        notifySql = `insert into public.notifications (staff_id, kind, title, body, link, chat_jid)
                     select s.id, 'permission_request', $1, $2, $3, $4
                     from hub.staff s join hub.roles r on r.id = s.role_id
                     where r.key in ('super_admin', 'sales_lead') and s.status = 'active'`;
      }
      await q(notifySql, params).catch((e: Error) =>
        console.warn('[permission-requests notify] non-critical:', e.message)
      );

      return NextResponse.json({ success: true, request_id: ins[0]?.id });
    }

    if (body.action === 'decide') {
      const { request_id, decision, decided_by } = body;
      if (!request_id || !['approved', 'rejected'].includes(decision)) {
        return NextResponse.json({ error: 'request_id and decision required' }, { status: 400 });
      }

      const rows = await q<{ staff_id: string; type: string; chat_jid: string; line_id: string | null }>(
        `update hub.line_send_requests
         set status = $2, decided_by = $3, decided_at = now()
         where id = $1 and status = 'pending'
         returning staff_id, type, chat_jid, line_id`,
        [request_id, decision, decided_by || null]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'الطلب غير موجود أو مقرر سابقاً' }, { status: 404 });
      }
      const r = rows[0];
      const tLabel = TYPE_LABEL[r.type] || r.type;

      // الموافقة على طلب الإسناد → إسناد فوري للموظف الطالب
      if (decision === 'approved' && r.type === 'assignment' && r.chat_jid) {
        await q(
          `update hub.conversations set assigned_staff_id = $2, status = case when status = 'open' then 'in_progress' else status end
           where chat_jid = $1`,
          [r.chat_jid, r.staff_id]
        ).catch((e: Error) => console.warn('[assignment apply] non-critical:', e.message));
      }

      await insertNotification({
        staffId: r.staff_id,
        kind: 'permission_result',
        title: decision === 'approved' ? `✅ وُافق: ${tLabel}` : `⛔ رُفض: ${tLabel}`,
        body:
          decision === 'approved'
            ? 'الموافقة سارية لهذه المحادثة فقط — يمكنك المتابعة الآن'
            : 'بانتظارك الرد وفق القواعد المعتمدة',
        link: r.chat_jid ? `/inbox?chat=${encodeURIComponent(r.chat_jid)}` : '/inbox',
        chatJid: r.chat_jid || undefined,
      }).catch(() => {});

      return NextResponse.json({ success: true, decision });
    }

    return NextResponse.json({ error: 'action must be request|decide' }, { status: 400 });
  } catch (err: any) {
    console.error('[permission-requests POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
