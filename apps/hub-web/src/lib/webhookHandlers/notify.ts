import { q } from '../pg';

/**
 * بنية الإشعارات العامة (Generic Notifications Hub) — تظهر فوراً في الجرس عبر Supabase Realtime.
 *
 * `kind` حقل حر في القاعدة (بلا قيد) — أي ميزة مستقبلية تمرر نوعها الجديد
 * دون أي تعديل على المخطط، والواجهة تعرض أيقونة/اسم عام لغير المسجل.
 * أمثلة مستقبلية: task_assigned, sla_warning, booking_created, payment_received,
 * campaign_done, line_offline, mention ...
 */
export interface NotificationInput {
  staffId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  chatJid?: string;
  instanceName?: string;
}

export type NotifyPayload = Omit<NotificationInput, 'staffId'>;

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

/** إشعار مجموعة معرفات موظفين دفعة واحدة — يرجع عدد الصفوف المدرجة */
export async function notifyStaffIds(staffIds: string[], payload: NotifyPayload): Promise<number> {
  if (!staffIds.length) return 0;
  try {
    const res = await q(
      `insert into public.notifications (staff_id, kind, title, body, link, chat_jid, instance_name)
       select sid, $2, $3, $4, $5, $6, $7
       from unnest($1::uuid[]) as sid`,
      [
        staffIds,
        payload.kind,
        payload.title,
        payload.body || null,
        payload.link || null,
        payload.chatJid || null,
        payload.instanceName || null,
      ]
    );
    return res.length;
  } catch (err) {
    console.warn('[notifyStaffIds] non-critical:', (err as Error).message);
    return 0;
  }
}

/** إشعار كل موظفي دور معين (مفتاح الدور من جدول الأدوار) */
export async function notifyRole(roleKey: string, payload: NotifyPayload): Promise<number> {
  try {
    const rows = await q<{ id: string }>(
      `select s.id from hub.staff s join hub.roles r on r.id = s.role_id
       where r.key = $1 and s.status = 'active' limit 50`,
      [roleKey]
    );
    return await notifyStaffIds(rows.map((r) => r.id), payload);
  } catch {
    return 0;
  }
}

/** إشعار كل الموظفين النشطين (بث عام) */
export async function notifyAllActive(payload: NotifyPayload): Promise<number> {
  try {
    const rows = await q<{ id: string }>(`select id from hub.staff where status = 'active' limit 100`);
    return await notifyStaffIds(rows.map((r) => r.id), payload);
  } catch {
    return 0;
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
