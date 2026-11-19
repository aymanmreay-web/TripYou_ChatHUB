-- 0016: توسيع الصلاحيات (15 صلاحية دقيقة جديدة) + منح افتراضي يحافظ على سلوك كل دور قبل التحديث
-- آمن للتكرار. لا يسحب أي صلاحية قائمة، ويضيف الجديدة فقط للأدوار التي كانت تقوم بالعمل نفسه ضمناً.

insert into hub.permissions (key, grp, label_ar, desc_ar, super_only) values
  ('inbox.send_media','inbox','إرسال الصور والملفات والمرفقات','يرفق ويرسل صوراً ومقاطع ومستندات وبطاقات داخل المحادثة، بينما يقتصر غيره على الرسائل النصية.',false),
  ('inbox.forward','inbox','تحويل الرسائل إلى محادثات أخرى','يحوّل رسالة أو عدة رسائل من محادثة إلى محادثة عميل آخر أو مجموعة.',false),
  ('inbox.revoke','inbox','حذف الرسالة عند الجميع في واتساب','يسحب رسالة مرسلة فتختفي من عند العميل أيضاً. صلاحية حساسة لأن الحذف لا رجعة فيه.',false),
  ('inbox.change_status','inbox','تغيير حالة المحادثة','ينقل المحادثة بين: مفتوحة، قيد المعالجة، مؤجلة، مصعّدة، تم الحل. صاحب المحادثة يغيّر حالة محادثته دائماً.',false),
  ('inbox.polls','inbox','إنشاء استطلاعات رأي داخل المحادثات','يرسل استطلاعاً بخيارات متعددة إلى العميل أو المجموعة عبر واتساب.',false),
  ('inbox.request_access','inbox','طلب صلاحية من المشرف','يرفع طلباً لقراءة محادثة زميل أو الرد منها أو إسنادها له أو الإرسال من خط آخر، وينتظر موافقة المشرف.',false),
  ('inbox.approve_access','inbox','الموافقة على طلبات الصلاحيات أو رفضها','يقرر في طلبات الموظفين (قراءة محادثة زميل، إسناد، إرسال من خط آخر، انضمام لمجموعة). صلاحية حساسة.',false),
  ('contacts.delete','contacts','حذف جهات الاتصال','يحذف جهة اتصال واحدة أو يمسح الدليل كاملاً. صلاحية حساسة لا تُمنح إلا لمن يدير الدليل.',false),
  ('contacts.merge','contacts','دمج جهات الاتصال المكررة','يعاين الأرقام المكررة ويدمجها في جهة واحدة مع الحفاظ على سجل المحادثات.',false),
  ('canned.view','canned','استخدام الردود الجاهزة','يدرج الردود الجاهزة المحفوظة داخل رسالته بضغطة واحدة أو بالاختصار.',false),
  ('canned.manage','canned','إدارة مكتبة الردود الجاهزة','ينشئ ردوداً جاهزة جديدة ويعدّل نصوصها واختصاراتها ويحذفها.',false),
  ('tags.manage','tags','إدارة الوسوم (إنشاء وتعديل وحذف)','ينشئ وسوم تصنيف المحادثات وجهات الاتصال ويعدّل أسماءها وألوانها ويحذفها.',false),
  ('groups.approve_join','groups','الموافقة على طلبات انضمام الخطوط للمجموعات','يقرر في طلبات إضافة خط واتساب إلى مجموعة، وينفّذ الانضمام عند الموافقة.',false),
  ('groups.sync','groups','مزامنة المجموعات مع واتساب','يحدّث قائمة المجموعات وأعضائها وصورها من الخطوط المتصلة.',false),
  ('notifications.send','settings','إرسال إشعارات للموظفين','ينشئ إشعاراً موجهاً لموظف أو دور أو كل الموظفين النشطين.',false)
on conflict (key) do update set grp=excluded.grp, label_ar=excluded.label_ar, desc_ar=excluded.desc_ar, super_only=excluded.super_only;

-- منح افتراضي: من كان يملك الصلاحية «الأم» يحصل على الجديدة المرتبطة بها
insert into hub.role_permissions (role_id, permission_key)
select rp.role_id, m.new_key
from hub.role_permissions rp
join (values
  ('inbox.reply','inbox.send_media'),
  ('inbox.reply','inbox.forward'),
  ('inbox.reply','inbox.change_status'),
  ('inbox.assign','inbox.polls'),
  ('inbox.reply','inbox.request_access'),
  ('inbox.assign','inbox.approve_access'),
  ('staff.manage','contacts.delete'),
  ('contacts.manage','contacts.merge'),
  ('inbox.reply','canned.view'),
  ('inbox.assign','canned.manage'),
  ('contacts.manage','tags.manage'),
  ('groups.manage','groups.approve_join'),
  ('groups.manage','groups.sync'),
  ('settings.manage','notifications.send')
) as m(parent_key, new_key) on m.parent_key = rp.permission_key
on conflict do nothing;

-- دور «مدير» (إن وُجد) يملك كل الصلاحيات غير المحصورة بالمدير الأعلى
insert into hub.role_permissions (role_id, permission_key)
select r.id, p.key from hub.roles r cross join hub.permissions p
where r.key = 'admin' and p.super_only = false
on conflict do nothing;
