/** أسماء مجموعات الصلاحيات بالعربية (مصدرها packages/contracts/permissions.json → groups_ar) */
export const GROUP_AR: Record<string, string> = {
  "inbox": "المحادثات",
  "groups": "مجموعات واتساب",
  "contacts": "جهات الاتصال",
  "lines": "خطوط واتساب",
  "inboxes": "الصناديق",
  "channels": "قنوات التواصل",
  "staff": "الموظفون",
  "roles": "الأدوار والصلاحيات",
  "signature": "توقيع الرسائل",
  "tasks": "المهام",
  "meetings": "الاجتماعات",
  "reports": "التقارير",
  "campaigns": "الحملات التسويقية",
  "audit": "سجل التدقيق",
  "settings": "إعدادات النظام",
  "canned": "الردود الجاهزة",
  "tags": "الوسوم"
};

/** صلاحيات حساسة: يُطلب تأكيد صريح قبل تفعيلها لأي دور */
export const SENSITIVE_PERMISSIONS = new Set<string>(['contacts.export','campaigns.manage','staff.manage','roles.manage','inbox.view_all','inbox.send_as','audit.view','settings.manage','groups.manage','lines.manage','inbox.revoke','inbox.approve_access','contacts.delete']);
