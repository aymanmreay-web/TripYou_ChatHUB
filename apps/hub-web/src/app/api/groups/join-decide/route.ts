import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import { evoFetch, digitsOnly, EvolutionError } from '../../../../lib/evolution';
import { rebuildGroupMembers, extractParticipants, auditGroup } from '../../../../lib/groupsSync';
import { insertNotification } from '../../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * قرار طلب انضمام خط لمجموعة (type = 'group_join') — قرار المالك:
 * الموافقة = ضم فعلي بضغطة واحدة: addParticipants برقم هاتف الخط الطالب
 * من خط أدمن عضو في المجموعة (الخط المطلوب نفسه غير عضو — هذه هي الفكرة).
 * عند فشل Evolution أو غياب خط أدمن: لا يُعتمد الطلب — يبقى معلقاً
 * مع رسالة «أضف يدوياً» واضحة تصلح لإعادة المحاولة.
 * الرفض: تعليم + إشعار مباشرة.
 */

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  let body: { request_id?: string; decision?: string; decided_by?: string; line_id?: string };
  try {
    body = await req.json();
  } catch {
    return bad('جسم الطلب غير صالح');
  }

  const { request_id, decision, decided_by, line_id } = body;
  if (!request_id || !['approved', 'rejected'].includes(decision || '')) {
    return bad('request_id و decision (approved|rejected) مطلوبان');
  }

  try {
    const rows = await q<any>(
      `select r.id, r.staff_id, r.type, r.chat_jid, r.line_id, r.status,
              s.full_name as staff_name,
              l.phone_e164 as requested_phone, coalesce(l.title_ar, l.instance_name) as requested_line_title,
              coalesce(g.subject, cv.title, r.chat_jid) as group_name
       from hub.line_send_requests r
       join hub.staff s on s.id = r.staff_id
       left join hub.lines l on l.id = r.line_id
       left join hub.whatsapp_groups g on g.group_jid = r.chat_jid
       left join hub.conversations cv on cv.chat_jid = r.chat_jid
       where r.id = $1 limit 1`,
      [request_id]
    );
    const reqRow = rows[0];
    if (!reqRow) return bad('الطلب غير موجود', 404);
    if (reqRow.type !== 'group_join') return bad('هذا المسار لطلبات انضمام المجموعات فقط');
    if (reqRow.status !== 'pending') return bad('الطلب مقرر سابقاً', 409);
    if (!reqRow.chat_jid) return bad('الطلب لا يحدد مجموعة');

    if (decision === 'rejected') {
      await q(
        `update hub.line_send_requests set status = 'rejected', decided_by = $2, decided_at = now() where id = $1`,
        [request_id, decided_by || null]
      );
      await insertNotification({
        staffId: reqRow.staff_id,
        kind: 'permission_result',
        title: '⛔ رُفض: انضمام خط لمجموعة',
        body: 'بانتظارك اتباع قواعد المجموعات المعتمدة',
        link: `/inbox?chat=${encodeURIComponent(reqRow.chat_jid)}`,
        chatJid: reqRow.chat_jid,
      }).catch(() => {});
      await auditGroup('group.join.rejected', reqRow.chat_jid, decided_by || null, { request_id });
      return NextResponse.json({ success: true, decision });
    }

    // ---- الموافقة: الضم الفعلي ----
    const requesterDigits = digitsOnly(reqRow.requested_phone);
    if (!requesterDigits) {
      return NextResponse.json(
        {
          success: false,
          manual_message: `الطلب لا يحدد رقم خط واضحاً — أضف الرقم يدوياً إلى المجموعة «${reqRow.group_name}» من واتساب ثم أعد المحاولة`,
        },
        { status: 200 }
      );
    }

    // هل الخط الطالب عضو أصلاً؟
    const already = await q<{ cnt: number }>(
      `select count(*)::int as cnt from hub.whatsapp_group_members m
       join hub.lines l on l.instance_name = m.instance_name
         and l.phone_e164 is not null
         and m.phone_number = regexp_replace(l.phone_e164, '[^0-9]', '', 'g')
       where m.group_jid = $1 and l.id = $2`,
      [reqRow.chat_jid, reqRow.line_id]
    );
    if ((already[0]?.cnt || 0) > 0) {
      await q(
        `update hub.line_send_requests set status = 'approved', decided_by = $2, decided_at = now() where id = $1`,
        [request_id, decided_by || null]
      );
      return NextResponse.json({ success: true, decision, already_member: true });
    }

    // خط التنفيذ: المعطى من الواجهة أو أول خط أدمن عضو متصل
    let acting: { instance_name: string; line_title: string } | null = null;
    if (line_id) {
      const chosen = await q<any>(
        `select instance_name, coalesce(title_ar, instance_name) as line_title, phone_e164
         from hub.lines where id = $1 and status = 'connected' limit 1`,
        [line_id]
      );
      if (chosen[0]?.phone_e164 && digitsOnly(chosen[0].phone_e164) === requesterDigits) {
        return NextResponse.json(
          {
            success: false,
            manual_message: 'الخط المختار للتنفيذ هو نفسه الخط الطالب — اختر خطاً آخر عضواً أدمن في المجموعة',
          },
          { status: 200 }
        );
      }
      if (chosen[0]) acting = { instance_name: chosen[0].instance_name, line_title: chosen[0].line_title };
    }
    if (!acting) {
      const admins = await q<any>(
        `select l.instance_name, coalesce(l.title_ar, l.instance_name) as line_title
         from hub.whatsapp_group_members m
         join hub.lines l on l.instance_name = m.instance_name and l.status = 'connected'
           and l.phone_e164 is not null
           and m.phone_number = regexp_replace(l.phone_e164, '[^0-9]', '', 'g')
         where m.group_jid = $1 and (m.is_admin or m.is_super_admin)
         order by m.is_super_admin desc, m.is_admin desc
         limit 1`,
        [reqRow.chat_jid]
      );
      acting = admins[0] ? { instance_name: admins[0].instance_name, line_title: admins[0].line_title } : null;
    }
    if (!acting) {
      return NextResponse.json(
        {
          success: false,
          manual_message: `لا يوجد خط لدينا أدمن عضو في «${reqRow.group_name}» — أضف الرقم ${requesterDigits} يدوياً من واتساب ثم أعد المحاولة`,
        },
        { status: 200 }
      );
    }

    try {
      await evoFetch(`/group/updateParticipant/${encodeURIComponent(acting.instance_name)}`, {
        method: 'POST',
        body: { groupJid: reqRow.chat_jid, action: 'add', participants: [requesterDigits] },
      });
    } catch (err: any) {
      // فشل الضم — الطلب يبقى معلقاً مع رسالة إضافة يدوية واضحة (قرار المالك)
      const detail = err instanceof EvolutionError && err.detail ? ` — ${err.detail.slice(0, 200)}` : '';
      return NextResponse.json(
        {
          success: false,
          manual_message: `تعذر الضم تلقائياً (قد لا يكون خط التنفيذ أدمناً أو المجموعة مقفلة) — أضف الرقم ${requesterDigits} يدوياً إلى «${reqRow.group_name}» من واتساب خط ${acting.line_title} ثم أعد المحاولة${detail}`,
          error: err?.message,
        },
        { status: 200 }
      );
    }

    // نجاح الضم → تحديث السجل + اعتماد الطلب + إشعار الطالب
    try {
      const meta = await evoFetch<any>(
        `/group/participants/${encodeURIComponent(acting.instance_name)}?groupJid=${encodeURIComponent(reqRow.chat_jid)}`
      );
      const parts = extractParticipants(meta);
      if (parts.length > 0) {
        await rebuildGroupMembers(reqRow.chat_jid, acting.instance_name, parts, meta?.owner);
      }
    } catch (e: any) {
      console.warn('[join-decide] roster refresh non-critical:', e?.message);
    }
    await q(
      `update hub.line_send_requests set status = 'approved', decided_by = $2, decided_at = now() where id = $1`,
      [request_id, decided_by || null]
    );
    await insertNotification({
      staffId: reqRow.staff_id,
      kind: 'permission_result',
      title: '✅ تم ضم الخط للمجموعة',
      body: `انضم «${reqRow.requested_line_title || 'الخط'}» إلى «${reqRow.group_name}» — يمكنك الرد الآن من هذا الخط`,
      link: `/inbox?chat=${encodeURIComponent(reqRow.chat_jid)}`,
      chatJid: reqRow.chat_jid,
    }).catch(() => {});
    await auditGroup('group.join.approved', reqRow.chat_jid, decided_by || null, {
      request_id,
      acting_instance: acting.instance_name,
      requester_digits: requesterDigits,
    });
    return NextResponse.json({ success: true, decision, acting_instance: acting.instance_name });
  } catch (err: any) {
    console.error('[groups join-decide]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
