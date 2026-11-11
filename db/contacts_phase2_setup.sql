-- ═══════════════════════════════════════════════════════════════════
-- م8 — بنية جهات الاتصال الموسعة (تعمل على hub.* الحقيقي + واجهات public.*)
-- 1) wa_jid: معرف واتساب الحقيقي لكل جهة (حجر أساس الدمج والفرز)
-- 2) whatsapp_groups: جدول مستقل للمجموعات (الاسم الحقيقي + المشاركون + العدد)
-- 3) contact_phones: أرقام متعددة لكل جهة
-- 4) توسيع الوسوم: scope (contact/conversation/both) + ربط جهات-وسوم مربوط بقسم الوسوم
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1) عمود معرف واتساب على جهات الاتصال ───
alter table hub.contacts add column if not exists wa_jid text;
create unique index if not exists contacts_wa_jid_uniq on hub.contacts (wa_jid) where wa_jid is not null;
create index if not exists contacts_wa_jid_idx on hub.contacts (wa_jid);

-- ترحيل المجموعات القديمة (jid مخزن في primary_phone_e164) إلى wa_jid الصحيح
update hub.contacts
set wa_jid = primary_phone_e164,
    primary_phone_e164 = null,
    primary_phone = null,
    updated_at = now()
where entity_type = 'group'
  and wa_jid is null
  and (primary_phone_e164 like '%@g.us%' or primary_phone_e164 ~ '^[0-9]{15,}$' or primary_phone_e164 like '%@lid%');

-- ترحيل أفراد لديهم jid وليس رقماً في حقل الهاتف (حالات @lid)
update hub.contacts
set wa_jid = primary_phone_e164,
    primary_phone_e164 = null,
    primary_phone = null,
    updated_at = now()
where entity_type <> 'group'
  and wa_jid is null
  and (primary_phone_e164 like '%@lid%' or primary_phone_e164 like '%@g.us%');

-- ─── 2) جدول المجموعات الحقيقي ───
create table if not exists hub.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  group_jid text unique not null,
  subject text not null default 'مجموعة',
  subject_owner text,
  subject_time timestamptz,
  picture_url text,
  description text,
  announcement boolean default false,
  restricted boolean default false,
  participant_count int default 0,
  line_instance text,
  contact_id uuid references hub.contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wa_groups_line_idx on hub.whatsapp_groups (line_instance);
create index if not exists wa_groups_contact_idx on hub.whatsapp_groups (contact_id);

alter table hub.whatsapp_groups enable row level security;
create policy "wa_groups_all" on hub.whatsapp_groups for all using (true) with check (true);

-- ─── 3) أرقام جهات الاتصال (عدة أرقام لكل جهة) ───
create table if not exists hub.contact_phones (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references hub.contacts(id) on delete cascade,
  phone_e164 text not null,
  is_primary boolean not null default false,
  wa_status text default 'unknown' check (wa_status in ('yes','no','unknown')),
  created_at timestamptz not null default now(),
  unique (contact_id, phone_e164)
);
create index if not exists contact_phones_contact_idx on hub.contact_phones (contact_id);
create index if not exists contact_phones_phone_idx on hub.contact_phones (phone_e164);

-- ─── 4) توسيع الوسوم: نطاق التطبيق + ربط جهات الاتصال ───
-- scope: contact = يظهر في قوائم الوسوم لجهات الاتصال، conversation = للمحادثات، both = للاثنين
alter table hub.hub_tags add column if not exists scope text not null default 'both'
  check (scope in ('contact', 'conversation', 'both'));
alter table hub.hub_tags add column if not exists updated_at timestamptz not null default now();

