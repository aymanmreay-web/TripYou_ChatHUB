-- 0004 groups, send policy, message ledger, signature
create table hub.groups(
  id uuid primary key default gen_random_uuid(),
  chat_jid text unique not null,
  title text,
  ingest_owner_line_id uuid references hub.lines(id),
  send_mode text not null default 'owner_only' check (send_mode in ('owner_only','any_member_line','allow_list')),
  created_at timestamptz not null default now()
);
create table hub.group_lines(
  group_id uuid references hub.groups(id) on delete cascade,
  line_id uuid references hub.lines(id) on delete cascade,
  priority int not null default 100,
  is_member boolean not null default true,
  primary key(group_id, line_id)
);
create table hub.group_send_allow(
  group_id uuid references hub.groups(id) on delete cascade,
  line_id uuid references hub.lines(id) on delete cascade,
  primary key(group_id, line_id)
);
create table hub.group_participants(
  group_id uuid references hub.groups(id) on delete cascade,
  phone_e164 text not null,
  is_admin boolean not null default false,
  primary key(group_id, phone_e164)
);

create table hub.message_ledger(
  id bigserial primary key,
  chat_jid text not null,
  wa_message_id text not null,
  line_id uuid references hub.lines(id),
  direction text not null check (direction in ('in','out')),
  sent_by uuid references hub.staff(id),
  at timestamptz not null default now(),
  unique(chat_jid, wa_message_id)
);

create table hub.outbound_queue(
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references hub.lines(id),
  chat_jid text not null,
  payload jsonb not null,
  staff_id uuid references hub.staff(id),
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','cancelled')),
  attempts int not null default 0,
  not_before timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);
create index on hub.outbound_queue(status, not_before);

create table hub.signature_settings(
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','line','department','inbox_type')),
  scope_ref text,
  enabled boolean not null default true,
  part_line_name boolean not null default true,
  part_ordinal boolean not null default false,
  part_employee boolean not null default true,
  applies_to text not null default 'both' check (applies_to in ('dm','group','both')),
  position text not null default 'prefix' check (position in ('prefix','suffix')),
  template text not null default '*{employee}* — {line}',
  unique(scope, scope_ref)
);

-- Native direct WhatsApp conversations and messages (Direct with Evolution API)
create table hub.conversations(
  id uuid primary key default gen_random_uuid(),
  chat_jid text not null,
  line_id uuid references hub.lines(id),
  contact_id uuid references hub.contacts(id),
  group_id uuid references hub.groups(id),
  title text,
  is_group boolean not null default false,
  last_message_text text,
  last_message_at timestamptz not null default now(),
  unread_count int not null default 0,
  assigned_staff_id uuid references hub.staff(id),
  status text not null default 'open' check (status in ('open','pending','resolved')),
  created_at timestamptz not null default now(),
  unique(chat_jid, line_id)
);
create index on hub.conversations(line_id, last_message_at desc);

create table hub.messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references hub.conversations(id) on delete cascade,
  chat_jid text not null,
  wa_message_id text not null,
  line_id uuid references hub.lines(id),
  sender_jid text,
  sender_name text,
  direction text not null check (direction in ('in','out')),
  body text,
  media_type text default 'text' check (media_type in ('text','image','audio','video','document','location','sticker','other')),
  media_url text,
  sent_by uuid references hub.staff(id),
  status text not null default 'sent' check (status in ('queued','sending','sent','delivered','read','failed')),
  signature text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique(chat_jid, wa_message_id)
);
create index on hub.messages(conversation_id, created_at asc);
