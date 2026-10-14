-- 0007 campaigns: placeholder only; detailed design deferred by decision
create table hub.campaigns(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','done','cancelled')),
  line_id uuid references hub.lines(id),
  list_id uuid references hub.contact_lists(id),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references hub.staff(id),
  created_at timestamptz not null default now()
);
