import { ModuleContract, StaffMe, WhatsAppLine, RoadmapInfo } from '../types';

/**
 * Raw modules definition mirroring packages/contracts/modules.json
 */
export const RAW_MODULES: ModuleContract[] = [
  { key: 'inbox', area: 'user', title_ar: 'المحادثات', status: 'live', required_permission: 'inbox.view', sort: 10 },
  { key: 'contacts', area: 'user', title_ar: 'جهات الاتصال', status: 'coming_soon', required_permission: 'contacts.view', sort: 20 },
  { key: 'tasks', area: 'user', title_ar: 'المهام', status: 'coming_soon', required_permission: 'tasks.view', sort: 30 },
  { key: 'meetings', area: 'user', title_ar: 'الاجتماعات', status: 'coming_soon', required_permission: 'meetings.view', sort: 40 },
  { key: 'my_reports', area: 'user', title_ar: 'تقاريري', status: 'coming_soon', required_permission: 'reports.view_own', sort: 50 },
  { key: 'campaigns', area: 'user', title_ar: 'الحملات', status: 'coming_soon', required_permission: 'campaigns.view', sort: 60 },
  { key: 'notifications', area: 'user', title_ar: 'الإشعارات', status: 'coming_soon', required_permission: null, sort: 70 },
  { key: 'profile', area: 'user', title_ar: 'ملفي', status: 'live', required_permission: null, sort: 80 },
  { key: 'admin_dashboard', area: 'admin', title_ar: 'لوحة الإدارة', status: 'beta', required_permission: 'settings.manage', sort: 110 },
  { key: 'lines', area: 'admin', title_ar: 'الخطوط', status: 'coming_soon', required_permission: 'lines.view', sort: 120 },
  { key: 'inboxes', area: 'admin', title_ar: 'الصناديق', status: 'coming_soon', required_permission: 'inboxes.manage', sort: 130 },
  { key: 'groups_admin', area: 'admin', title_ar: 'المجموعات', status: 'coming_soon', required_permission: 'groups.manage', sort: 140 },
  { key: 'staff', area: 'admin', title_ar: 'الموظفون', status: 'coming_soon', required_permission: 'staff.view', sort: 150 },
  { key: 'roles', area: 'admin', title_ar: 'الأدوار والصلاحيات', status: 'coming_soon', required_permission: 'roles.manage', sort: 160 },
  { key: 'signature', area: 'admin', title_ar: 'التوقيع', status: 'coming_soon', required_permission: 'signature.manage', sort: 170 },
  { key: 'contacts_admin', area: 'admin', title_ar: 'إدارة جهات الاتصال', status: 'coming_soon', required_permission: 'contacts.manage', sort: 180 },
  { key: 'channels', area: 'admin', title_ar: 'قنوات التواصل', status: 'coming_soon', required_permission: 'channels.manage', sort: 190 },
  { key: 'reports', area: 'admin', title_ar: 'التقارير', status: 'coming_soon', required_permission: 'reports.view_all', sort: 200 },
  { key: 'audit', area: 'admin', title_ar: 'سجل التدقيق', status: 'coming_soon', required_permission: 'audit.view', sort: 210 },
  { key: 'settings', area: 'admin', title_ar: 'الإعدادات', status: 'coming_soon', required_permission: 'settings.manage', sort: 220 },
  { key: 'health', area: 'admin', title_ar: 'صحة النظام', status: 'coming_soon', required_permission: 'system.health', sort: 230 },
  { key: 'campaigns_admin', area: 'admin', title_ar: 'إدارة الحملات', status: 'coming_soon', required_permission: 'campaigns.manage', sort: 240 }
];

/**
 * Mock Profiles for GET /me with masked personal data
 */
