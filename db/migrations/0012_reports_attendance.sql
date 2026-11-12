-- ============================================================================
-- 0012 — مركز التقارير الموسع + نظام مراقبة الحضور والدوام وحركات الموظفين
-- TripYou_ChatHUB — دفعة التقارير والدوام (B2)
--
-- المكوّنات:
--   1) hub.staff_sessions      — جلسات الدوام: كل تواجد متصل = جلسة لها بداية ونهاية
--   2) hub.staff_activity_log  — سجل تحركات الموظف: كل انتقال صفحة وحدث
--   3) hub.staff_presence      — الحضور اللحظي: صف واحد لكل موظف يُحدَّث بكل نبضة
--   4) hub.v_attendance_daily  — عرض الدوام اليومي المجمّع (توقيت الرياض)
--   5) hub.audit_log           — ضمان وجوده (إن لم تُطبَّق 0006) لسجل التدقيق
--   6) سياسات RLS بنفس النهج الحالي (مسموح للمصادَقين) — التحصين بالصلاحيات لاحقاً
-- الترحيل idempotent بالكامل: يمكن إعادة تنفيذه بأمان.
-- ============================================================================

-- ─── 1) جلسات الدوام ───
create table if not exists hub.staff_sessions(
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references hub.staff(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  close_reason text check (close_reason in ('logout','timeout','replaced')),
  ip inet,
  user_agent text,
  device text
);
create index if not exists idx_staff_sessions_staff on hub.staff_sessions(staff_id, started_at desc);
create index if not exists idx_staff_sessions_open on hub.staff_sessions(staff_id) where ended_at is null;
create index if not exists idx_staff_sessions_stale on hub.staff_sessions(last_seen_at) where ended_at is null;

-- ─── 2) سجل تحركات الموظف ───
create table if not exists hub.staff_activity_log(
  id bigserial primary key,
  staff_id uuid not null references hub.staff(id) on delete cascade,
  session_id uuid references hub.staff_sessions(id) on delete set null,
  event_type text not null default 'page_view', -- login | logout | page_view | timeout
  route text,
  title text,
  detail jsonb,
  at timestamptz not null default now()
);
create index if not exists idx_staff_activity_staff on hub.staff_activity_log(staff_id, at desc);
create index if not exists idx_staff_activity_at on hub.staff_activity_log(at desc);

-- ─── 3) الحضور اللحظي ───
create table if not exists hub.staff_presence(
  staff_id uuid primary key references hub.staff(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','idle','offline')),
  session_id uuid references hub.staff_sessions(id) on delete set null,
  current_route text,
  current_title text,
  last_heartbeat_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_staff_presence_heartbeat on hub.staff_presence(last_heartbeat_at desc);

-- ─── 4) ضمان سجل التدقيق (لو لم تُطبَّق 0006 على القاعدة الحيّة) ───
create table if not exists hub.audit_log(
  id bigserial primary key,
  actor_id uuid references hub.staff(id),
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  ip inet,
  at timestamptz not null default now()
);
create index if not exists idx_audit_log_at on hub.audit_log(at desc);
create index if not exists idx_audit_log_actor on hub.audit_log(actor_id, at desc);

-- ─── 5) عرض الدوام اليومي المجمّع ───
create or replace view hub.v_attendance_daily as
select
  s.id as staff_id,
  s.full_name as staff_name,
  coalesce(r.title_ar, r.key) as role_name,
  (ss.started_at at time zone 'Asia/Riyadh')::date as day,
  min(ss.started_at) as first_in,
  max(coalesce(ss.ended_at, ss.last_seen_at)) as last_out,
  count(*)::int as sessions_count,
  round(sum(extract(epoch from (coalesce(ss.ended_at, ss.last_seen_at, now()) - ss.started_at)) / 60.0))::int as active_minutes
from hub.staff_sessions ss
join hub.staff s on s.id = ss.staff_id
left join hub.roles r on r.id = s.role_id
group by s.id, s.full_name, coalesce(r.title_ar, r.key), (ss.started_at at time zone 'Asia/Riyadh')::date;

-- ─── 6) سياسات RLS (نفس النهج الحالي: مسموح للمصادَقين — التحصين الدقيق لاحقاً) ───
drop policy if exists staff_sessions_authed_all on hub.staff_sessions;
create policy staff_sessions_authed_all on hub.staff_sessions
  for all to authenticated using (true) with check (true);

drop policy if exists staff_activity_authed_all on hub.staff_activity_log;
create policy staff_activity_authed_all on hub.staff_activity_log
  for all to authenticated using (true) with check (true);

drop policy if exists staff_presence_authed_all on hub.staff_presence;
create policy staff_presence_authed_all on hub.staff_presence
  for all to authenticated using (true) with check (true);
