-- ============================================================================
-- TripYou ChatHUB — إعداد ميزات المرحلة الثانية (v2 — متوافق مع بنية القاعدة الحية)
-- البنية الحية: جداول حقيقية في hub.* وواجهات (views) في public.*
-- لذلك: الجداول الجديدة تُنشأ كجداول حقيقية في public (نفس نمط inbox_read_receipts)
-- بدون مفاتيح أجنبية نحو الـ views، والتعديلات على الجداول القديمة تطبق على hub.* مباشرة.
-- نفّذ الملف كاملاً في محرر SQL الخاص بـ Supabase أو عبر scripts/run-sql.js (مرة واحدة، آمن للإعادة).
-- ============================================================================

-- -------------------------------------------------------------------------
-- 1. تعديلات على الجداول الحقيقية الموجودة في hub.*
-- -------------------------------------------------------------------------
-- رسالة آلية (رد خارج الدوام أو حملة) — تُستبعد من حسابات زمن أول رد للموظفين
alter table hub.messages add column if not exists is_auto boolean not null default false;
-- انسحاب العميل من المراسلات التسويقية (تحترمها الحملات)
alter table hub.contacts add column if not exists opt_out boolean not null default false;
-- updated_at كان مفقوداً — إضافته تصلح فشل upsert العميل (مزامنة الحالة/الإسناد)
alter table hub.conversations add column if not exists updated_at timestamptz not null default now();

-- تحديث واجهة public.conversations لتشمل updated_at (نفس التعريف الحالي + العمود الجديد في النهاية)
create or replace view public.conversations with (security_invoker = true) as
  select id, chat_jid, line_id, contact_id, group_id, title, is_group,
         last_message_text, last_message_at, last_customer_message_at, unread_count,
         assigned_staff_id, status, locked_line_id, sla_warning_sent, escalated_at,
         resolved_at, tags, metadata, created_at, updated_at
  from hub.conversations;
grant select on public.conversations to anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. إشعارات الموظفين (جرس فوري عبر Realtime) — جدول حقيقي
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null, -- بدون FK: staff واجهة view وليست جدولاً
  kind text not null default 'new_message' check (kind in ('new_message','assignment','after_hours','campaign','system','mention')),
  title text not null,
  body text,
  link text,
  chat_jid text,
  instance_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_staff on public.notifications(staff_id, read_at, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (true);
-- الكتابة تتم فقط عبر service role من خادم المنصة (تتجاوز RLS)

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null;
  end;
end $$;

-- -------------------------------------------------------------------------
-- 3. الردود الجاهزة (قوالب أسئلة السياح المتكررة)
-- -------------------------------------------------------------------------
create table if not exists public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  shortcut text,
  category text not null default 'general' check (category in ('general','prices','schedule','visa','offers','greeting','followup')),
  usage_count int not null default 0,
  is_active boolean not null default true,
  sort int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_canned_active on public.canned_responses(is_active, sort);

-- -------------------------------------------------------------------------
-- 4. قوالب رسائل الحملات (للإرسال الجماعي — تدعم المرفقات والمتغيرات)
-- -------------------------------------------------------------------------
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general',
  body text not null,
  media jsonb default '{}'::jsonb, -- {type, mimeType, fileName, dataUrl|url}
  variables text[] default '{}',
  is_active boolean not null default true,
  usage_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 5. قوائم الجمهور المحفوظة (لبناء جمهور الحملات)
-- -------------------------------------------------------------------------
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_list_members (
  list_id uuid not null references public.contact_lists(id) on delete cascade,
  contact_id uuid not null, -- بدون FK نحو contacts (view)
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

-- -------------------------------------------------------------------------
-- 6. الحملات ومستلموها (إرسال جماعي + جدولة + تتبع كامل)
-- -------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','done','failed','cancelled')),
  line_instance text not null, -- اسم مثيل Evolution المرسل منه
  audience jsonb not null default '{}'::jsonb, -- {type:'list'|'filter', list_id?, filter?:{...}}
  text text not null default '',
  media jsonb default '{}'::jsonb,
  throttle jsonb not null default '{"per_minute": 10}'::jsonb,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  stats jsonb not null default '{"total":0,"sent":0,"failed":0,"skipped":0}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_status on public.campaigns(status, scheduled_at);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid,
  phone_e164 text not null,
  display_name text,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  skip_reason text,
  wa_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_id, phone_e164)
);
create index if not exists idx_recipients_campaign on public.campaign_recipients(campaign_id, status);

