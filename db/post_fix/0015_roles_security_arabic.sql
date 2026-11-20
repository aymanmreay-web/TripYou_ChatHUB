-- 0015: أمان الأدوار والصلاحيات + تعريب أسماء الصلاحيات ووصفها بالتفصيل
-- 1) عمود الوصف  2) أسماء عربية خالصة  3) تجاوز مدير النظام  4) حماية آخر مدير نشط

create table if not exists hub.staff_permission_overrides(
  staff_id uuid references hub.staff(id) on delete cascade,
  permission_key text references hub.permissions(key) on delete cascade,
  effect text not null check (effect in ('allow','deny')),
  reason text,
  set_by uuid references hub.staff(id),
  created_at timestamptz not null default now(),
  primary key(staff_id, permission_key)
);

alter table hub.permissions add column if not exists desc_ar text;

update hub.permissions set grp='inbox', label_ar='عرض المحادثات المسندة إليه', desc_ar='يرى الموظف المحادثات المسندة إليه أو الواردة على الخطوط المصرّح له بها، دون القدرة على الرد.', super_only=false where key='inbox.view';
update hub.permissions set grp='inbox', label_ar='الرد على رسائل العملاء', desc_ar='يكتب ويرسل رسائل ووسائط داخل المحادثات التي يملك حق عرضها.', super_only=false where key='inbox.reply';
update hub.permissions set grp='inbox', label_ar='إسناد المحادثات وتحويلها بين الموظفين', desc_ar='يحوّل المحادثة إلى موظف آخر ويغيّر حالتها (قيد المعالجة / مؤجلة / مصعّدة / تم الحل).', super_only=false where key='inbox.assign';
update hub.permissions set grp='inbox', label_ar='رؤية جميع محادثات الخط (حتى غير المسندة له)', desc_ar='يطّلع على كل محادثات الخطوط المصرّح له بها، وليس محادثاته فقط.', super_only=false where key='inbox.view_all';
update hub.permissions set grp='inbox', label_ar='الإرسال من خط واتساب آخر غير خطه الافتراضي', desc_ar='يبدّل خط الإرسال داخل المحادثة نفسها. يُفحص أيضاً مع تصريح الخط المسند له.', super_only=false where key='inbox.send_as';
update hub.permissions set grp='groups', label_ar='عرض مجموعات واتساب', desc_ar='يرى قائمة المجموعات وأعضاءها وسجل رسائلها.', super_only=false where key='groups.view';
update hub.permissions set grp='groups', label_ar='إرسال الرسائل داخل المجموعات', desc_ar='يرسل رسائل ووسائط إلى مجموعات واتساب.', super_only=false where key='groups.send';
update hub.permissions set grp='groups', label_ar='إنشاء المجموعات وحذفها وإدارة أعضائها', desc_ar='يضيف الأعضاء ويزيلهم ويعدّل اسم المجموعة وصورتها، ويحذفها.', super_only=false where key='groups.manage';
update hub.permissions set grp='groups', label_ar='تحديد سياسة مالك المجموعة', desc_ar='يحدد من يحق له الإرسال في المجموعة ومن يديرها.', super_only=false where key='groups.policy';
update hub.permissions set grp='contacts', label_ar='عرض أسماء جهات الاتصال وأرقامها', desc_ar='يرى دليل جهات الاتصال والأسماء المعروضة داخل المحادثات.', super_only=false where key='contacts.view';
update hub.permissions set grp='contacts', label_ar='إضافة جهات الاتصال وتعديلها ودمجها', desc_ar='ينشئ جهة اتصال ويعدّل بياناتها ووسومها ويدمج المكرر منها.', super_only=false where key='contacts.manage';
update hub.permissions set grp='contacts', label_ar='استيراد جهات الاتصال من ملف جداول (إكسل / نص مفصول بفواصل)', desc_ar='يرفع ملفاً ويضيف جهات اتصال دفعة واحدة مع توحيد صيغة الأرقام الدولية.', super_only=false where key='contacts.import';
update hub.permissions set grp='contacts', label_ar='تصدير جهات الاتصال إلى ملف', desc_ar='ينزّل دليل جهات الاتصال. صلاحية حساسة لأنها تُخرج بيانات العملاء خارج النظام.', super_only=false where key='contacts.export';
update hub.permissions set grp='lines', label_ar='عرض خطوط واتساب وحالة اتصالها', desc_ar='يرى قائمة الخطوط وحالتها (متصل / منقطع) دون تعديلها.', super_only=false where key='lines.view';
update hub.permissions set grp='lines', label_ar='ربط خط واتساب جديد', desc_ar='يضيف خطاً جديداً بمسح رمز الاستجابة السريعة أو برمز الإقران.', super_only=false where key='lines.create';
update hub.permissions set grp='lines', label_ar='إدارة إعدادات الخطوط وتصاريح الموظفين عليها', desc_ar='يعدّل اسم الخط وقسمه وإعداداته ويحدد الموظفين المصرّح لهم باستخدامه.', super_only=false where key='lines.manage';
update hub.permissions set grp='lines', label_ar='حذف خط واتساب نهائياً', desc_ar='يفصل الخط ويحذفه من النظام. محصورة بمدير النظام الأعلى.', super_only=true where key='lines.delete';
update hub.permissions set grp='inboxes', label_ar='إدارة صناديق المحادثات', desc_ar='ينشئ الصناديق ويعدّلها ويربطها بالخطوط والموظفين.', super_only=false where key='inboxes.manage';
update hub.permissions set grp='channels', label_ar='إدارة قنوات التواصل', desc_ar='يضبط قنوات التواصل المتاحة في المنصة.', super_only=false where key='channels.manage';
update hub.permissions set grp='staff', label_ar='عرض قائمة الموظفين', desc_ar='يرى أسماء الموظفين وأدوارهم وأقسامهم وحالاتهم.', super_only=false where key='staff.view';
update hub.permissions set grp='staff', label_ar='إدارة الموظفين: ترخيص الدخول وتعيين الأدوار والأقسام', desc_ar='يوافق على الموظفين الجدد، ويغيّر الدور والقسم والخطوط المسموحة، ويوقف الحسابات.', super_only=false where key='staff.manage';
update hub.permissions set grp='roles', label_ar='إدارة الأدوار ومصفوفة الصلاحيات والأقسام', desc_ar='يفتح صفحة الأدوار والصلاحيات ويفعّل ويوقف الصلاحيات لكل دور، ويدير الأقسام.', super_only=false where key='roles.manage';
update hub.permissions set grp='roles', label_ar='استثناءات الصلاحيات لموظف بعينه (سماح أو منع)', desc_ar='يمنح موظفاً صلاحية خارج دوره أو يسحب منه صلاحية دوره. محصورة بمدير النظام الأعلى.', super_only=true where key='permissions.override';
update hub.permissions set grp='signature', label_ar='إدارة توقيع الرسائل الصادرة', desc_ar='يضبط أجزاء التوقيع وسياسة الإرسال والإلزام لكل الموظفين.', super_only=false where key='signature.manage';
update hub.permissions set grp='tasks', label_ar='عرض المهام', desc_ar='يرى المهام المسندة إليه أو التي أنشأها.', super_only=false where key='tasks.view';
update hub.permissions set grp='tasks', label_ar='إنشاء مهام جديدة', desc_ar='ينشئ مهاماً ويحدد مواعيدها وأولوياتها.', super_only=false where key='tasks.create';
update hub.permissions set grp='tasks', label_ar='إسناد المهام إلى موظفين آخرين', desc_ar='يكلّف زملاءه بمهام وينقلها بينهم.', super_only=false where key='tasks.assign';
update hub.permissions set grp='tasks', label_ar='إدارة جميع المهام في الشركة', desc_ar='يرى ويعدّل ويحذف مهام كل الموظفين.', super_only=false where key='tasks.manage_all';
update hub.permissions set grp='meetings', label_ar='عرض الاجتماعات', desc_ar='يرى الاجتماعات المجدولة وروابطها.', super_only=false where key='meetings.view';
update hub.permissions set grp='meetings', label_ar='إنشاء اجتماع مرئي (رابط اجتماع)', desc_ar='ينشئ اجتماعاً مع رابط ودعوة للمشاركين.', super_only=false where key='meetings.create';
update hub.permissions set grp='reports', label_ar='عرض تقاريره الشخصية', desc_ar='يرى أداءه الشخصي: عدد الردود وأزمنة الاستجابة.', super_only=false where key='reports.view_own';
update hub.permissions set grp='reports', label_ar='عرض تقارير فريقه', desc_ar='يرى أداء الموظفين التابعين لقسمه.', super_only=false where key='reports.view_team';
update hub.permissions set grp='reports', label_ar='عرض تقارير الشركة كاملة', desc_ar='يرى أداء كل الموظفين والخطوط والأقسام.', super_only=false where key='reports.view_all';
update hub.permissions set grp='reports', label_ar='جدولة إرسال التقارير تلقائياً', desc_ar='ينشئ تقارير دورية تُرسل في موعد محدد.', super_only=false where key='reports.schedule';
update hub.permissions set grp='campaigns', label_ar='عرض الحملات التسويقية', desc_ar='يرى الحملات ونتائجها دون تعديلها.', super_only=false where key='campaigns.view';
update hub.permissions set grp='campaigns', label_ar='إنشاء الحملات وتشغيلها وإيقافها', desc_ar='ينشئ حملات الإرسال الجماعي ويشغّلها ويوقفها. يُنصح بتقييدها لحماية الأرقام من الحظر.', super_only=false where key='campaigns.manage';
update hub.permissions set grp='audit', label_ar='عرض سجل التدقيق', desc_ar='يرى سجل العمليات: من غيّر ماذا ومتى.', super_only=false where key='audit.view';
update hub.permissions set grp='settings', label_ar='تعديل إعدادات النظام العامة', desc_ar='يغيّر الإعدادات العامة: ساعات الهدوء وحدود الإرسال وغيرها.', super_only=false where key='settings.manage';
update hub.permissions set grp='settings', label_ar='إدارة التكاملات مع الأنظمة الخارجية', desc_ar='يربط النظام بخدمات خارجية ويعدّل مفاتيحها. محصورة بمدير النظام الأعلى.', super_only=true where key='integrations.manage';
update hub.permissions set grp='settings', label_ar='عرض صحة النظام', desc_ar='يرى حالة الخادم والاتصالات والأخطاء.', super_only=false where key='system.health';
update hub.permissions set grp='settings', label_ar='إظهار الأقسام وإخفاؤها من القائمة', desc_ar='يتحكم بالأقسام الظاهرة في القائمة الجانبية. محصورة بمدير النظام الأعلى.', super_only=true where key='modules.manage';
update hub.permissions set grp='settings', label_ar='تعديل قوالب الإشعارات', desc_ar='يعدّل نصوص الإشعارات وأحداثها.', super_only=false where key='notifications.manage_templates';

