-- =========================================================================
-- TripYou_ChatHUB — Supabase Master Database Setup & Schema Architecture
-- إشراف: م. أيمن مريعي — By Eng. Ayman Mreay
-- تاريخ الإنشاء: 2026-11-04
-- هذا الملف يُنفّذ في نافذة SQL Editor في Supabase بضغطة زر واحدة (Run)
-- متوافق 100% مع واجهة Supabase Table Editor و Realtime و REST API
-- =========================================================================

-- 1. تفعيل الملحقات والمخططات
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema if not exists hub;

-- منح الصلاحيات الشاملة
grant usage on schema public to postgres, anon, authenticated, service_role;
grant usage on schema hub to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 2. الهوية والأقسام والأدوار (Core Identity & Roles)
-- -------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title_ar text not null,
  kind text not null default 'sales' check (kind in ('main','sales','promo','support','finance','other')),
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  grp text not null,
  label_ar text not null,
  super_only boolean not null default false
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title_ar text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade,
  permission_key text references public.permissions(key) on delete cascade,
  primary key(role_id, permission_key)
);

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Riyadh',
  weekly jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 3. خطوط واتساب والمثيلات (WhatsApp Lines & Instances)
-- -------------------------------------------------------------------------
create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  instance_name text unique not null,
  title_ar text not null,
  phone_e164 text unique,
  kind text not null default 'sales' check (kind in ('main','sales','promo','support')),
  department_id uuid references public.departments(id),
  ordinal_in_department int default 1,
  bridge_mode text not null default 'native' check (bridge_mode in ('native','hub')),
  status text not null default 'connected' check (status in ('pending','qr','connected','disconnected','banned','retired')),
  warmup_until timestamptz,
  daily_cap int default 200,
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- حالة قاطع الدائرة للخطوط لحمايتها من الحظر (Circuit Breaker State)
create table if not exists public.line_circuit_breakers (
  line_id uuid primary key references public.lines(id) on delete cascade,
  consecutive_errors int not null default 0,
  max_errors int not null default 3,
  is_tripped boolean not null default false,
  tripped_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 4. فريق العمل والموظفون (Staff Directory)
-- -------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  full_name text not null,
  phone text,
  department_id uuid references public.departments(id),
  role_id uuid not null references public.roles(id),
  schedule_id uuid references public.work_schedules(id),
  default_line_id uuid references public.lines(id),
  status text not null default 'active' check (status in ('active','suspended','offboarded')),
  target_first_response_sec int default 300, -- 5 minutes SLA
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 5. جهات الاتصال ثلاثية الأبعاد (3D Master Contacts)
-- -------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'individual' check (kind in ('individual','business','group_entity')),
  full_name text not null,
  primary_phone_e164 text unique,
  normalized_phone text,
  email text,
  organization text,
  org_tree_path text,
  role_tag text,
  country_code text default 'SA',
  city text,
  vip_level int default 1 check (vip_level between 1 and 5),
  tags text[] default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 6. مجموعات واتساب (WhatsApp Groups)
-- -------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  chat_jid text unique not null,
  title text not null,
  ingest_owner_line_id uuid references public.lines(id),
  send_mode text not null default 'owner_only' check (send_mode in ('owner_only','any_member_line','allow_list')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 7. المحادثات ودورة الإسناد المتقدمة (Conversations & Assignment Cycle)
-- -------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  chat_jid text not null,
  line_id uuid references public.lines(id),
  contact_id uuid references public.contacts(id),
  group_id uuid references public.groups(id),
  title text not null,
  is_group boolean not null default false,
  last_message_text text,
  last_message_at timestamptz not null default now(),
  last_customer_message_at timestamptz default now(),
  unread_count int not null default 0,
  
  -- دورة الإسناد والحالات الخمس
  assigned_staff_id uuid references public.staff(id),
  status text not null default 'open' check (status in ('open','in_progress','pending','resolved','snoozed','escalated')),
  
  -- قفل الخط لمنع التشتت والتعارض
  locked_line_id uuid references public.lines(id),
  
  -- مؤشرات اتفاقية مستوى الخدمة (SLA)
  sla_warning_sent boolean not null default false,
  escalated_at timestamptz,
  resolved_at timestamptz,
  
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(chat_jid, line_id)
);
create index if not exists idx_conversations_line on public.conversations(line_id, last_message_at desc);
create index if not exists idx_conversations_staff on public.conversations(assigned_staff_id, status);
create index if not exists idx_conversations_status on public.conversations(status);

-- -------------------------------------------------------------------------
-- 8. سجل الرسائل الفعلي (Messages Ledger)
-- -------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  chat_jid text not null,
  wa_message_id text not null,
  line_id uuid references public.lines(id),
  sender_jid text,
  sender_name text,
  direction text not null check (direction in ('in','out')),
  body text,
  media_type text default 'text' check (media_type in ('text','image','audio','video','document','location','sticker','other')),
  media_url text,
  sent_by uuid references public.staff(id),
  status text not null default 'sent' check (status in ('queued','sending','sent','delivered','read','failed')),
  signature text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique(chat_jid, wa_message_id)
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at asc);

