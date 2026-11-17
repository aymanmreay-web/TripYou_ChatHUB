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

/**
 * إشعار المعتمدين بطلب جديد: مشرف الصندوق المحدد أولاً (hub.inboxes.supervisor_id)، وإلا كل المديرين والمشرفين.
 * لا يرمي أخطاء أبداً — فشل الإشعار لا يُفشل الطلب، ويُسجَّل فقط (والنقر المتكرر يعيد المحاولة تلقائياً).
 */
async function notifyApprovers(p: {
  requestId: string | undefined;
  type: string;
  staffId: string;
  lineId: string | null;
  chatJid: string | null;
  inboxId: string | null;
}): Promise<void> {
  try {
    // أسماء للإشعار (غير حرجة — الاسم الاحتياطي يكفي)
    const meta = await q<{ staff_name: string; line_title: string; chat_name: string }>(
      `select s.full_name as staff_name,
              coalesce(l.title_ar, l.instance_name, '') as line_title,
              coalesce(c.display_name, cv.title, $3::text) as chat_name
       from hub.staff s
       left join hub.lines l on l.id = $2::uuid
       left join hub.contacts c on c.wa_jid = $3::text
       left join hub.conversations cv on cv.chat_jid = $3::text
       where s.id = $1::uuid
       limit 1`,
      [p.staffId, p.lineId, p.chatJid]
    ).catch((e: Error) => {
      console.warn('[permission-requests meta] non-critical:', e.message);
      return [] as any[];
    });
    const staffName = meta[0]?.staff_name || 'موظف';
    const lineTitle = meta[0]?.line_title || '';
    const chatName = meta[0]?.chat_name || p.chatJid || 'محادثة';
    const tLabel = TYPE_LABEL[p.type] || p.type;

    // مشرف الصندوق المحدد (إن وُجد العمود/القيمة) وإلا نكمل للتوجيه العام
    let supId: string | null = null;
    if (p.inboxId) {
      const rows = await q<{ supervisor_id: string | null }>(
        `select supervisor_id from hub.inboxes where id = $1::uuid`,
        [p.inboxId]
      ).catch((e: Error) => {
        console.warn('[permission-requests supervisor] non-critical:', e.message);
        return [] as any[];
      });
      supId = rows[0]?.supervisor_id || null;
    }

    const notifLink = `/module/notifications?request_id=${p.requestId}&chat=${encodeURIComponent(p.chatJid || '')}`;
    const params: any[] = [
      `🔔 ${tLabel} — بانتظار الموافقة`,
      `${staffName}: ${chatName}${lineTitle ? ` • ${lineTitle}` : ''} — انقر للموافقة أو الرفض في الإشعارات`,
      notifLink,
      p.chatJid,
    ];
    let notifySql: string;
    if (supId) {
      notifySql = `insert into public.notifications (staff_id, kind, title, body, link, chat_jid)
                   select s.id, 'permission_request', $1, $2, $3, $4
                   from hub.staff s where s.id = $5::uuid and s.status = 'active'`;
      params.push(supId);
    } else {
      // المديرون (admin/manager/super_admin) والمشرفون (sales_lead)
      notifySql = `insert into public.notifications (staff_id, kind, title, body, link, chat_jid)
                   select s.id, 'permission_request', $1, $2, $3, $4
                   from hub.staff s join hub.roles r on r.id = s.role_id
                   where r.key in ('super_admin', 'admin', 'manager', 'sales_lead') and s.status = 'active'`;
    }
    await q(notifySql, params);
  } catch (e: any) {
    console.warn('[permission-requests notify] non-critical:', e?.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'request') {
      const { type, staff_id, line_id, chat_jid, inbox_id, reason } = body;
      if (!type || !TYPE_LABEL[type] || !staff_id) {
        return NextResponse.json({ error: 'نوع الطلب ومعرف الموظف مطلوبان' }, { status: 400 });
      }

      // حل معرف الخط إن لم يُمرر صراحة
      let resolvedLineId = line_id || null;
      if (!resolvedLineId && chat_jid) {
        const cLine = await q<{ line_id: string }>(
          `select line_id from hub.conversations where chat_jid = $1 limit 1`,
          [chat_jid]
        );
        if (cLine[0]?.line_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cLine[0].line_id);
          if (isUuid) {
            resolvedLineId = cLine[0].line_id;
          } else {
            const lRow = await q<{ id: string }>(
              `select id from hub.lines where instance_name = $1 or title_ar = $1 limit 1`,
              [cLine[0].line_id]
            );
            if (lRow[0]?.id) resolvedLineId = lRow[0].id;
          }
        }
      }
      // إن تعذر إيجاده وكان هناك خطوط في النظام، نأخذ أول خط كاحتياط
      if (!resolvedLineId) {
        const fallbackLine = await q<{ id: string }>(`select id from hub.lines order by created_at asc limit 1`);
        if (fallbackLine[0]?.id) resolvedLineId = fallbackLine[0].id;
      }

      // طلب معلق مطابق؟ لا تكرر
      const dup = await q<{ id: string }>(
        `select id from hub.line_send_requests
         where staff_id = $1 and type = $2 and coalesce(line_id::text,'') = coalesce($3::text,'')
            and coalesce(chat_jid,'') = coalesce($4,'') and status = 'pending' limit 1`,
        [staff_id, type, resolvedLineId || null, chat_jid || null]
      );
      if (dup.length > 0) {
        // علاج ذاتي: إن لم يصل أي إشعار لهذا الطلب أصلاً (فشل سابق) أعد إرساله الآن مرة واحدة
        const alreadyNotified = await q(
          `select 1 from public.notifications where kind = 'permission_request' and link like $1 limit 1`,
          [`%request_id=${dup[0].id}%`]
        ).catch(() => [{}]);
        if (alreadyNotified.length === 0) {
          await notifyApprovers({
            requestId: dup[0].id,
            type,
            staffId: staff_id,
            lineId: resolvedLineId || null,
            chatJid: chat_jid || null,
            inboxId: inbox_id || null,
          });
        }
        return NextResponse.json({ success: true, already_pending: true, request_id: dup[0].id });
      }

      const ins = await q<{ id: string }>(
        `insert into hub.line_send_requests (staff_id, type, line_id, chat_jid, inbox_id, reason)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [staff_id, type, resolvedLineId || null, chat_jid || null, inbox_id || null, reason || null]
      );

      await notifyApprovers({
        requestId: ins[0]?.id,
        type,
        staffId: staff_id,
        lineId: resolvedLineId || null,
        chatJid: chat_jid || null,
        inboxId: inbox_id || null,
      });

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
