-- 0012 إدارة المجموعات — شاشة groups_admin بكل خواص Evolution API v2.3.7
-- يُطبق على الإنتاج جملة-جملة عبر psql منفذ :5432 (الإجراء الموثق في docs/handoff-security-hardening-2026-11-11.md §4.3)
-- ثم: notify pgrst_hbnwtxlfkgmuwiuvkk reload schema;

-- أعمدة الدعوة والمزامنة لجدول المجموعات الموجود
alter table hub.whatsapp_groups add column if not exists invite_code text;
alter table hub.whatsapp_groups add column if not exists invite_url text;
alter table hub.whatsapp_groups add column if not exists synced_at timestamptz;

-- سجل أعضاء كل مجموعة لكل خط (مصدر شارة 👑 أدمن — مطابقة خطوطنا بأرقام الهواتف فقط، آمن ضد @lid)
create table if not exists hub.whatsapp_group_members(
  id uuid primary key default gen_random_uuid(),
  group_jid text not null,
  instance_name text not null,
  participant_jid text not null,
  phone_number text,
  participant_name text,
  is_admin boolean not null default false,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wa_group_members_uniq
  on hub.whatsapp_group_members(group_jid, instance_name, participant_jid);
create index if not exists wa_group_members_gidx on hub.whatsapp_group_members(group_jid);
create index if not exists wa_group_members_iidx on hub.whatsapp_group_members(instance_name);

-- قاعدة ستركة الأمني: RLS مفعّل + سياسة لأدوار مصادقة وخدمة فقط (لا TO public)
alter table hub.whatsapp_group_members enable row level security;
drop policy if exists "wa_group_members_all" on hub.whatsapp_group_members;
create policy "wa_group_members_all" on hub.whatsapp_group_members
  for all to authenticated, service_role using (true) with check (true);

-- تقوية سياسة جدول المجموعات (كانت بدون TO فأصبحت عامة ضمنياً)
drop policy if exists "wa_groups_all" on hub.whatsapp_groups;
create policy "wa_groups_all" on hub.whatsapp_groups
  for all to authenticated, service_role using (true) with check (true);
