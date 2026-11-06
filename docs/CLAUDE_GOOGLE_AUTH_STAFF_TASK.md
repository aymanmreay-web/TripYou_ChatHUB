# 🤖 برومبت مهمة Google OAuth وتخزين الموظفين في Supabase (لوكيل Claude الخارجي)

> **انسخ المحتوى التالي بالكامل وأعطه لـ Claude في الحساب الثاني:**

---

```text
أنت مهندس نظم متقدم (Senior Full-Stack & Supabase Architect).
مهمتك: حل وتفعيل تسجيل دخول الموظفين عبر Google (Google OAuth) في منصة TripYou_ChatHUB وتخزينهم تلقائياً في جدول الموظفين (public.staff) في Supabase PostgreSQL.

## 1. المشكلة الحالية والخطأ:
عند النقر على "تسجيل الدخول بحساب Google" يرجع الخطأ التالي من Supabase Auth:
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}

## 2. سبب الخطأ وكيفية حله:
1. في لوحة تحكم Supabase Dashboard:
   - الانتقال إلى: Authentication -> Providers -> Google.
   - تفعيل الـ Toggle ليصبح Enabled.
   - إدخال:
     * Client ID (من Google Cloud Console)
     * Client Secret (من Google Cloud Console)
     * إضافة Authorized redirect URI من Supabase إلى Google Cloud Console:
       https://aypnxljvudjtasofiuhp.supabase.co/auth/v1/callback

## 3. المعمارية البرمجية المطلوبة منك لتخزين الموظفين:
نحتاج إلى Database Trigger في Supabase بحيث عند تسجيل أي مستخدم جديد عبر Google (auth.users)، يقوم التريجر تلقائياً بما يلي:
1. استخراج البريد الإلكتروني (email) والاسم الكامل (raw_user_meta_data->>'full_name').
2. التحقق هل هو مسجل مسبقاً في جدول `public.staff`؟
3. إذا كان جديداً:
   - إنشاء سجل في `public.staff` بالحالة: `status = 'pending'`.
   - تعيين `role_id` للدور الافتراضي (support_agent أو دور pending).
   - توجيهه إلى صفحة `/pending-approval`.
4. إذا وافق المدير (م. أيمن مريعي) من صفحة `/module/staff`، تتغير حالته إلى `active` ويتمكن من الدخول للمحادثات `/inbox`.

## 4. كود الـ PostgreSQL Trigger المطلوب تنفيذه في Supabase:
```sql
-- دالة معالجة المستخدم الجديد بعد Google OAuth
create or replace function public.handle_new_staff_user()
returns trigger as $$
declare
  default_role_id uuid;
begin
  -- جلب معرف دور ممثل خدمة عملاء افتراضياً
  select id into default_role_id from public.roles where key = 'support_agent' limit 1;

  -- إنشاء سجل موظف بحالة معلقة بانتظار ترخيص المدير
  insert into public.staff (auth_user_id, email, full_name, role_id, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    default_role_id,
    'pending'
  )
  on conflict (email) do update set
    auth_user_id = excluded.auth_user_id;

  return new;
end;
$$ language plpgsql security definer;

-- تفعيل الـ Trigger على جدول auth.users
drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute procedure public.handle_new_staff_user();
```

## 5. بيانات الاعتماد وبيئة العمل:
- مستودع الكود: https://github.com/aymanmreay-web/TripYou_ChatHUB
- الفرع المعتمد: main
- Supabase Project URL: https://aypnxljvudjtasofiuhp.supabase.co
- السيرفر المباشر: 69.62.122.89 (Hostinger VPS)
- نطاق المنصة الحي: https://hub.69.62.122.89.sslip.io

نفّذ الحل وقدم التقرير النهائي بدون أي اختصارات أو تعقيدات.
```

