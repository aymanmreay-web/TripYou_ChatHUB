-- 0006 reporting + audit
create table hub.audit_log(
  id bigserial primary key,
  actor_id uuid references hub.staff(id),
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  ip inet,
  at timestamptz not null default now()
);
create index on hub.audit_log(at desc);
create index on hub.audit_log(actor_id, at desc);

create table hub.report_definitions(
  key text primary key,
  category text not null,
  title_ar text not null,
  description text,
  required_permission text references hub.permissions(key),
  params_schema jsonb not null default '{}'::jsonb,
  enabled boolean not null default true
);
create table hub.report_schedules(
  id uuid primary key default gen_random_uuid(),
  report_key text not null references hub.report_definitions(key) on delete cascade,
  cron text not null,
  recipients uuid[] not null default '{}',
  params jsonb not null default '{}'::jsonb,
  enabled boolean not null default true
);
create table hub.report_runs(
  id uuid primary key default gen_random_uuid(),
  report_key text not null references hub.report_definitions(key),
  requested_by uuid references hub.staff(id),
  params jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  result_path text,
  created_at timestamptz not null default now()
);
create table hub.metrics_daily(
  day date not null,
  staff_id uuid references hub.staff(id),
  line_id uuid references hub.lines(id),
  metric text not null,
  value numeric not null
);
create unique index metrics_daily_uq on hub.metrics_daily(day, metric, coalesce(staff_id,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(line_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table hub.conversation_facts(
  chatwoot_conversation_id bigint primary key,
  line_id uuid references hub.lines(id),
  assignee_id uuid references hub.staff(id),
  opened_at timestamptz,
  first_response_sec int,
  resolution_sec int,
  messages_in int not null default 0,
  messages_out int not null default 0,
  status text,
  updated_at timestamptz not null default now()
);
create table hub.sync_jobs(
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null default 'queued',
  cursor jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error text
);
