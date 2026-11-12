import { NextResponse } from 'next/server';
import {
  normalizeEvolutionMessage,
  storeMessageRecord,
  isIgnorableJid,
  type InboundMessage,
} from '../../../../lib/webhookHandlers/storeMessage';
import { insertNotification, getLineStaff } from '../../../../lib/webhookHandlers/notify';
import { tryAutoAssign } from '../../../../lib/webhookHandlers/autoAssign';
import { handleAfterHours } from '../../../../lib/webhookHandlers/afterHours';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// مخزن تصحيح/مراقبة مؤقت لآخر الأحداث (يظل موجوداً للفحص اليدوي فقط)
const webhookEvents: any[] = [];

/**
 * نقطة استقبال ويب هوك Evolution API — نقطة الدخول الوحيدة للبيانات الحية.
 * تخزن الرسائل والمحادثات في القاعدة ثم تطلق:
 *   1) الإشعارات (الجرس الفوري)
 *   2) التوزيع التلقائي (دائري حسب تخصص الخط)
 *   3) الرد الآلي خارج الدوام + تمرير n8n
 */
export async function POST(req: Request) {
  let event: any = null;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  try {
    const eventName: string = event?.event || '';
    const instance: string = event?.instance || '';

    webhookEvents.push({ ...event, receivedAt: new Date().toISOString() });
    if (webhookEvents.length > 100) webhookEvents.splice(0, webhookEvents.length - 100);

    if (eventName === 'messages.upsert' && instance && event?.data) {
      // Evolution v2 قد يرسل data كائناً واحداً أو مصفوفة رسائل
      const dataList: any[] = Array.isArray(event.data) ? event.data : [event.data];
      const messages: InboundMessage[] = dataList
        .map((d) => normalizeEvolutionMessage(instance, d))
        .filter((m): m is InboundMessage => !!m && !isIgnorableJid(m.chatJid));

      for (const msg of messages) {
        await processOneInbound(instance, msg, event);
      }
    } else if (eventName === 'messages.update' && instance && Array.isArray(event?.data)) {
      // تحديث حالات التسليم (delivered/read) — تحسين بسيط لدقة المؤشرات
      for (const d of event.data) {
        const status = d?.status;
        const id = d?.key?.id;
        if (!id || !status) continue;
        try {
          const { q } = await import('../../../../lib/pg');
          if (['delivered', 'read'].includes(status)) {
            await q(`update hub.messages set status = $2 where chat_jid = $3 and wa_message_id = $1 and direction = 'out'`, [id, status, d.key.remoteJid || '']);
          }
        } catch { /* غير حرج */ }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // لا نعيد خطأ لـ Evolution — إعادة المحاولة قد تسبب ازدواج معالجة، والخطأ مسجل
    console.error('[Webhook] processing error:', err?.message);
    return NextResponse.json({ ok: true, warning: err?.message });
  }
}

/** معالجة رسالة واردة واحدة: تخزين + إشعار + إسناد + رد خارج الدوام */
async function processOneInbound(instance: string, msg: InboundMessage, originalEvent: any) {
  const stored = await storeMessageRecord(msg);
  const displayName = msg.senderName || msg.chatJid.split('@')[0];

  // لا إشعارات/أتمتة لرسائلنا الصادرة
  if (msg.fromMe) return;

  // 1) الإشعارات: للموظف المسند عند رسالة بعد انقطاع، أو للفريق عند أول غير مقروء لمحادثة غير مسندة
  if (stored.conversationId) {
    const gapCheck = await (await import('../../../../lib/pg')).q(
      `select cv.last_customer_message_at, now() - cv.last_customer_message_at as gap,
              coalesce(nullif(c.display_name, ''), nullif(cv.title, '')) as conv_name
       from hub.conversations cv
       left join hub.contacts c on c.id = cv.contact_id
       where cv.id = $1 limit 1`,
      [stored.conversationId]
    );
    const gapMin = gapCheck[0]?.gap ? Number(gapCheck[0].gap) / 60000 : 9999;
    const isNewConversation = !!gapCheck[0] && !gapCheck[0].last_customer_message_at;
    const meaningful = stored.firstUnread || isNewConversation || gapMin >= 5;
    // م8: اسم المحادثة من القاعدة (جهة الاتصال المسجلة) وإلا اسم المرسل وإلا الرقم
    const convName = gapCheck[0]?.conv_name;
    const displayName =
      convName && !/^[0-9+@ ]+$/.test(convName)
        ? convName
        : msg.senderName || msg.chatJid.split('@')[0];

    if (stored.assignedStaffId && meaningful) {
      await insertNotification({
        staffId: stored.assignedStaffId,
        kind: 'new_message',
        title: `💬 رسالة جديدة من ${displayName}`,
        body: msg.body ? msg.body.slice(0, 80) : `[${msg.mediaType}]`,
        link: `/inbox?chat=${encodeURIComponent(msg.chatJid)}`,
        chatJid: msg.chatJid,
        instanceName: instance,
      });
    } else if (!stored.assignedStaffId && stored.firstUnread && stored.lineId) {
      const staff = await getLineStaff(stored.lineId);
      for (const s of staff.slice(0, 10)) {
        await insertNotification({
          staffId: s.id,
          kind: 'new_message',
          title: `🔔 محادثة جديدة بانتظار الإسناد`,
          body: `${displayName} — ${msg.body ? msg.body.slice(0, 60) : `[${msg.mediaType}]`}`,
          link: `/inbox?chat=${encodeURIComponent(msg.chatJid)}`,
          chatJid: msg.chatJid,
          instanceName: instance,
        });
      }
    }
  }

  // 2) التوزيع التلقائي (للمحادثات غير المسندة)
  let assignedName: string | null = null;
  if (stored.conversationId && stored.lineId && !stored.assignedStaffId) {
    const assign = await tryAutoAssign({
      conversationId: stored.conversationId,
      lineId: stored.lineId,
      instanceName: instance,
      chatJid: msg.chatJid,
      contactName: displayName,
      isGroup: stored.isGroup,
    });
    assignedName = assign.staffName;
  }

  // 3) الرد الآلي خارج الدوام + n8n (يُنفذ للرسائل الواردة الحقيقية فقط)
  await handleAfterHours({
    lineId: stored.lineId,
    instanceName: instance,
    chatJid: msg.chatJid,
    contactName: displayName,
    isGroup: stored.isGroup,
    originalEvent: { ...originalEvent, assigned_to: assignedName },
  });

  console.log(
    `[Webhook] stored=${stored.stored} conv=${stored.conversationId?.slice(0, 8)} unread=${stored.unreadCount} assigned=${assignedName || stored.assignedStaffId || '-'}`
  );
}

export async function GET() {
  return NextResponse.json({ events: webhookEvents.slice(-50) });
}
