import { ModuleContract, StaffMe, WhatsAppLine, RoadmapInfo, ConversationItem, ChatMessage } from '../types';

/**
 * Raw modules definition mirroring packages/contracts/modules.json
 */
export const RAW_MODULES: ModuleContract[] = [
  { key: 'inbox', area: 'user', title_ar: 'المحادثات', status: 'live', required_permission: 'inbox.view', sort: 10 },
  { key: 'contacts', area: 'user', title_ar: 'جهات الاتصال', status: 'live', required_permission: 'contacts.view', sort: 20 },
  { key: 'favorites', area: 'user', title_ar: 'المفضلة', status: 'live', required_permission: null, sort: 25 },
  { key: 'tasks', area: 'user', title_ar: 'المهام', status: 'coming_soon', required_permission: 'tasks.view', sort: 30 },
  { key: 'meetings', area: 'user', title_ar: 'الاجتماعات', status: 'coming_soon', required_permission: 'meetings.view', sort: 40 },
  { key: 'my_reports', area: 'user', title_ar: 'تقاريري', status: 'coming_soon', required_permission: 'reports.view_own', sort: 50 },
  { key: 'campaigns', area: 'user', title_ar: 'الحملات', status: 'live', required_permission: 'campaigns.view', sort: 60 },
  { key: 'canned', area: 'user', title_ar: 'الردود الجاهزة', status: 'live', required_permission: null, sort: 65 },
  { key: 'notifications', area: 'user', title_ar: 'الإشعارات', status: 'live', required_permission: null, sort: 70 },
  { key: 'profile', area: 'user', title_ar: 'ملفي', status: 'live', required_permission: null, sort: 80 },
  { key: 'admin_dashboard', area: 'admin', title_ar: 'لوحة الإدارة', status: 'beta', required_permission: 'settings.manage', sort: 110 },
  { key: 'lines', area: 'admin', title_ar: 'الخطوط', status: 'live', required_permission: 'lines.view', sort: 120 },
  { key: 'appearance', area: 'admin', title_ar: 'المظهر والتخصيص', status: 'live', required_permission: 'settings.manage', sort: 125 },
  { key: 'inboxes', area: 'admin', title_ar: 'الصناديق', status: 'live', required_permission: 'inboxes.manage', sort: 130 },
  { key: 'labels', area: 'admin', title_ar: 'الوسوم والحالات', status: 'live', required_permission: 'inboxes.manage', sort: 135 },
  { key: 'groups_admin', area: 'admin', title_ar: 'المجموعات', status: 'coming_soon', required_permission: 'groups.manage', sort: 140 },
  { key: 'staff', area: 'admin', title_ar: 'الموظفون', status: 'live', required_permission: 'staff.view', sort: 150 },
  { key: "roles", area: 'admin', title_ar: 'الأدوار والصلاحيات', status: "live", required_permission: 'roles.manage', sort: 160 },
  { key: 'signature', area: 'admin', title_ar: 'إدارة التوقيع', status: 'live', required_permission: 'signature.manage', sort: 170 },
  { key: 'contacts_admin', area: 'admin', title_ar: 'إدارة جهات الاتصال', status: 'live', required_permission: 'contacts.manage', sort: 180 },
  { key: 'channels', area: 'admin', title_ar: 'قنوات التواصل', status: 'coming_soon', required_permission: 'channels.manage', sort: 190 },
  { key: 'reports', area: 'admin', title_ar: 'التقارير', status: 'coming_soon', required_permission: 'reports.view_all', sort: 200 },
  { key: 'audit', area: 'admin', title_ar: 'سجل التدقيق', status: 'coming_soon', required_permission: 'audit.view', sort: 210 },
  { key: 'settings', area: 'admin', title_ar: 'الإعدادات', status: 'live', required_permission: 'settings.manage', sort: 220 },
  { key: 'health', area: 'admin', title_ar: 'صحة النظام', status: 'coming_soon', required_permission: 'system.health', sort: 230 },
  { key: 'campaigns_admin', area: 'admin', title_ar: 'إدارة الحملات', status: 'coming_soon', required_permission: 'campaigns.manage', sort: 240 }
];

/**
 * Mock Profiles for GET /me with masked personal data
 */
