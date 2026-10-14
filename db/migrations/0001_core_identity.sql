-- 0001 core identity: departments, permissions, roles, staff
create schema if not exists hub;
create extension if not exists pgcrypto;

create table hub.departments(
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title_ar text not null,
  kind text not null default 'sales' check (kind in ('main','sales','promo','support','finance','other')),
  created_at timestamptz not null default now()
);

create table hub.permissions(
  key text primary key,
  grp text not null,
  label_ar text not null,
  super_only boolean not null default false
);

create table hub.roles(
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title_ar text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table hub.role_permissions(
  role_id uuid references hub.roles(id) on delete cascade,
  permission_key text references hub.permissions(key) on delete cascade,
  primary key(role_id, permission_key)
);

create table hub.work_schedules(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Riyadh',
  weekly jsonb not null default '{}'::jsonb, -- {"sun":[["09:00","17:00"]],...}
  created_at timestamptz not null default now()
);

create table hub.holidays(
  id uuid primary key default gen_random_uuid(),
  day date not null,
  title text not null,
  unique(day)
);

create table hub.staff(
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  full_name text not null,
  phone text,
  department_id uuid references hub.departments(id),
  role_id uuid not null references hub.roles(id),
  schedule_id uuid references hub.work_schedules(id),
  chatwoot_user_id bigint unique,
  default_line_id uuid, -- FK added in 0002
  status text not null default 'active' check (status in ('active','suspended','offboarded')),
  target_first_response_sec int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hub.staff_permission_overrides(
  staff_id uuid references hub.staff(id) on delete cascade,
  permission_key text references hub.permissions(key) on delete cascade,
  effect text not null check (effect in ('allow','deny')),
  reason text,
  set_by uuid references hub.staff(id),
  created_at timestamptz not null default now(),
  primary key(staff_id, permission_key)
);

create table hub.staff_presence_events(
  id bigserial primary key,
  staff_id uuid not null references hub.staff(id) on delete cascade,
  state text not null check (state in ('online','busy','offline')),
  at timestamptz not null default now()
);
create index on hub.staff_presence_events(staff_id, at desc);
