import { NextResponse } from 'next/server';
import { q } from './pg';
import { Caller, can } from './serverAuth';

/**
 * فحص النطاق على الخادم: تصريح الخط + ملكية المحادثة.
 * LINE_ACCESS_MODE=off يوقف فحص الخطوط مؤقتاً (للنشر التدريجي قبل تعبئة line_access).
 */
const FORBID = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });

export async function lineScope(caller: Caller, instance: string): Promise<{ read: boolean; send: boolean }> {
  if (caller.isSuper || process.env.LINE_ACCESS_MODE === 'off') return { read: true, send: true };
  if (!instance) return { read: false, send: false };
  const rows = await q<{ can_read: boolean; can_send: boolean }>(
    `select la.can_read, la.can_send
       from hub.line_access la
       join hub.lines l on l.id = la.line_id
      where la.staff_id = $1 and l.instance_name = $2
      limit 1`,
    [caller.staffId, instance]
  );
  return { read: !!rows[0]?.can_read, send: !!rows[0]?.can_send };
}

/** يعيد null إذا مسموح، وإلا استجابة 403 */
export async function denyLine(caller: Caller, instance: string, mode: 'read' | 'send'): Promise<NextResponse | null> {
  const s = await lineScope(caller, instance);
  if (mode === 'read' ? s.read : s.send) return null;
  return FORBID(mode === 'read' ? 'لا تملك تصريحاً بهذا الخط' : 'لا تملك تصريح الإرسال من هذا الخط');
}

/** الخطوط التي يراها الموظف (للقوائم) */
export async function readableInstances(caller: Caller): Promise<string[] | 'all'> {
  if (caller.isSuper || process.env.LINE_ACCESS_MODE === 'off') return 'all';
  const rows = await q<{ instance_name: string }>(
    `select l.instance_name from hub.line_access la join hub.lines l on l.id = la.line_id
      where la.staff_id = $1 and la.can_read = true`,
    [caller.staffId]
  );
  return rows.map((r) => r.instance_name);
}

/**
 * وصول لمحادثة محددة: تصريح الخط، ثم الملكية.
 * المحادثة المسندة لزميل لا يراها إلا من يملك «رؤية جميع المحادثات» أو من مُنح طلباً معتمداً عليها.
 */
export async function denyConversation(
  caller: Caller,
  chatJid: string,
  instance: string,
  mode: 'read' | 'send'
): Promise<NextResponse | null> {
  const line = await denyLine(caller, instance, mode);
  if (line) return line;
  if (caller.isSuper || can(caller, 'inbox.view_all')) return null;

  const rows = await q<{ assigned_staff_id: string | null }>(
    `select c.assigned_staff_id
       from hub.conversations c join hub.lines l on l.id = c.line_id
      where c.chat_jid = $1 and l.instance_name = $2 limit 1`,
    [chatJid, instance]
  );
  const owner = rows[0]?.assigned_staff_id ?? null;
  if (!owner || owner === caller.staffId) return null; // غير مسندة (للاقتناص) أو مسندة له

  const grant = await q(
    `select 1 from hub.line_send_requests
      where staff_id = $1 and chat_jid = $2 and status = 'approved'
        and type in ('read','read_write','line_reply') limit 1`,
    [caller.staffId, chatJid]
  );
  return grant.length ? null : FORBID('هذه المحادثة مسندة لموظف آخر — اطلب صلاحية القراءة');
}