export const MOCK_USERS: Record<string, StaffMe> = {
  super_admin: {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    full_name: 'م. أيمن مريعي',
    role: 'super_admin',
    role_title_ar: 'مسؤول النظام الأعلى (Super Admin)',
    email_masked: 'AymanMreay@gmail.com',
    phone_masked: '+963 962 128 616',
    default_line_id: 'line-01',
    working_hours: '09:00 ص - 06:00 م',
    permissions: [
      'inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.view_all', 'inbox.send_as',
      'groups.view', 'groups.send', 'groups.manage', 'groups.policy',
      'contacts.view', 'contacts.manage', 'contacts.import', 'contacts.export',
      'lines.view', 'lines.create', 'lines.manage', 'lines.delete',
      'inboxes.manage', 'channels.manage',
      'staff.view', 'staff.manage',
      'roles.view', 'roles.manage',
      'signature.manage',
      'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.manage',
      'meetings.view', 'meetings.create',
      'reports.view_own', 'reports.view_team', 'reports.view_all',
      'audit.view', 'settings.manage', 'system.health',
      'campaigns.view', 'campaigns.create', 'campaigns.approve', 'campaigns.manage'
    ]
  },
  sales_lead: {
    id: 'c9a646d3-9c61-4cd9-bc15-358eb5464537',
    full_name: 'سارة خالد',
    role: 'sales_lead',
    role_title_ar: 'مدير المبيعات (Sales Lead)',
    email_masked: 's***@youtrip.com',
    phone_masked: '+966 55 *** 2002',
    default_line_id: 'line-02',
    working_hours: '08:30 ص - 04:30 م',
    permissions: [
      'inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.view_all', 'inbox.send_as',
      'groups.view', 'groups.send', 'groups.manage',
      'contacts.view', 'contacts.manage', 'contacts.import',
      'lines.view',
      'tasks.view', 'tasks.create', 'tasks.assign',
      'meetings.view', 'meetings.create',
      'reports.view_own', 'reports.view_team',
      'campaigns.view', 'campaigns.create'
    ]
  },
  support_agent: {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    full_name: 'محمد الدوسري',
    role: 'support_agent',
    role_title_ar: 'ممثل خدمة العملاء (Support Agent)',
    email_masked: 'm***@youtrip.com',
    phone_masked: '+966 54 *** 3003',
    default_line_id: 'line-03',
    working_hours: '01:00 م - 09:00 م',
    permissions: [
      'inbox.view', 'inbox.reply',
      'groups.view', 'groups.send',
      'contacts.view',
      'lines.view',
      'tasks.view', 'tasks.create',
      'meetings.view', 'meetings.create',
      'reports.view_own'
    ]
  },
  trainee: {
    id: 'e3b0c442-98fc-1c14-9afbf4c8996fb924',
    full_name: 'فهد العتيبي',
    role: 'trainee',
    role_title_ar: 'متدرب (Trainee)',
    email_masked: 'f***@youtrip.com',
    phone_masked: '+966 56 *** 4004',
    default_line_id: 'line-03',
    working_hours: '10:00 ص - 03:00 م',
    permissions: [
      'inbox.view',
      'contacts.view',
      'reports.view_own'
    ]
  }
};

/**
 * Connected WhatsApp Lines from Evolution API
 */
export const MOCK_LINES: WhatsAppLine[] = [
  {
    id: 'line-01',
    title_ar: 'الرقم الرئيسي (الاستقبال)',
    phone_masked: '+966 50 *** 1000',
    kind: 'primary',
    status: 'online',
    unread_count: 5,
    battery_level: 94
  },
  {
    id: 'line-02',
    title_ar: 'واتساب المبيعات 1',
    phone_masked: '+966 55 *** 2000',
    kind: 'sales',
    status: 'online',
    unread_count: 12,
    battery_level: 82
  },
  {
    id: 'line-03',
    title_ar: 'واتساب الدعم الفني',
    phone_masked: '+966 54 *** 3000',
    kind: 'support',
    status: 'online',
    unread_count: 2,
    battery_level: 78
  },
  {
    id: 'line-04',
    title_ar: 'واتساب العروض والترويج',
    phone_masked: '+966 56 *** 4000',
    kind: 'promo',
    status: 'warning',
    unread_count: 0,
    battery_level: 45
  }
];

/**
 * Mock Conversations directly from Evolution API
 */
