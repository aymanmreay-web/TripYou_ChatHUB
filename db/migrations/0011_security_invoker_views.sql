-- ═══════════════════════════════════════════════════════════════════════════
-- 0011 — إصلاح تحذير "Security Definer View" الحرج من Supabase Advisor
--
-- المشكلة: واجهات public.* كانت تُنشأ بدون security_invoker = true، فتعمل
-- بصلاحية مالكها (postgres) وتتجاوز سياسات RLS على جداول hub — النتيجة أن
-- أي شخص يملك مفتاح anon العام يقرأ كل جهات الاتصال والمحادثات والوسوم
-- دون تسجيل دخول ودون فحص صلاحيات الموظف.
--
-- الحل: تفعيل security_invoker على كل واجهات public — بعدها تُطبَّق سياسات
-- RLS الخاصة بجداول hub (نظام صلاحيات الموظفين) على كل قراءة فعلياً.
--
-- ملاحظة: بعد هذا الإصلاح، من ليس مسجَّلاً للدخول لا يرى أي صفوف (سلوك مقصود).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) تفعيل security_invoker على كل واجهات public القائمة في القاعدة
--    (يشمل أي واجهة أنشأها ملف آخر مثل favorites / pinned_messages / interactive_polls)
do $$
declare r record;
begin
  for r in
    select viewname from pg_views where schemaname = 'public'
  loop
    execute format('alter view public.%I set (security_invoker = true)', r.viewname);
  end loop;
end $$;

-- 2) تحقق بعد التنفيذ: كل صف يجب أن يتضمن security_invoker=true في reloptions
-- select c.relname as view_name, c.reloptions
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'v'
-- order by 1;