-- -------------------------------------------------------------------------
-- 7. إعدادات النظام العامة (key/value) — التوزيع التلقائي وساعات العمل والرد الآلي
-- -------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('auto_assignment', '{
    "enabled": false,
    "skip_groups": true,
    "fallback": "unassigned",
    "note": "التجمع محدد بموظفي الخط من line_access والدوران دائري بالتساوي"
  }'::jsonb)
on conflict (key) do nothing;

insert into public.app_settings (key, value) values
  ('after_hours', '{
    "enabled": false,
    "timezone": "Asia/Riyadh",
    "weekly": {"sun":[["09:00","17:00"]],"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[],"sat":[]},
    "template_ar": "شكراً لتواصلك مع TripYou للسياحة والسفر ✈️\nنحن خارج ساعات الدوام حالياً، وسيعاود فريق التواصل معك في أقرب وقت خلال ساعات العمل (9 صباحاً - 5 مساءً).",
    "send_to_n8n": false,
    "n8n_webhook_url": "",
    "apply_to_groups": false
  }'::jsonb)
on conflict (key) do nothing;

-- -------------------------------------------------------------------------
-- 8. منح الصلاحيات (نفس نمط القاعدة)
-- -------------------------------------------------------------------------
grant all on public.notifications to anon, authenticated, service_role;
grant all on public.canned_responses to anon, authenticated, service_role;
grant all on public.message_templates to anon, authenticated, service_role;
grant all on public.contact_lists to anon, authenticated, service_role;
grant all on public.contact_list_members to anon, authenticated, service_role;
grant all on public.campaigns to anon, authenticated, service_role;
grant all on public.campaign_recipients to anon, authenticated, service_role;
grant all on public.app_settings to anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 9. بذور: ردود جاهزة سياحية شائعة (تُضاف مرة واحدة فقط)
-- -------------------------------------------------------------------------
insert into public.canned_responses (title, body, shortcut, category, sort)
select * from (values
  ('ترحيب بالعميل الجديد', 'أهلاً وسهلاً بك في TripYou للسياحة والسفر ✈️' || chr(10) || 'يسعدنا خدمتك اليوم، كيف يمكننا مساعدتك؟', '/ترحيب', 'greeting', 1),
  ('الأسعار والعروض الحالية', 'عزيزي {name}، أسعار رحلاتنا الحالية حسب الوجهة:' || chr(10) || '• عمرة اقتصادية: تبدأ من ___' || chr(10) || '• عمرة 5 نجوم: تبدأ من ___' || chr(10) || '• تركيا (إسطنبول): ___ لمدة 7 أيام' || chr(10) || 'الأسعار تشمل الطيران والإقامة والتنقلات. هل تود تفاصيل وجهة معينة؟', '/اسعار', 'prices', 2),
  ('مواعيد الرحلات والمغادرة', 'عزيزي {name}، مواعيد المغادرة القادمة:' || chr(10) || '• يوم ___ الساعة ___ من مطار ___' || chr(10) || 'نرجو الحضور قبل الإقلاع بـ 3 ساعات مع جواز سفر ساري المفعول.', '/مواعيد', 'schedule', 3),
  ('مستندات التأشيرة', 'عزيزي {name}، مستندات التأشيرة المطلوبة:' || chr(10) || '• جواز سفر ساري 6 أشهر' || chr(10) || '• صورة شخصية بخلفية بيضاء' || chr(10) || '• نسخة من الهوية' || chr(10) || 'يرجى إرسالها عبر هذه المحادثة لنتولى الباقي.', '/تأشيرة', 'visa', 4),
  ('متابعة بعد الرحلة', 'عزيزي {name}، نتمنى أن تكون رحلتك كانت مميزة 🌟' || chr(10) || 'يسعدنا تقييم تجربتك معنا، ونرحب بك في رحلات قادمة مع عروض خاصة لعملائنا المميزين.', '/متابعة', 'followup', 5)
) as seed(title, body, shortcut, category, sort)
where not exists (select 1 from public.canned_responses limit 1);

-- انتهى — تحقق من ظهور الجداول الجديدة في Table Editor
