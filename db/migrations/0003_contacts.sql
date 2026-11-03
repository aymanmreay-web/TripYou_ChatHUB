-- 0003 contacts master database
create table hub.contacts(
  id uuid primary key default gen_random_uuid(),
  display_name text,
  company text,
  notes text,
  tags text[] not null default '{}',
  source text,
  merged_into uuid references hub.contacts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table hub.contact_phones(
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references hub.contacts(id) on delete cascade,
  phone_e164 text not null unique,
  is_primary boolean not null default false,
  wa_status text not null default 'unknown' check (wa_status in ('unknown','yes','no')),
  wa_checked_at timestamptz
);
create index on hub.contact_phones(contact_id);

create table hub.contact_names(
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references hub.contacts(id) on delete cascade,
  name text not null,
  source text not null, -- import|whatsapp_pushname|manual|evolution
  created_at timestamptz not null default now()
);

create table hub.contact_lists(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);
create table hub.contact_list_members(
  list_id uuid references hub.contact_lists(id) on delete cascade,
  contact_id uuid references hub.contacts(id) on delete cascade,
  primary key(list_id, contact_id)
);

create table hub.import_batches(
  id uuid primary key default gen_random_uuid(),
  filename text,
  mapping jsonb not null default '{}'::jsonb,
  status text not null default 'uploaded' check (status in ('uploaded','validated','applied','failed','rolled_back')),
  stats jsonb not null default '{}'::jsonb,
  created_by uuid references hub.staff(id),
  created_at timestamptz not null default now()
);
create table hub.import_rows(
  id bigserial primary key,
  batch_id uuid not null references hub.import_batches(id) on delete cascade,
  row_no int not null,
  raw jsonb not null,
  phone_e164 text,
  outcome text check (outcome in ('create','merge','skip','error')),
  error text
);
create index on hub.import_rows(batch_id);

create table hub.contact_sync_state(
  contact_id uuid primary key references hub.contacts(id) on delete cascade,
  evolution_synced_at timestamptz,
  last_error text
);