-- أوسمة النظام: يصنف الأفراد والمجموعات والقطاع السياحي تلقائياً
insert into hub.hub_tags (key, name_ar, color, kind, scope, sort_order)
values
  ('auto_individual',  'شخصي (فردي)',          'blue',    'custom', 'contact', 901),
  ('auto_group',       'مجموعة واتساب',         'purple',  'custom', 'contact', 902),
  ('auto_organization','شركة / مؤسسة',         'amber',   'custom', 'contact', 903),
  ('auto_tourism',     'قطاع سياحي وفندقي',     'emerald', 'custom', 'contact', 904),
  ('opt_out',          'طلب عدم الإزعاج',       'rose',    'custom', 'contact', 905)
on conflict (key) do update set scope = excluded.scope, updated_at = now();

-- جدول ربط جهات الاتصال بالوسوم (نفس نمط conversation_tags)
create table if not exists hub.contact_tags (
  contact_id uuid not null references hub.contacts(id) on delete cascade,
  tag_id uuid not null references hub.hub_tags(id) on delete cascade,
  assigned_by uuid references hub.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);
create index if not exists contact_tags_tag_idx on hub.contact_tags (tag_id);

-- جداول الوسوم الجديدة على النشر الحي
do $$
begin
  begin
    alter publication supabase_realtime add table hub.contact_tags;
  exception when duplicate_object then null;
  end;
end $$;

-- ─── 5) واجهات public للجداول الجديدة ───
-- security_invoker = true إلزامي: بدونها تتجاوز الواجهة RLS على جداول hub
-- (تحذير Security Definer View الحرج من Advisor)
create or replace view public.whatsapp_groups with (security_invoker = true) as select * from hub.whatsapp_groups;
create or replace view public.contact_phones with (security_invoker = true) as select * from hub.contact_phones;
create or replace view public.contact_tags with (security_invoker = true) as select * from hub.contact_tags;
grant select on public.whatsapp_groups, public.contact_phones, public.contact_tags to anon, authenticated;

-- عمود wa_jid في واجهة public.contacts
create or replace view public.contacts with (security_invoker = true) as
  select c.id, c.kind, c.full_name, c.primary_phone_e164, c.normalized_phone, c.email,
         c.organization, c.org_tree_path, c.role_tag, c.country_code, c.city, c.vip_level,
         c.tags, c.notes, c.created_at, c.updated_at, c.entity_type, c.commercial_role,
         c.source, c.source_detail, c.primary_phone, c.district, c.facility_name,
         c.avatar_url, c.is_favorite, c.last_activity_at, c.display_name, c.company,
         c.opt_out, c.wa_jid
  from hub.contacts c;
grant select on public.contacts to anon, authenticated;

-- ─── 6) فرز تلقائي: وسم كل جهة حسب نوعها (مربوط بقسم الوسوم المركزي) ───
insert into hub.contact_tags (contact_id, tag_id, assigned_by)
select c.id, t.id, null
from hub.contacts c
join hub.hub_tags t on (
  (c.entity_type = 'individual' and t.key = 'auto_individual') or
  (c.entity_type = 'group' and t.key = 'auto_group') or
  (c.entity_type = 'organization' and t.key = 'auto_organization')
)
on conflict (contact_id, tag_id) do nothing;

-- جهات المصدر Evolution مع وسم القطاع السياحي (نفس المنطق المستخدم في الاستيراد)
insert into hub.contact_tags (contact_id, tag_id, assigned_by)
select c.id, t.id, null
from hub.contacts c
join hub.hub_tags t on t.key = 'auto_tourism'
where c.tags @> array['قطاع سياحي وفندقي']
on conflict (contact_id, tag_id) do nothing;

insert into hub.contact_tags (contact_id, tag_id, assigned_by)
select c.id, t.id, null
from hub.contacts c
join hub.hub_tags t on t.key = 'opt_out'
where c.opt_out = true
on conflict (contact_id, tag_id) do nothing;

-- ─── 7) مزامنة hub_tags: تعبئة scope قديم وتحديث updated_at ───
update hub.hub_tags set updated_at = now() where updated_at is null;
