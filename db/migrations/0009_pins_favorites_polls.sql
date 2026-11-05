-- 0009 pins, favorites, and interactive polls architecture
create schema if not exists hub;

-- 1. تثبيت الرسائل (Pinned Messages)
create table if not exists hub.pinned_messages(
  id uuid primary key default gen_random_uuid(),
  chat_jid text not null,
  message_id text not null,
  body text,
  media_type text default 'text',
  media_url text,
  sender_name text,
  pinned_by uuid references hub.staff(id),
  duration_type text not null default '7d' check (duration_type in ('24h','7d','30d')),
  pinned_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique(chat_jid, message_id)
);
create index if not exists idx_pinned_chat on hub.pinned_messages(chat_jid, pinned_at desc);

-- 2. المفضلة (Staff Favorites System - 6 Categories)
create table if not exists hub.favorites(
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references hub.staff(id) on delete cascade,
  category text not null check (category in ('message','file','media','direct_chat','group','contact')),
  item_id text not null,
  title text not null,
  subtitle text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(staff_id, category, item_id)
);
create index if not exists idx_fav_staff on hub.favorites(staff_id, category);

-- 3. استطلاعات الرأي التفاعلية (Interactive Polls)
create table if not exists hub.interactive_polls(
  id uuid primary key default gen_random_uuid(),
  chat_jid text not null,
  poll_id text not null unique,
  question text not null,
  options jsonb not null default '[]'::jsonb, -- [{"id": 1, "text": "...", "votes": 0}]
  selectable_count int not null default 1,
  created_by uuid references hub.staff(id),
  created_at timestamptz not null default now()
);

create table if not exists hub.interactive_poll_votes(
  poll_id text references hub.interactive_polls(poll_id) on delete cascade,
  voter_jid text not null,
  selected_options jsonb not null default '[]'::jsonb,
  voted_at timestamptz not null default now(),
  primary key(poll_id, voter_jid)
);