export const MOCK_USERS: Record<string, StaffMe> = {
  super_admin: {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    full_name: 'أيمن المرعي',
    role: 'super_admin',
    role_title_ar: 'مسؤول النظام الأعلى (Super Admin)',
    email_masked: 'a***@resvbar.com',
    phone_masked: '+966 50 *** 1001',
    default_line_id: 'line-01',
    working_hours: '09:00 ص - 06:00 م',
    permissions: [
      'inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.view_all', 'inbox.send_as',
      'groups.view', 'groups.send', 'groups.manage', 'groups.policy',
      'contacts.view', 'contacts.manage', 'contacts.import', 'contacts.export',
      'lines.view', 'lines.create', 'lines.manage', 'lines.delete',
      'inboxes.manage', 'channels.manage',
      'staff.view', 'staff.manage',
      'roles.manage', 'permissions.override',
      'signature.manage',
      'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.manage_all',
      'meetings.view', 'meetings.create',
      'reports.view_own', 'reports.view_team', 'reports.view_all', 'reports.schedule',
      'campaigns.view', 'campaigns.manage',
      'audit.view', 'settings.manage', 'integrations.manage',
      'system.health', 'modules.manage', 'notifications.manage_templates'
    ],
  },
  sales_lead: {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    full_name: 'سارة القحطاني',
    role: 'sales_lead',
    role_title_ar: 'مشرفة مبيعات (Sales Lead)',
    email_masked: 's***@resvbar.com',
    phone_masked: '+966 55 *** 2045',
    default_line_id: 'line-02',
    working_hours: '08:30 ص - 05:00 م',
    permissions: [
      'inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.send_as',
      'groups.view', 'groups.send',
      'contacts.view',
      'tasks.view', 'tasks.create',
      'meetings.view', 'meetings.create',
      'reports.view_own', 'reports.view_team',
      'campaigns.view'
    ],
  },
  support_agent: {
    id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    full_name: 'خالد العمري',
    role: 'support_agent',
    role_title_ar: 'ممثل خدمة عملاء (Support Agent)',
    email_masked: 'k***@resvbar.com',
    phone_masked: '+966 54 *** 3389',
    default_line_id: 'line-03',
    working_hours: '01:00 م - 09:30 م',
    permissions: [
      'inbox.view', 'inbox.reply',
      'tasks.view',
      'reports.view_own'
    ],
  },
  restricted_readonly: {
    id: 'e2d3b4c5-6789-40ab-8cde-123456789abc',
    full_name: 'محمد الدوسري',
    role: 'trainee',
    role_title_ar: 'متدرب / مشاهد فقط (Trainee)',
    email_masked: 'm***@resvbar.com',
    phone_masked: '+966 59 *** 9901',
    default_line_id: 'line-01',
    working_hours: '10:00 ص - 04:00 م',
    permissions: [
      'inbox.view'
    ],
  }
};

/**
 * Mock Connected WhatsApp Lines
 */
export const MOCK_LINES: WhatsAppLine[] = [
  {
    id: 'line-01',
    title_ar: 'خط الحجوزات والمبيعات (الرئيسي)',
    phone_masked: '+966 50 *** 8811',
    kind: 'primary',
    status: 'online',
    unread_count: 5,
    battery_level: 94,
  },
  {
    id: 'line-02',
    title_ar: 'خط خدمة العملاء والدعم الفني',
    phone_masked: '+966 55 *** 4422',
    kind: 'support',
    status: 'online',
    unread_count: 2,
    battery_level: 82,
  },
  {
    id: 'line-03',
    title_ar: 'خط العروض والتسويق (Second)',
    phone_masked: '+966 54 *** 7733',
    kind: 'promo',
    status: 'warning',
    unread_count: 0,
    battery_level: 48,
  },
];

/**
 * Coming soon roadmap metadata extracted directly from docs/00-PLAN.md
 */
