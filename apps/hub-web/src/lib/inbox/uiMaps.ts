/**
 * خرائط الواجهة الموحدة للصندوق — المصدر الوحيد لألوان الحالات ومستويات SLA.
 * تحل محل الخرائط الثلاث المتضاربة (صف القائمة، ترويسة المحادثة، القائمة المنسدلة).
 * الألوان من نظام v1 المعتمد: مفتوحة أزرق · معالجة كهرماني · محلولة أخضر · مؤجلة سماوي · مصعدة أحمر نابض.
 */
import { ConversationStatus } from '../../types';

export interface StatusMeta {
  label: string;
  badge: string;
}

export const STATUS_META: Record<ConversationStatus, StatusMeta> = {
  open: {
    label: 'مفتوحة',
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  },
  in_progress: {
    label: 'قيد المعالجة',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  pending: {
    label: 'بانتظار الموافقة',
    badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  },
  resolved: {
    label: 'تم الحل',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  snoozed: {
    label: 'مؤجلة',
    badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  },
  escalated: {
    label: 'مصعدة',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse',
  },
};

export function statusLabel(status: ConversationStatus | undefined): string {
  return (status && STATUS_META[status]?.label) || 'مفتوحة';
}

export function statusBadge(status: ConversationStatus | undefined): string {
  return (status && STATUS_META[status]?.badge) || STATUS_META.open.badge;
}

/* ── مستويات مهلة الاستجابة (نظام v1): أخضر < 5 د · كهرماني < 10 د · أحمر نابض بعدها ── */

export type SlaLevel = 'normal' | 'warning' | 'critical' | 'resolved';

export const SLA_WARN_MIN = 5;
export const SLA_CRITICAL_MIN = 10;

export function slaLevelFor(minutes: number, status?: ConversationStatus): SlaLevel {
  if (status === 'resolved') return 'resolved';
  if (minutes >= SLA_CRITICAL_MIN) return 'critical';
  if (minutes >= SLA_WARN_MIN) return 'warning';
  return 'normal';
}

/** أصناف حبة العدّاد حسب المستوى — موحدة بين الترويسة وصفوف القائمة */
export const SLA_PILL_CLASS: Record<SlaLevel, string> = {
  normal: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  critical: 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse',
  resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

/** الحالات التي يُعرض لها العدّاد (نظام v1) — المؤجلة والمحلولة بلا عدّاد */
export function slaAppliesTo(status: ConversationStatus): boolean {
  return status === 'open' || status === 'in_progress' || status === 'escalated';
}
