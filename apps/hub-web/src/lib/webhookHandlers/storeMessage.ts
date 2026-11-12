import { q } from '../pg';

/**
 * تخزين رسائل Evolution في قاعدة البيانات (المحادثات + الرسائل) بشكل ذري.
 * هذا هو الحجر الأساسي للإشعارات والمؤشرات والتوزيع التلقائي والرد الآلي.
 */

export interface InboundMessage {
  instance: string;
  chatJid: string;
  waMessageId: string;
  fromMe: boolean;
  senderJid: string | null;
  senderName: string | null;
  body: string;
  mediaType: string;
  raw: any;
}

export interface StoredMessageResult {
  stored: boolean;
  conversationId: string | null;
  lineId: string | null;
  unreadCount: number | null;
  assignedStaffId: string | null;
  firstUnread: boolean; // صحيح إذا كان هذا أول رسالة غير مقروءة (للإشعار دون إزعاج)
  isGroup: boolean;
}

const GROUP_SUFFIX = '@g.us';

export function isGroupJid(jid: string): boolean {
  return typeof jid === 'string' && jid.endsWith(GROUP_SUFFIX);
}

/** تجاهل المحادثات غير الحقيقية (حالات النظام، القنوات، برودكاست) */
export function isIgnorableJid(jid: string | undefined | null): boolean {
  if (!jid) return true;
  return (
    jid === 'status@broadcast' ||
    jid.endsWith('@broadcast') ||
    jid.endsWith('@newsletter') ||
    jid.endsWith('@status')
  );
}

/** تحويل نوع رسالة Evolution إلى media_type في قاعدتنا */
export function mapMediaType(messageType: string | undefined): string {
  switch (messageType) {
    case 'conversation':
    case 'extendedTextMessage':
    case 'protocolMessage':
      return 'text';
    case 'imageMessage':
      return 'image';
    case 'audioMessage':
    case 'pttMessage':
      return 'audio';
    case 'videoMessage':
      return 'video';
    case 'documentMessage':
    case 'documentWithCaptionMessage':
      return 'document';
    case 'locationMessage':
    case 'liveLocationMessage':
      return 'location';
    case 'stickerMessage':
      return 'sticker';
    default:
      return 'other';
  }
}

/** استخراج نص الرسالة من كائن message المتداخل */
export function extractBody(message: any): string {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.documentWithCaptionMessage?.caption ||
    ''
  );
}

/** تطبيع حدث رسالة من Evolution v2 (يدعم data كائناً أو مصفوفة) */
export function normalizeEvolutionMessage(instance: string, data: any): InboundMessage | null {
  const key = data?.key;
  if (!key?.remoteJid || !key?.id) return null;
  if (isIgnorableJid(key.remoteJid)) return null;
  return {
    instance,
    chatJid: key.remoteJid,
    waMessageId: key.id,
    fromMe: !!key.fromMe,
    senderJid:
      key.participantAlt ||
      key.participant ||
      (key.fromMe ? null : key.remoteJid),
    senderName: data.pushName || null,
    body: extractBody(data.message) || '',
    mediaType: mapMediaType(data.messageType),
    raw: data,
  };
}

/**
 * التخزين الذري: يضمن المحادثة (upsert) ثم يدرج الرسالة (idempotent عبر unique).
 * يزيد unread_count للرسائل الواردة فقط، ويحدّث آخر رسالة دائماً.
 */