export const MODULE_ROADMAP_DETAILS: Record<string, RoadmapInfo> = {
  contacts: {
    version: 'الإصدار v0.3',
    description_ar: 'طبقة جهات اتصال موحدة لجميع أرقام واتساب مع استيراد نظيف وتحقق آمن.',
    features_ar: [
      'استيراد جهات الاتصال عبر CSV و vCard المصدّر من الهواتف',
      'تطبيع تلقائي للأرقام بالصيغة الدولية E.164 (+9665...) لمنع الأخطاء',
      'صلاحيات قراءة مشتركة لجميع الموظفين وصلاحيات تعديل محصورة بالمسؤول',
      'فحص تدريجي ذكي لواتساب لمنع حظر الأرقام في خطوط Baileys'
    ],
    technical_note_ar: 'تزامن جهات الاتصال كطبقة عرض Hub لمنع الاعتماد على مزامنة الهاتف غير المستقرة.'
  },
  tasks: {
    version: 'الإصدار v0.6',
    description_ar: 'نظام إدارة مهام مرن متكامل لحظياً مع سير محادثات العملاء.',
    features_ar: [
      'إنشاء المهام من داخل المحادثة بضغطة زر واحدة وإسنادها للموظف المناسب',
      'إشعارات فورية عبر نظام Realtime عند إسناد أو تحديث أي مهمة',
      'أولويات ذكية، تواريخ استحقاق، وربط تلقائي برقم العميل',
      'لوحة متابعة لإنجاز المهام وسرعة إغلاق التذاكر'
    ]
  },
  meetings: {
    version: 'الإصدار v0.6',
    description_ar: 'جدولة اجتماعات Google Meet الفورية وإرسال الروابط للعملاء مباشرة.',
    features_ar: [
      'توليد روابط Google Meet مباشرة عبر Google Calendar API',
      'إرسال رابط الاجتماع فوراً كنص عادي في محادثة واتساب العميل',
      'تذكير آلي للطرفين قبل موعد الاجتماع بساعة و 15 دقيقة',
      'سجل شامل لكافة الاجتماعات المنعقدة وتفاصيل الحضور'
    ]
  },
  my_reports: {
    version: 'الإصدار v0.7',
    description_ar: 'لوحة الأداء الفردي ومؤشرات الإنجاز لممثل خدمة العملاء.',
    features_ar: [
      'متوسط سرعة الاستجابة الأولى (First Response Time)',
      'إجمالي المحادثات المعالجة يومياً وأسبوعياً',
      'معدل رضا العملاء ونسبة إغلاق التذاكر من أول رد',
      'مقارنة الأداء بمتوسط فريق العمل'
    ]
  },
  campaigns: {
    version: 'الإصدار اللاحق (مرحلة الترويج)',
    description_ar: 'محرك حملات ترويجية ذكي يحمي الخطوط من الحظر بواسطة حاكم الإرسال (SendGovernor).',
    features_ar: [
      'جدولة الرسائل الترويجية لشرائح محددة من جهات الاتصال',
      'حاكم الإرسال (SendGovernor): تأخير عشوائي وتدفّق محكوم لكل خط',
      'تسخين الخطوط الجديدة (Warm-up) وقواطع دائرة لمنع تجاوز الحدود',
      'تحليلات تسليم وقراءة وتفاعل العملاء مع كل حملة'
    ]
  },
  notifications: {
    version: 'الإصدار v0.6',
    description_ar: 'مركز إشعارات مركزي لجميع تنبيهات المحادثات والمهام وتحديثات النظام.',
    features_ar: [
      'إشعارات سطح المكتب والهاتف عبر PWA Web Push',
      'تنبيهات انقطاع خطوط واتساب أو تدني نسبة البطارية',
      'تنبيهات الإسناد المباشر والمحادثات المعلّقة لأكثر من 5 دقائق',
      'تخصيص قنوات التنبيه لكل موظف وفق ساعات دوامه'
    ]
  },
  lines: {
    version: 'الإصدار v0.4',
    description_ar: 'مزوّد الخطوط الذكي (Line Provisioner) لربط وإدارة حتى 10 خطوط واتساب.',
    features_ar: [
      'ربط خط جديد بـ 4 خطوات بسيطة: قالب -> Evolution -> صندوق Chatwoot -> مسح QR',
      'مراقبة لحظية لحالة اتصال الخط والبطارية وجودة الجلسة',
      'إعادة تشغيل الجلسات المتعثرة بنقرة زر بدون فقد البيانات',
      'تخصيص أسماء وألوان وشارات تمييز لكل رقم'
    ]
  },
  inboxes: {
    version: 'الإصدار v0.4',
    description_ar: 'إدارة صناديق المحادثات وتنظيم توزيع الرسائل بين فرق العمل.',
    features_ar: [
      'ربط كل خط واتساب بصندوق مخصص أو مشترك',
      'تحديد صلاحيات الوصول لكل صندوق (عرض فقط، رد، إرسال باسم الخط)',
      'قواعد توزيع الرسائل التلقائية بين موظفي الوردية',
      'مزامنة فورية لحالات الصناديق مع منصة Chatwoot الخلفية'
    ]
  },
  groups_admin: {
    version: 'الإصدار v0.5',
    description_ar: 'تحكم ذكي بالمجموعات مع فصل مالك الاستقبال عن صلاحية الإرسال من أرقام أخرى.',
    features_ar: [
      'فصل مالك الاستقبال (Ingest Owner) عن صلاحيات الإرسال المتعددة',
      'إرسال رسائل في المجموعة من أي خط عضو مع خيار "أرسل عبر"',
      'محرك منع تكرار الرسائل المتقدم لحماية السيرفر من تضخم البيانات',
      'سياسات محكمة لمن يحق له إنشاء أو تعديل المجموعات'
    ]
  },
  staff: {
    version: 'الإصدار v0.4',
    description_ar: 'إدارة بيانات فريق العمل وتوزيع الخطوط وساعات الدوام.',
    features_ar: [
      'جدول الموظفين، الحسابات المرتبطة، الخط الافتراضي لكل موظف',
      'تحديد ساعات العمل الرسمية وإيقاف إسناد المحادثات بعد انتهاء الوردية',
      'سجل تتبع أداء وسرعة استجابة كل موظف',
      'إدارة أذونات الوصول والربط بحسابات Chatwoot'
    ]
  },
  roles: {
    version: 'الإصدار v0.2',
    description_ar: 'مصفوفة الأدوار والصلاحيات الدقيقة المبنية على قاعدة RBAC.',
    features_ar: [
      '42 صلاحية دقيقة مصنفة في 9 مجموعات وظيفية',
      '9 أدوار قياسية مسبقة الإعداد (مسؤول أعلى، مبيعات، دعم، إلخ)',
      'إمكانية إضافة استثناءات خاصة لموظف معين مع سياسة الرفض يغلب',
      'مطابقة الصلاحيات مع أذونات الصناديق في Chatwoot تلقائياً'
    ]
  },
  signature: {
    version: 'الإصدار v0.2',
    description_ar: 'محرك التوقيع التلقائي ثلاثي الأجزاء للرسائل الصادرة.',
    features_ar: [
      'توقيع ثلاثي: اسم خط الإرسال + ترتيب الرقم في القسم + اسم الموظف',
      'قوالب توقيع مخصصة حسب النطاق (عام، خط محدد، قسم، نوع حساب)',
      'فصل التوقيع للرسائل الخاصة عن المجموعات',
      'تعطيل signMsg في Evolution لمنع تكرار التوقيع'
    ]
  },
  contacts_admin: {
    version: 'الإصدار v0.3',
    description_ar: 'لوحة التحكم الإدارية بقواعد بيانات جهات الاتصال والأمان.',
    features_ar: [
      'استيراد جماعي لملفات CSV مع كشف وتصحيح التكرار',
      'تصدير آمن للبيانات مقتصر على المشرفين الأعلى فقط',
      'دمج جهات الاتصال المكررة عبر خطوط متعددة',
      'سجل تدقيق لمن قام بعرض أو تصدير أرقام العملاء'
    ]
  },
  channels: {
    version: 'المرحلة اللاحقة',
    description_ar: 'توسيع المنصة لدعم قنوات التواصل الاجتماعية المتعددة.',
    features_ar: [
      'ربط قنوات Facebook Messenger و Instagram DM',
      'ربط قنوات Telegram الرسمية وإيميل خدمة العملاء',
      'صندوق موحد يعرض رسائل جميع القنوات بجانب واتساب',
      'قوالب ردود موحدة لكافة القنوات'
    ]
  },
  reports: {
    version: 'الإصدار v0.7',
    description_ar: 'مركز التقارير التنفيذية الشاملة مع أكثر من 70 تقريراً تخصصياً.',
    features_ar: [
      'تقارير تفاعلية مبنية على جدول reporting_events في Chatwoot',
      'تحليلات فترات الذروة، أوقات الانتظار، ومعدل إغلاق التذاكر',
      'تصدير التقارير بصيغ PDF و Excel و CSV بنقرة واحدة',
      'جدولة إرسال التقارير الدورية عبر البريد الإلكتروني أو واتساب'
    ]
  },
  audit: {
    version: 'الإصدار v0.5',
    description_ar: 'سجل التدقيق الأمني الشامل لكافة عمليات النظام والموظفين.',
    features_ar: [
      'تسجيل غير قابل للتعديل لكل عملية دخول وتعديل صلاحية وتصدير بيانات',
      'تتبع عنوان IP والجهاز المستخدم والطابع الزمني لكل إجراء',
      'تنبيهات فورية عند اكتشاف أي نشاط غير معتاد أو محاولات مشبوهة',
      'فلترة وبحث متقدم في سجلات النشاط التاريخية'
    ]
  },
  settings: {
    version: 'الإصدار v0.2',
    description_ar: 'لوحة الإعدادات العامة للمنصة والنطاقات وسياسات الأمان.',
    features_ar: [
      'إدارة النطاقات الفرعية (hub.resvbar.com, chat., evo., n8n.)',
      'تعديل واجهات التكامل مع Supabase و Traefik و Redis',
      'إدارة فترات انتهاء الجلسات وقيود كلمات المرور',
      'تخصيص هوية المنصة (الشعار، الألوان، نصوص الواجهة)'
    ]
  },
  health: {
    version: 'الإصدار v0.2',
    description_ar: 'شاشة مراقبة صحة الخوادم وحاويات Docker وقواطع الدوائر.',
    features_ar: [
      'مراقبة استهلاك الذاكرة والمعالج لخادم Hostinger VPS (8GB)',
      'فحص نبض حاويات Docker (Chatwoot, Evolution, Redis, Traefik, Hub-API)',
      'مؤشرات استجابة قواعد بيانات Postgres و Supabase',
      'حالة قواطع الدوائر (Circuit Breakers) لحماية خطوط واتساب'
    ]
  },
  campaigns_admin: {
    version: 'المرحلة اللاحقة',
    description_ar: 'إدارة متقدمة لسياسات الحملات وقواعد منع الحظر والحدود القصوى.',
    features_ar: [
      'ضبط الحدود القصوى للإرسال اليومي لكل خط واتساب',
      'إدارة القوائم السوداء واستثناءات العملاء من الحملات',
      'موافقة المشرف الإلزامي قبل إطلاق أي حملة جماعية',
      'سجل شامل لمعدلات الحظر والتسليم عبر كل خط'
    ]
  }
};

/**
 * Filter modules by current user's effective permissions
 * Modules with required_permission that user doesn't have are hidden.
 * Modules marked as 'hidden' are never displayed.
 */
export function filterModulesForUser(modules: ModuleContract[], user: StaffMe): ModuleContract[] {
  return modules
    .filter((mod) => {
      if (mod.status === 'hidden') return false;
      if (!mod.required_permission) return true;
      return user.permissions.includes(mod.required_permission);
    })
    .sort((a, b) => a.sort - b.sort);
}