-- مدير النظام الأعلى يملك كل الصلاحيات دائماً (حتى الجديدة) دون الحاجة لزرعها يدوياً
create or replace function hub.has_permission(p_key text) returns boolean language sql stable as $$
  select case
    when exists (select 1 from hub.staff s join hub.roles r on r.id = s.role_id where s.id = hub.current_staff_id() and s.status = 'active' and r.key = 'super_admin') then true
    when exists (select 1 from hub.staff_permission_overrides o where o.staff_id = hub.current_staff_id() and o.permission_key = p_key and o.effect='deny') then false
    when exists (select 1 from hub.staff_permission_overrides o where o.staff_id = hub.current_staff_id() and o.permission_key = p_key and o.effect='allow') then true
    else exists (
      select 1 from hub.staff s join hub.role_permissions rp on rp.role_id = s.role_id
      where s.id = hub.current_staff_id() and rp.permission_key = p_key and s.status='active')
  end
$$;

-- حماية آخر مدير نظام نشط: لا يُحذف ولا يُنقل لدور آخر ولا يُوقف
create or replace function hub.protect_last_super_admin() returns trigger language plpgsql as $$
declare sa uuid; remaining int;
begin
  select id into sa from hub.roles where key = 'super_admin';
  if sa is null then return coalesce(new, old); end if;
  if old.role_id = sa and old.status = 'active' and
     (tg_op = 'DELETE' or new.role_id is distinct from sa or new.status is distinct from 'active') then
    select count(*) into remaining from hub.staff where role_id = sa and status = 'active' and id <> old.id;
    if remaining = 0 then
      raise exception 'لا يمكن حذف أو إيقاف أو تغيير دور آخر مدير نظام نشط';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_protect_last_super_admin on hub.staff;
create trigger trg_protect_last_super_admin before update or delete on hub.staff
  for each row execute function hub.protect_last_super_admin();

-- دور المدير الأعلى: لا تُحذف صلاحياته ولا تُعدّل من أي مسار
create or replace function hub.protect_super_admin_perms() returns trigger language plpgsql as $$
declare sa uuid;
begin
  select id into sa from hub.roles where key = 'super_admin';
  if tg_op = 'DELETE' and old.role_id = sa and current_setting('hub.allow_super_edit', true) is distinct from 'on' then
    raise exception 'صلاحيات مدير النظام الأعلى كاملة دائماً ولا تُسحب';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_protect_super_admin_perms on hub.role_permissions;
create trigger trg_protect_super_admin_perms before delete on hub.role_permissions
  for each row execute function hub.protect_super_admin_perms();
