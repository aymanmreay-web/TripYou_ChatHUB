/** طبقة الواجهة لقسم إدارة المجموعات — أنواع + نداءات موحدة */

export interface OurLineBadge {
  instance_name: string;
  line_title: string;
  phone_e164?: string | null;
  status?: string;
  is_admin: boolean;
  is_super_admin: boolean;
  source: 'roster' | 'conversation';
}

export interface GroupItem {
  group_jid: string;
  subject: string;
  display_name?: string | null;
  picture_url?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  announcement: boolean;
  restricted: boolean;
  participant_count: number;
  invite_code?: string | null;
  invite_url?: string | null;
  synced_at?: string | null;
  line_instance?: string | null;
  our_lines: OurLineBadge[];
  pending_join: number;
}

export interface JoinRequestRow {
  id: string;
  type: string;
  type_label?: string;
  chat_jid: string;
  reason?: string | null;
  created_at: string;
  escalated: boolean;
  staff_name: string;
  line_title?: string | null;
  instance_name?: string | null;
  inbox_name?: string | null;
  chat_name?: string | null;
}

export interface LineRow {
  id: string;
  instance_name: string;
  title_ar?: string | null;
  phone_e164?: string | null;
  status: string;
}

export interface ParticipantRow {
  participant_jid: string;
  phone_number?: string | null;
  participant_name?: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  instance_name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_our_line?: boolean;
  our_line_title?: string | null;
}

/** نداء موحد لمفتاح التحويلات — يرمي رسالة عربية واضحة عند الفشل */
export async function manageGroup(payload: Record<string, unknown>): Promise<any> {
  const res = await fetch('/api/groups/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || 'فشل تنفيذ العملية على Evolution');
  }
  return json;
}

/**
 * قرار طلب انضمام — يعيد {joined} عند نجاح الضم الفعلي.
 * عند التعذر: json.success=false مع manual_message (الطلب يبقى معلقاً) → نرمي الرسالة اليدوية.
 */
export async function decideJoin(
  requestId: string,
  decision: 'approved' | 'rejected',
  lineId?: string
): Promise<{ joined: boolean; alreadyMember?: boolean }> {
  const res = await fetch('/api/groups/join-decide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id: requestId, decision, line_id: lineId || undefined }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'فشل تسجيل القرار');
  if (json?.success === false) {
    throw new Error(json?.manual_message || json?.error || 'تعذر تنفيذ الضم');
  }
  return { joined: decision === 'approved' && !json?.already_member, alreadyMember: json?.already_member };
}

/** الخط العضو الأنسب لتنفيذ عمليات مجموعة (من بيانات الصف) */
export function actingInstance(group: GroupItem): string | null {
  const roster = group.our_lines.find((l) => l.source === 'roster');
  return group.line_instance || roster?.instance_name || null;
}

export const fmtDigits = (phone?: string | null): string => (phone || '').replace(/[^0-9]/g, '');