export const MOCK_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'conv-01',
    chat_jid: '966501234567@s.whatsapp.net',
    title: 'عبدالله السبيعي',
    phone_or_jid: '+966 50 123 4567',
    avatar_letter: 'ع',
    is_group: false,
    line_id: 'line-02',
    line_title: 'واتساب المبيعات 1',
    last_message_text: 'تم استلام عرض الأسعار، هل يمكن حجز موعد زيارة غداً؟',
    last_message_at: 'منذ دقيقتين',
    unread_count: 2,
    tags: ['عميل محتمل', 'مبيعات VIP'],
    status: 'open'
  },
  {
    id: 'conv-02',
    chat_jid: '1203630283920192@g.us',
    title: 'مجموعة ملاك أبراج العليا',
    phone_or_jid: 'مجموعة (24 عضو)',
    avatar_letter: 'م',
    is_group: true,
    line_id: 'line-01',
    line_title: 'الرقم الرئيسي (الاستقبال)',
    last_message_text: 'أحمد: تم إرسال جدول الصيانة المحدث في ملف PDF',
    last_message_at: '11:45 ص',
    unread_count: 0,
    tags: ['مجموعة عقود', 'نشطة'],
    status: 'open'
  },
  {
    id: 'conv-03',
    chat_jid: '966559876543@s.whatsapp.net',
    title: 'م. ريم الناصر',
    phone_or_jid: '+966 55 987 6543',
    avatar_letter: 'ر',
    is_group: false,
    line_id: 'line-03',
    line_title: 'واتساب الدعم الفني',
    last_message_text: 'شكراً جزيلاً لسرعة التجاوب والدعم الرائع!',
    last_message_at: 'أمس 04:30 م',
    unread_count: 0,
    tags: ['دعم فني', 'محلولة'],
    status: 'resolved'
  },
  {
    id: 'conv-04',
    chat_jid: '966543322110@s.whatsapp.net',
    title: 'مكتب أفق للاستشارات',
    phone_or_jid: '+966 54 332 2110',
    avatar_letter: 'أ',
    is_group: false,
    line_id: 'line-02',
    line_title: 'واتساب المبيعات 1',
    last_message_text: 'هل تتوفر باقات سنوية مع خصم الدفع المسبق؟',
    last_message_at: 'أمس 01:15 م',
    unread_count: 1,
    tags: ['استفسار تسعير'],
    status: 'pending'
  }
];

/**
 * Mock Messages for conv-01
 */
export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-01': [
    {
      id: 'msg-01',
      conversation_id: 'conv-01',
      chat_jid: '966501234567@s.whatsapp.net',
      direction: 'in',
      body: 'السلام عليكم ورحمة الله، اطلعت على خدماتكم في الموقع وأرغب في استشارة تخص نظام إدارة الحجوزات.',
      media_type: 'text',
      sender_name: 'عبدالله السبيعي',
      status: 'read',
      line_id: 'line-02',
      created_at: '10:14 ص'
    },
    {
      id: 'msg-02',
      conversation_id: 'conv-01',
      chat_jid: '966501234567@s.whatsapp.net',
      direction: 'out',
      body: 'وعليكم السلام ورحمة الله وبركاته يا أستاذ عبدالله، أهلاً بك في YouTrip. يسعدنا تقديم الاستشارة وتزويدك بكافة التفاصيل وعروض الأسعار.',
      media_type: 'text',
      sender_name: 'م. أيمن مريعي',
      signature: '*م. أيمن مريعي* — واتساب المبيعات 1',
      status: 'read',
      line_id: 'line-02',
      created_at: '10:16 ص'
    },
    {
      id: 'msg-03',
      conversation_id: 'conv-01',
      chat_jid: '966501234567@s.whatsapp.net',
      direction: 'in',
      body: 'تم استلام عرض الأسعار، هل يمكن حجز موعد زيارة غداً؟',
      media_type: 'text',
      sender_name: 'عبدالله السبيعي',
      status: 'delivered',
      line_id: 'line-02',
      created_at: '10:28 ص'
    }
  ],
  'conv-02': [
    {
      id: 'msg-21',
      conversation_id: 'conv-02',
      chat_jid: '1203630283920192@g.us',
      direction: 'in',
      body: 'صباح الخير للجميع، متى موعد التفتيش الدوري هذا الأسبوع؟',
      media_type: 'text',
      sender_name: 'المهندس ناصر',
      status: 'read',
      line_id: 'line-01',
      created_at: '11:30 ص'
    },
    {
      id: 'msg-22',
      conversation_id: 'conv-02',
      chat_jid: '1203630283920192@g.us',
      direction: 'out',
      body: 'أهلاً مهندس ناصر، التفتيش مجدول يوم الأربعاء القادم الساعة 10 صباحاً بإذن الله.',
      media_type: 'text',
      sender_name: 'م. أيمن مريعي',
      signature: '*م. أيمن مريعي* — الاستقبال',
      status: 'read',
      line_id: 'line-01',
      created_at: '11:42 ص'
    }
  ]
};

/**
 * Roadmap Details for Coming Soon Modules
 */