-- -------------------------------------------------------------------------
-- 9. حارس المخاطر وسجل التدقيق (Risk Guard & Security Logs)
-- -------------------------------------------------------------------------
create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('quiet_hours_attempt', 'circuit_breaker_tripped', 'flood_rate_limit', 'unauthorized_line_send', 'warmup_cap_reached')),
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  line_id uuid references public.lines(id),
  staff_id uuid references public.staff(id),
  chat_jid text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.staff(id),
  action text not null,
  target_entity text not null,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 10. ربط مخطط hub كواجهة تكميلية متطابقة (Hub Schema Views)
-- -------------------------------------------------------------------------
create or replace view hub.departments as select * from public.departments;
create or replace view hub.permissions as select * from public.permissions;
create or replace view hub.roles as select * from public.roles;
create or replace view hub.role_permissions as select * from public.role_permissions;
create or replace view hub.lines as select * from public.lines;
create or replace view hub.staff as select * from public.staff;
create or replace view hub.contacts as select * from public.contacts;
create or replace view hub.conversations as select * from public.conversations;
create or replace view hub.messages as select * from public.messages;
create or replace view hub.risk_events as select * from public.risk_events;

-- -------------------------------------------------------------------------
-- 11. تفعيل سياسات الأمان (Row Level Security - RLS)
-- -------------------------------------------------------------------------
alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.staff enable row level security;
alter table public.lines enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.risk_events enable row level security;

-- سياسات وصول مفتوحة للمنصة المعتمدة
create policy "Allow all read for anon and authenticated" on public.departments for select using (true);
create policy "Allow all read for anon and authenticated" on public.roles for select using (true);
create policy "Allow all read for anon and authenticated" on public.staff for select using (true);
create policy "Allow all for anon and authenticated" on public.lines for all using (true);
create policy "Allow all for anon and authenticated" on public.contacts for all using (true);
create policy "Allow all for anon and authenticated" on public.conversations for all using (true);
create policy "Allow all for anon and authenticated" on public.messages for all using (true);
create policy "Allow all for anon and authenticated" on public.risk_events for all using (true);

-- تفعيل Realtime على الجداول الحية
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.lines;

-- -------------------------------------------------------------------------
-- 12. البيانات الافتراضية والكتالوج (Initial Seed Data)
-- -------------------------------------------------------------------------
insert into public.departments (key, title_ar, kind) values
  ('management', 'الإدارة العامة', 'main'),
  ('sales', 'قسم المبيعات والحجوزات', 'sales'),
  ('support', 'خدمة العملاء والدعم الفني', 'support'),
  ('marketing', 'التسويق والحملات', 'promo')
on conflict (key) do nothing;

insert into public.roles (key, title_ar, is_system) values
  ('super_admin', 'مسؤول النظام الأعلى (Super Admin)', true),
  ('sales_lead', 'مدير المبيعات (Sales Lead)', true),
  ('support_agent', 'ممثل خدمة العملاء (Support Agent)', true),
  ('observer', 'مراقب ومراجع جودة', true)
on conflict (key) do nothing;

insert into public.lines (instance_name, title_ar, phone_e164, kind, status) values
  ('Master', 'الخط الرئيسي (TripYou Master)', '+963962128616', 'main', 'connected')
on conflict (instance_name) do nothing;

-- إضافة حساب م. أيمن مريعي كمسؤول النظام الأعلى
insert into public.staff (email, full_name, phone, role_id, status)
select 
  'AymanMreay@gmail.com',
  'م. أيمن مريعي',
  '+963962128616',
  (select id from public.roles where key = 'super_admin' limit 1),
  'active'
where not exists (select 1 from public.staff where email = 'AymanMreay@gmail.com');

-- تهيئة قاطع الدائرة للخط الرئيسي
insert into public.line_circuit_breakers (line_id, max_errors)
select id, 3 from public.lines where instance_name = 'Master'
on conflict do nothing;

-- =========================================================================
-- اكتمل إعداد قاعدة بيانات Supabase بنجاح!
-- =========================================================================
