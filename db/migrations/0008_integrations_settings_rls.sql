-- 0008 integrations, settings, modules, API keys, RLS
create table hub.integrations(
  key text primary key,            -- evolution, google, smtp, smtp ...
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,   -- NEVER store secrets here; secrets live in env/vault
  updated_at timestamptz not null default now()
);
create table hub.feature_modules(
  key text primary key,
  area text not null check (area in ('user','admin')),
  title_ar text not null,
  status text not null default 'coming_soon' check (status in ('live','beta','coming_soon','hidden')),
  required_permission text references hub.permissions(key),
  sort int not null default 100
);
create table hub.app_settings(key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table hub.api_keys(id uuid primary key default gen_random_uuid(), name text not null, key_hash text not null, scopes text[] not null default '{}', created_at timestamptz not null default now(), revoked_at timestamptz);

-- FK to Supabase auth.users when present (portable to plain Postgres)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='auth' and table_name='users') then
    alter table hub.staff add constraint staff_auth_user_fk foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- RLS helpers: identity from JWT claim `sub` (works with Supabase and any JWT-based setup)
create or replace function hub.current_staff_id() returns uuid language sql stable as $$
  select s.id from hub.staff s
  where s.auth_user_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function hub.has_permission(p text) returns boolean language sql stable as $$
  select case
    when exists (select 1 from hub.staff_permission_overrides o where o.staff_id = hub.current_staff_id() and o.permission_key = p and o.effect='deny') then false
    when exists (select 1 from hub.staff_permission_overrides o where o.staff_id = hub.current_staff_id() and o.permission_key = p and o.effect='allow') then true
    else exists (
      select 1 from hub.staff s join hub.role_permissions rp on rp.role_id = s.role_id
      where s.id = hub.current_staff_id() and rp.permission_key = p and s.status='active')
  end
$$;

alter table hub.staff enable row level security;
alter table hub.contacts enable row level security;
alter table hub.contact_phones enable row level security;
alter table hub.tasks enable row level security;
alter table hub.notifications enable row level security;
alter table hub.audit_log enable row level security;
alter table hub.feature_modules enable row level security;

create policy staff_read on hub.staff for select using (hub.current_staff_id() is not null and (hub.has_permission('staff.view') or id = hub.current_staff_id()));
create policy staff_write on hub.staff for all using (hub.has_permission('staff.manage')) with check (hub.has_permission('staff.manage'));
create policy contacts_read on hub.contacts for select using (hub.has_permission('contacts.view'));
create policy contacts_write on hub.contacts for all using (hub.has_permission('contacts.manage')) with check (hub.has_permission('contacts.manage'));
create policy phones_read on hub.contact_phones for select using (hub.has_permission('contacts.view'));
create policy phones_write on hub.contact_phones for all using (hub.has_permission('contacts.manage')) with check (hub.has_permission('contacts.manage'));
create policy tasks_read on hub.tasks for select using (hub.has_permission('tasks.manage_all') or assignee_id = hub.current_staff_id() or creator_id = hub.current_staff_id());
create policy tasks_write on hub.tasks for all using (hub.has_permission('tasks.manage_all') or creator_id = hub.current_staff_id() or assignee_id = hub.current_staff_id()) with check (hub.has_permission('tasks.create') or hub.has_permission('tasks.manage_all'));
create policy notif_own on hub.notifications for all using (staff_id = hub.current_staff_id()) with check (staff_id = hub.current_staff_id());
create policy audit_read on hub.audit_log for select using (hub.has_permission('audit.view'));
create policy modules_read on hub.feature_modules for select using (hub.current_staff_id() is not null);

alter table hub.conversations enable row level security;
alter table hub.messages enable row level security;