export const MODULE_ROADMAP_DETAILS: Record<string, RoadmapInfo> = {
  contacts: {
    version: 'الإصدار v0.3',
    description_ar: 'دليل جهات الاتصال الرئيسي الموحد لجميع أرقام واتساب الشركة مع تطبيع الأرقام E.164 واستيراد CSV.',
    features_ar: [
      'دليل موحد ومركزي لكافة أرقام الهواتف عبر مختلف الخطوط',
      'استيراد جهات الاتصال من ملفات CSV و vCard مع التحقق من الصيغ',
      'تطبيع تلقائي للأرقام بالصيغة الدولية (+966)',
      'سجل تاريخي للأسماء ومزامنة أسماء المتصلين PushName من واتساب',
      'حصر صلاحية التعديل والتصدير بالمشرفين لحماية بيانات العملاء'
    ],
    technical_note_ar: 'الربط المباشر مع Evolution API بدون أي وسيط خارجي يضمن سرعة المزامنة وحماية قاعدة البيانات.'
  },
  tasks: {
    version: 'الإصدار v0.6',
    description_ar: 'نظام إدارة المهام الذكي المرتبط بالمحادثات وجهات الاتصال مع إشعارات إسناد لحظية.',
    features_ar: [
      'تحويل أي رسالة واتساب إلى مهمة بنقرة زر واحدة',
      'تحديد الأولوية وتاريخ الاستحقاق وإسناد المهمة للموظف المختص',
      'إشعارات فورية للمكلفين مع قوائم فحص (Checklists) قابلة للمتابعة',
      'تتبع زمني دقيق لمراحل إنجاز المهام'
    ]
  },
  meetings: {
    version: 'الإصدار v0.6',
    description_ar: 'جدولة اجتماعات Google Meet الفورية وإرسال الروابط للعملاء مباشرة عبر واتساب.',
    features_ar: [
      'توليد روابط Google Meet مباشرة عبر Google Calendar API',
      'إرسال رابط الاجتماع فوراً كنص عادي في محادثة واتساب العميل',
      'تذكير آلي للطرفين قبل موعد الاجتماع بساعة و 15 دقيقة',
      'سجل شامل لكافة الاجتماعات المنعقدة وتفاصيل الحضور'
    ]
  },
  my_reports: {
    version: 'الإصدار v0.7',
    description_ar: 'لوحة الأداء الفردي ومؤشرات الإنجاز لممثل خدمة العملاء ومسؤولي المبيعات.',
    features_ar: [
      'متوسط سرعة الاستجابة الأولى (First Response Time)',
      'إجمالي الرسائل والمحادثات المعالجة يومياً وأسبوعياً',
      'معدل إغلاق المحادثات ورضا العملاء',
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
      'تنبيهات انقطاع خطوط واتساب أو تدني نسبة البطارية في Evolution API',
      'تنبيهات الإسناد المباشر والمحادثات المعلّقة لأكثر من 5 دقائق',
      'تخصيص قنوات التنبيه لكل موظف وفق ساعات دوامه'
    ]
  },
  lines: {
    version: 'الإصدار v0.4',
    description_ar: 'مزوّد الخطوط الذكي (Line Provisioner) لربط وإدارة خطوط واتساب عبر Evolution API مباشرة.',
    features_ar: [
      'ربط خط جديد بمسح رمز QR مباشرة من Evolution API بدون أي تعقيد',
      'مراقبة لحظية لحالة اتصال الخط والبطارية وجودة الجلسة',
      'إعادة تشغيل الجلسات المتعثرة بنقرة زر واحدة',
      'تخصيص أسماء وألوان وشارات تمييز لكل رقم'
    ]
  },
  inboxes: {
    version: 'الإصدار v0.4',
    description_ar: 'إدارة صناديق المحادثات وتنظيم توزيع الرسائل بين فرق العمل.',
    features_ar: [
      'توزيع أرقام الواتساب على الأقسام (المبيعات، الدعم، الاستقبال)',
      'تحديد صلاحيات الوصول لكل صندوق (عرض فقط، رد، إرسال باسم الخط)',
      'توزيع الرسائل التلقائي بين موظفي الوردية النشطة'
    ]
  },
  groups_admin: {
    version: 'الإصدار v0.5',
    description_ar: 'تحكم ذكي بمجموعات واتساب مع الإرسال من خطوط متعددة ومنع تكرار الرسائل.',
    features_ar: [
      'إرسال رسائل في المجموعة من أي خط عضو مع خيار "أرسل عبر الخط"',
      'محرك منع تكرار الرسائل المتقدم لحماية السيرفر من تضخم البيانات',
      'تحديد أذونات المشرفين والأعضاء وسياسات الإرسال'
    ]
  },
  staff: {
    version: 'الإصدار v0.4',
    description_ar: 'إدارة بيانات فريق العمل وتوزيع الخطوط وساعات الدوام.',
    features_ar: [
      'جدول الموظفين، الحسابات المرتبطة، الخط الافتراضي لكل موظف',
      'تحديد ساعات العمل الرسمية وإيقاف إسناد المحادثات بعد انتهاء الوردية',
      'سجل تتبع أداء وسرعة استجابة كل موظف'
    ]
  },
  roles: {
    version: 'الإصدار v0.2',
    description_ar: 'مصفوفة الأدوار والصلاحيات الدقيقة المبنية على قاعدة RBAC.',
    features_ar: [
      '42 صلاحية دقيقة مصنفة في 9 مجموعات وظيفية',
      '9 أدوار قياسية مسبقة الإعداد (مسؤول أعلى، مبيعات، دعم، إلخ)',
      'إمكانية إضافة استثناءات خاصة لموظف معين مع سياسة الرفض يغلب'
    ]
  },
  signature: {
    version: 'الإصدار v0.2',
    description_ar: 'محرك التوقيع التلقائي ثلاثي الأجزاء للرسائل الصادرة.',
    features_ar: [
      'توقيع ثلاثي: اسم خط الإرسال + ترتيب الرقم في القسم + اسم الموظف',
      'قوالب توقيع مخصصة حسب النطاق (عام، خط محدد، قسم، نوع حساب)',
      'فصل التوقيع للرسائل الخاصة عن المجموعات'
    ]
  },
  contacts_admin: {
    version: 'الإصدار v0.3',
    description_ar: 'لوحة التحكم الإدارية بقواعد بيانات جهات الاتصال والأمان.',
    features_ar: [
      'استيراد جماعي لملفات CSV مع كشف وتصحيح التكرار',
      'تصدير آمن للبيانات مقتصر على المشرفين الأعلى فقط',
      'دمج جهات الاتصال المكررة عبر خطوط متعددة'
    ]
  },
  channels: {
    version: 'المرحلة اللاحقة',
    description_ar: 'توسيع المنصة لدعم قنوات التواصل الاجتماعية الإضافية مستقبلاً.',
    features_ar: [
      'ربط قنوات Facebook Messenger و Instagram DM و Telegram',
      'صندوق موحد يعرض رسائل جميع القنوات بجانب واتساب'
    ]
  },
  reports: {
    version: 'الإصدار v0.7',
    description_ar: 'مركز التقارير التنفيذية الشاملة وتحليلات الأداء.',
    features_ar: [
      'تحليلات فترات الذروة، أوقات الانتظار، ومعدل الاستجابة',
      'تصدير التقارير بصيغ PDF و Excel و CSV بنقرة واحدة'
    ]
  },
  audit: {
    version: 'الإصدار v0.5',
    description_ar: 'سجل التدقيق الأمني الشامل لكافة عمليات النظام والموظفين.',
    features_ar: [
      'تسجيل غير قابل للتعديل لكل عملية دخول وتعديل صلاحية وتصدير بيانات',
      'تتبع عنوان IP والجهاز المستخدم والطابع الزمني لكل إجراء'
    ]
  },
  settings: {
    version: 'الإصدار v0.2',
    description_ar: 'لوحة الإعدادات العامة للمنصة والنطاقات وسياسات الأمان.',
    features_ar: [
      'إدارة النطاقات المجانية (hub.69.62.122.89.sslip.io, evo.69.62.122.89.sslip.io)',
      'تعديل واجهات التكامل مع Evolution API و Redis وقواعد البيانات',
      'تخصيص هوية المنصة (الشعار، الألوان، نصوص الواجهة)'
    ]
  },
  health: {
    version: 'الإصدار v0.2',
    description_ar: 'شاشة مراقبة صحة الخوادم وجلسات Evolution وقواطع الدوائر.',
    features_ar: [
      'مراقبة استهلاك الذاكرة والمعالج لخادم Hostinger VPS (8GB)',
      'فحص نبض حاويات Docker (Evolution API, Redis, Postgres, Hub-Web)',
      'حالة قواطع الدوائر (Circuit Breakers) لحماية خطوط واتساب'
    ]
  },
  campaigns_admin: {
    version: 'المرحلة اللاحقة',
    description_ar: 'إدارة متقدمة لسياسات الحملات وقواعد منع الحظر والحدود القصوى.',
    features_ar: [
      'ضبط الحدود القصوى للإرسال اليومي لكل خط واتساب',
      'إدارة القوائم السوداء واستثناءات العملاء من الحملات'
    ]
  }
};

export const ROADMAP_DATA = MODULE_ROADMAP_DETAILS;

/**
 * Filter modules by current user's effective permissions
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