export async function storeMessageRecord(msg: InboundMessage): Promise<StoredMessageResult> {
  const isGroup = isGroupJid(msg.chatJid);
  const direction = msg.fromMe ? 'out' : 'in';
  const title = msg.senderName || (isGroup ? 'مجموعة' : msg.chatJid.split('@')[0]);

  const rows = await q<any>(
    `with line as (
       select id from hub.lines where instance_name = $1 limit 1
     ), conv as (
       insert into hub.conversations
         (chat_jid, line_id, title, is_group, last_message_text, last_message_at, last_customer_message_at, unread_count)
       values ($2, (select id from line), $3, $4, $5, now(),
               case when $6 then now() else null end,
               case when $6 then 1 else 0 end)
       on conflict (chat_jid, line_id) do update set
         last_message_text = excluded.last_message_text,
         last_message_at = excluded.last_message_at,
         last_customer_message_at = case when $6 then now() else hub.conversations.last_customer_message_at end,
         unread_count = case when $6 then hub.conversations.unread_count + 1 else hub.conversations.unread_count end
       returning id, unread_count, assigned_staff_id
     ), msg as (
       insert into hub.messages
         (conversation_id, chat_jid, wa_message_id, line_id, sender_jid, sender_name,
          direction, body, media_type, raw_payload, is_auto)
       select conv.id, $2, $7, (select id from line), $8, $3, $9, $5, $10, $11, false
       from conv
       on conflict (chat_jid, wa_message_id) do nothing
       returning 1
     )
     select conv.id as conversation_id, conv.unread_count, conv.assigned_staff_id,
            (select id from line) as line_id,
            exists (select 1 from msg) as stored
     from conv`,
    [
      msg.instance,
      msg.chatJid,
      title,
      isGroup,
      msg.body || (msg.mediaType !== 'text' ? `[${msg.mediaType}]` : ''),
      direction === 'in',
      msg.waMessageId,
      msg.senderJid,
      direction,
      msg.mediaType,
      JSON.stringify(msg.raw ?? {}),
    ]
  );

  if (rows.length > 0) {
    const r = rows[0];
    const unread = Number(r.unread_count ?? 0);
    const direction = msg.fromMe ? 'out' : 'in';
    return {
      stored: r.stored === true,
      conversationId: r.conversation_id ?? null,
      lineId: r.line_id ?? null,
      unreadCount: unread,
      assignedStaffId: r.assigned_staff_id ?? null,
      firstUnread: unread === 1 && direction === 'in',
      isGroup,
    };
  }

  // الرسالة مكررة (مخزنة سابقاً) — نرجع حالة المحادثة فقط
  const conv = await q<any>(
    `select c.id, c.unread_count, c.assigned_staff_id, c.line_id
     from hub.conversations c
     join hub.lines l on l.id = c.line_id
     where c.chat_jid = $1 and l.instance_name = $2 limit 1`,
    [msg.chatJid, msg.instance]
  );
  return {
    stored: false,
    conversationId: conv[0]?.id ?? null,
    lineId: conv[0]?.line_id ?? null,
    unreadCount: conv[0] ? Number(conv[0].unread_count) : null,
    assignedStaffId: conv[0]?.assigned_staff_id ?? null,
    firstUnread: false,
    isGroup,
  };
}

/** تخزين رسالة صادرة أرسلها موظف من صندوق المنصة (لأغراض المؤشرات) */
export async function storeOutboundStaffMessage(opts: {
  instance: string;
  chatJid: string;
  waMessageId: string;
  staffId: string | null;
  body: string;
  mediaType?: string;
  signature?: string | null;
  isAuto?: boolean;
}): Promise<void> {
  try {
    const isGroup = isGroupJid(opts.chatJid);
    await q(
      `with line as (
         select id from hub.lines where instance_name = $1 limit 1
       ), conv as (
         insert into hub.conversations
           (chat_jid, line_id, title, is_group, last_message_text, last_message_at)
         values ($2, (select id from line), $2, $7, $3, now())
         on conflict (chat_jid, line_id) do update set
           last_message_text = excluded.last_message_text,
           last_message_at = excluded.last_message_at
         returning id
       )
       insert into hub.messages
         (conversation_id, chat_jid, wa_message_id, line_id, direction, body,
          media_type, sent_by, signature, is_auto)
       select conv.id, $2, $4, (select id from line), 'out', $3, $5, $6, $8, $9
       from conv
       on conflict (chat_jid, wa_message_id) do nothing`,
      [
        opts.instance,
        opts.chatJid,
        opts.body || '',
        opts.waMessageId,
        opts.mediaType || 'text',
        opts.staffId,
        isGroup,
        opts.signature || null,
        !!opts.isAuto,
      ]
    );
  } catch (err) {
    // التخزين هنا تحسين للمؤشرات — لا نعطل الإرسال أبداً
    console.warn('[storeOutboundStaffMessage] non-critical:', (err as Error).message);
  }
}
