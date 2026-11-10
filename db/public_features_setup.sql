-- ============================================================================
-- TripYou ChatHUB — إعداد ميزات المرحلة الثانية (يعمل فوق supabase_master_setup.sql)
-- نفّذ هذا الملف كاملاً في محرر SQL الخاص بـ Supabase (مرة واحدة فقط).
-- كل الجداول هنا في مخطط public وهي آمنة لإعادة التنفيذ (idempotent).
-- ============================================================================

-- -------------------------------------------------------------------------
-- 1. إشعارات الموظفين (تنبيهات الجرس الفورية) — تُكتب من الويب هوك فقط عبر service role
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id) on delete cascade,
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
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated using (true);

-- إضافة الجدول إلى نشر Realtime (تجاهل الخطأ إن كان مضافاً)
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null;
  end;
end $$;

-- -------------------------------------------------------------------------
-- 2. الردود الجاهزة (قوالب أسئلة السياح المتكررة)
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
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_canned_active on public.canned_responses(is_active, sort);

-- -------------------------------------------------------------------------
-- 3. قوالب رسائل الحملات (تختلف عن الردود الجاهزة — للإرسال الجماعي)
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
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 4. قوائم الجمهور المحفوظة (لبناء جمهور الحملات)
-- -------------------------------------------------------------------------
create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_list_members (
  list_id uuid not null references public.contact_lists(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, contact_id)
);

-- -------------------------------------------------------------------------
-- 5. الحملات ومستلموها (إرسال جماعي + جدولة + تتبع كامل)
-- -------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- draft | scheduled | running | paused | done | failed | cancelled
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','done','failed','cancelled')),
  line_instance text not null, -- اسم مثيل Evolution المرسل منه
  -- الجمهور: {type:'list'|'filter', list_id?, filter?:{tag?, source?, city?, entity_type?}}
  audience jsonb not null default '{}'::jsonb,
  text text not null default '',
  media jsonb default '{}'::jsonb,
  throttle jsonb not null default '{"per_minute": 10}'::jsonb,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  -- {total, sent, failed, skipped}
  stats jsonb not null default '{"total":0,"sent":0,"failed":0,"skipped":0}'::jsonb,
  created_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_status on public.campaigns(status, scheduled_at);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  phone_e164 text not null,
  display_name text,
  -- pending | sending | sent | failed | skipped
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
-- 6. إعدادات النظام العامة (key/value) — التوزيع التلقائي، ساعات العمل، الرد الآلي
-- -------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- الإعدادات الافتراضية للتوزيع التلقائي (دائري حسب تخصص الخط)
insert into public.app_settings (key, value) values
  ('auto_assignment', '{
    "enabled": false,
    "skip_groups": true,
    "fallback": "unassigned",
    "note": "التجمع يُحدد بموظفي الخط من line_access والدوران دائري بالتساوي"
  }'::jsonb)
on conflict (key) do nothing;

-- الإعدادات الافتراضية للرد الآلي خارج دوام العمل
insert into public.app_settings (key, value) values
  ('after_hours', '{
    "enabled": false,
    "timezone": "Asia/Riyadh",
    "weekly": {"sun":[["09:00","17:00"]],"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[],"sat":[]},
    "template_ar": "شكراً لتواصلك مع TripYou للسياحة والسفر ✈️\\nنحن خارج ساعات الدوام حالياً، وسيعاود فريق التواصل معك في أقرب وقت خلال ساعات العمل (9 صباحاً - 5 مساءً).\\nللحالات الطارئة تواصل معنا على: {phone}",
    "send_to_n8n": false,
    "n8n_webhook_url": "",
    "apply_to_groups": false
  }'::jsonb)
on conflict (key) do nothing;

-- -------------------------------------------------------------------------
-- 7. أعمدة إضافية على الجداول الموجودة
-- -------------------------------------------------------------------------
-- رسالة آلية (من الرد الآلي أو الحملات) تُستبعد من حسابات زمن أول رد للموظفين
alter table public.messages add column if not exists is_auto boolean not null default false;
-- إشعار انسحاب العميل من المراسلات التسويقية
alter table public.contacts add column if not exists opt_out boolean not null default false;

-- -------------------------------------------------------------------------
-- 8. بذور: ردود جاهزة سياحية شائعة
-- -------------------------------------------------------------------------
insert into public.canned_responses (title, body, shortcut, category, sort) values
  ('ترحيب بالعميل الجديد', 'أهلاً وسهلاً بك في TripYou للسياحة والسفر ✈️\nيسعدنا خدمتك اليوم، كيف يمكننا مساعدتك؟', '/ترحيب', 'greeting', 1),
  ('الأسعار والعروض الحالية', 'عزيزي {name}، أسعار رحلاتنا الحالية حسب الوجهة:\n• عمرة اقتصادية: تبدأ من ___\n• عمرة 5 نجوم: تبدأ من ___\n• تركيا (إسطنبول): ___ لمدة 7 أيام\nالأسعار تشمل الطيران والإقامة والتنقلات. هل تود تفاصيل وجهة معينة؟', '/اسعار', 'prices', 2),
  ('مواعيد الرحلات والمغادرة', 'عزيزي {name}، مواعيد المغادرة القادمة:\n• يوم ___ الساعة ___ من مطار ___\nنرجو الحضور قبل الإقلاع بـ 3 ساعات مع جواز سفر ساري المفعول.', '/مواعيد', 'schedule', 3),
  ('مستندات التأشيرة', 'عزيزي {name}، مستندات التأشيرة المطلوبة:\n• جواز سفر ساري 6 أشهر\n• صورة شخصية بخلفية بيضاء\n• نسخة من البطاقة الشخصية\n• ____________\nيرجى إرسالها عبر هذا المحادثة لنتولى الباقي.', '/تأشيرة', 'visa', 4),
  ('متابعة بعد الرحلة', 'عزيزي {name}، نتمنى أن تكون رحلتك كانت مميزة 🌟\nيسعدنا تقييم تجربتك معنا، ونرحب بك في رحلات قادمة مع عروض خاصة لعملائنا المميزين.', '/متابعة', 'followup', 5)
on conflict do nothing;

-- -------------------------------------------------------------------------
-- 9. منح الصلاحيات (نفس نمط الملف الرئيسي)
-- -------------------------------------------------------------------------
grant all on public.notifications to anon, authenticated, service_role;
grant all on public.canned_responses to anon, authenticated, service_role;
grant all on public.message_templates to anon, authenticated, service_role;
grant all on public.contact_lists to anon, authenticated, service_role;
grant all on public.contact_list_members to anon, authenticated, service_role;
grant all on public.campaigns to anon, authenticated, service_role;
grant all on public.campaign_recipients to anon, authenticated, service_role;
grant all on public.app_settings to anon, authenticated, service_role;
grant select on public.campaigns to authenticated;
grant select, insert, update on public.notifications to authenticated;

-- انتهى — تحقق من الجداول الجديدة في Table Editor
