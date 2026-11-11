import { q } from '../pg';

/**
 * إنشاء إشعارات الموظفين — تظهر فوراً في الجرس عبر Supabase Realtime.
 */
export interface NotificationInput {
  staffId: string;
  kind: 'new_message' | 'assignment' | 'after_hours' | 'campaign' | 'system' | 'mention';
  title: string;
  body?: string;
  link?: string;
  chatJid?: string;
  instanceName?: string;
}

export async function insertNotification(n: NotificationInput): Promise<void> {
  try {
    await q(
      `insert into public.notifications (staff_id, kind, title, body, link, chat_jid, instance_name)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [n.staffId, n.kind, n.title, n.body || null, n.link || null, n.chatJid || null, n.instanceName || null]
    );
  } catch (err) {
    console.warn('[notify] non-critical:', (err as Error).message);
  }
}

/** موظفو خط معين (المخوّلون بقراءته) — تجمع التوزيع والإشعارات */
export async function getLineStaff(lineId: string): Promise<{ id: string; full_name: string }[]> {
  try {
    return await q(
      `select s.id, s.full_name
       from hub.staff s
       join hub.line_access la on la.staff_id = s.id and la.line_id = $1 and la.can_read = true
       where s.status = 'active'
       order by s.full_name
       limit 20`,
      [lineId]
    );
  } catch {
    return [];
  }
}
