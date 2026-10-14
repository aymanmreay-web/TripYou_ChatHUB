-- 0005 tasks, meetings, notifications
create table hub.tasks(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','blocked','done','cancelled')),
  priority int not null default 2 check (priority between 1 and 4),
  assignee_id uuid references hub.staff(id),
  creator_id uuid references hub.staff(id),
  due_at timestamptz,
  chatwoot_conversation_id bigint,
  contact_id uuid references hub.contacts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on hub.tasks(assignee_id, status);
create table hub.task_watchers(task_id uuid references hub.tasks(id) on delete cascade, staff_id uuid references hub.staff(id) on delete cascade, primary key(task_id, staff_id));
create table hub.task_comments(id uuid primary key default gen_random_uuid(), task_id uuid not null references hub.tasks(id) on delete cascade, author_id uuid references hub.staff(id), body text not null, created_at timestamptz not null default now());
create table hub.task_checklist(id uuid primary key default gen_random_uuid(), task_id uuid not null references hub.tasks(id) on delete cascade, text text not null, done boolean not null default false, sort int not null default 0);
create table hub.task_events(id bigserial primary key, task_id uuid not null references hub.tasks(id) on delete cascade, actor_id uuid references hub.staff(id), event text not null, detail jsonb, at timestamptz not null default now());
create table hub.task_attachments(id uuid primary key default gen_random_uuid(), task_id uuid not null references hub.tasks(id) on delete cascade, storage_path text not null, filename text, created_at timestamptz not null default now());

create table hub.meetings(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meet_url text,
  google_event_id text,
  organizer_id uuid references hub.staff(id),
  contact_id uuid references hub.contacts(id),
  chatwoot_conversation_id bigint,
  created_at timestamptz not null default now()
);
create table hub.meeting_deliveries(
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references hub.meetings(id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  sent_at timestamptz,
  error text
);

create table hub.notifications(
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references hub.staff(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on hub.notifications(staff_id, read_at, created_at desc);
create table hub.notification_preferences(staff_id uuid references hub.staff(id) on delete cascade, kind text not null, in_app boolean not null default true, push boolean not null default true, primary key(staff_id, kind));
create table hub.push_subscriptions(id uuid primary key default gen_random_uuid(), staff_id uuid not null references hub.staff(id) on delete cascade, endpoint text unique not null, keys jsonb not null, created_at timestamptz not null default now());
create table hub.events_outbox(id bigserial primary key, topic text not null, payload jsonb not null, created_at timestamptz not null default now(), processed_at timestamptz);
