import React from 'react';
import { MessageCircle, Pin, Megaphone, Moon as MoonIcon, Info, CheckSquare, CalendarClock, Truck, Receipt, WifiOff, Star, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * سجل عرض الإشعارات الموحد (الجرس + صفحة الإشعارات).
 * أي نوع جديد مستقبلاً يُضاف هنا سطراً واحداً؛ غير المسجل يعرض بأيقونة/اسم عام.
 */
export interface NotificationItem {
  id: string;
  staff_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  chat_jid?: string | null;
  instance_name?: string | null;
  read_at: string | null;
  created_at: string;
}

export const KIND_ICON: Record<string, React.ReactNode> = {
  new_message: <MessageCircle className="w-4 h-4 text-sky-400" />,
  assignment: <Pin className="w-4 h-4 text-amber-400" />,
  campaign: <Megaphone className="w-4 h-4 text-purple-400" />,
  after_hours: <MoonIcon className="w-4 h-4 text-indigo-400" />,
  mention: <MessageCircle className="w-4 h-4 text-rose-400" />,
  system: <Info className="w-4 h-4 text-slate-400" />,
  // جاهزة لأي توسع مستقبلي:
  task_assigned: <CheckSquare className="w-4 h-4 text-emerald-400" />,
  sla_warning: <CalendarClock className="w-4 h-4 text-orange-400" />,
  booking_created: <Star className="w-4 h-4 text-yellow-400" />,
  payment_received: <Receipt className="w-4 h-4 text-teal-400" />,
  line_offline: <WifiOff className="w-4 h-4 text-red-400" />,
  access_request: <ShieldAlert className="w-4 h-4 text-amber-300" />,
  line_permission_request: <ShieldAlert className="w-4 h-4 text-amber-400" />,
  line_permission_result: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
};

export const KIND_LABEL: Record<string, string> = {
  new_message: 'رسالة جديدة',
  assignment: 'إسناد محادثة',
  campaign: 'حملة',
  after_hours: 'خارج الدوام',
  mention: 'إشارة',
  system: 'نظام',
  task_assigned: 'مهمة جديدة',
  sla_warning: 'تحذير SLA',
  booking_created: 'حجز جديد',
  payment_received: 'دفعة واردة',
  line_offline: 'انقطاع خط',
  access_request: 'طلب وصول/إسناد',
  line_permission_request: 'طلب إذن رد من خط',
  line_permission_result: 'نتيجة إذن رد',
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] || kind;
}

export function kindIcon(kind: string): React.ReactNode {
  return KIND_ICON[kind] || KIND_ICON.system;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}
