-- 0002 lines (WhatsApp numbers), inboxes, access, social accounts
create table hub.line_templates(
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  evolution_settings jsonb not null default '{}'::jsonb,
  chatwoot_settings jsonb not null default '{}'::jsonb
);

create table hub.lines(
  id uuid primary key default gen_random_uuid(),
  instance_name text unique not null,           -- Evolution instance
  title_ar text not null,                       -- e.g. واتساب المبيعات 2
  phone_e164 text unique,
  kind text not null default 'sales' check (kind in ('main','sales','promo','support')),
  department_id uuid references hub.departments(id),
  ordinal_in_department int,                    -- 1st,2nd,3rd for signature part 2
  template_id uuid references hub.line_templates(id),
  bridge_mode text not null default 'native' check (bridge_mode in ('native','hub')),
  status text not null default 'pending' check (status in ('pending','qr','connected','disconnected','banned','retired')),
  warmup_until timestamptz,
  daily_cap int,
  created_at timestamptz not null default now()
);

alter table hub.staff add constraint staff_default_line_fk foreign key (default_line_id) references hub.lines(id);

create table hub.inboxes(
  id uuid primary key default gen_random_uuid(),
  line_id uuid references hub.lines(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','facebook','instagram','telegram','livechat','email','linkedin','tiktok','snapchat')),
  chatwoot_inbox_id bigint unique,
  title_ar text not null,
  webhook_mode text not null default 'direct' check (webhook_mode in ('direct','hub')),
  created_at timestamptz not null default now()
);

create table hub.line_access(
  line_id uuid references hub.lines(id) on delete cascade,
  staff_id uuid references hub.staff(id) on delete cascade,
  level int not null check (level in (10,20,30,40)), -- 10 view,20 reply,30 send_as,40 manage
  effect text not null default 'allow' check (effect in ('allow','deny')),
  primary key(line_id, staff_id)
);

create table hub.inbox_access(
  inbox_id uuid references hub.inboxes(id) on delete cascade,
  staff_id uuid references hub.staff(id) on delete cascade,
  level int not null check (level in (10,20,30,40)),
  effect text not null default 'allow' check (effect in ('allow','deny')),
  primary key(inbox_id, staff_id)
);

create table hub.social_accounts(
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  handle text,
  department_id uuid references hub.departments(id),
  inbox_id uuid references hub.inboxes(id),
  status text not null default 'planned',
  meta jsonb not null default '{}'::jsonb
);

create table hub.line_events(
  id bigserial primary key,
  line_id uuid not null references hub.lines(id) on delete cascade,
  event text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create index on hub.line_events(line_id, at desc);
