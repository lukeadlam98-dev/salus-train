-- ============================================================
--  SALUS TRAIN — running
--
--  HYROX is 8km of running with eight stations in the way, and
--  the app has been treating runs as text. This gives them the
--  same logging strength has.
--
--  Two kinds:
--    straight       — a 5km, a long run, intervals
--    compromised    — run, station, run, station. The whole
--                     point of the race, and the thing nobody
--                     trains until it's too late.
--
--  Not syncing from Strava, deliberately. Their 2026 terms cap
--  storage at a seven-day transient cache and forbid showing a
--  member's data to anyone but themselves — which rules out both
--  eight-week progress and the community feed. Apple Health has
--  neither restriction and arrives free with the native wrapper.
--
--  Run after 19_race_image.sql. Safe to re-run.
-- ============================================================

create table if not exists public.run_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  session_id   uuid references public.sessions on delete set null,
  kind         text default 'straight',   -- straight | compromised | race
  distance_m   integer,
  seconds      integer,
  effort       integer,
  surface      text,                      -- road | treadmill | track | trail
  note         text,
  ran_at       timestamptz default now(),
  created_at   timestamptz default now()
);

alter table public.run_logs enable row level security;

drop policy if exists "own runs read"   on public.run_logs;
drop policy if exists "own runs write"  on public.run_logs;
drop policy if exists "own runs update" on public.run_logs;
drop policy if exists "own runs delete" on public.run_logs;

create policy "own runs read"   on public.run_logs
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own runs write"  on public.run_logs
  for insert with check (auth.uid() = user_id);
create policy "own runs update" on public.run_logs
  for update using (auth.uid() = user_id);
create policy "own runs delete" on public.run_logs
  for delete using (auth.uid() = user_id);

-- ---------- each rep of an interval or compromised session ----------
create table if not exists public.run_splits (
  id          uuid primary key default gen_random_uuid(),
  run_log_id  uuid references public.run_logs on delete cascade not null,
  idx         integer not null,
  distance_m  integer,
  seconds     integer,
  is_station  boolean default false,   -- the work between the runs
  label       text,
  unique (run_log_id, idx)
);

alter table public.run_splits enable row level security;

drop policy if exists "own splits read"  on public.run_splits;
drop policy if exists "own splits write" on public.run_splits;

create policy "own splits read" on public.run_splits
  for select using (exists (
    select 1 from public.run_logs r
    where r.id = run_splits.run_log_id
      and (r.user_id = auth.uid() or public.is_admin())));
create policy "own splits write" on public.run_splits
  for all using (exists (
    select 1 from public.run_logs r
    where r.id = run_splits.run_log_id and r.user_id = auth.uid()));

-- ---------- the sessions table needs running fields ----------
alter table public.sessions add column if not exists run_distance_m integer;
alter table public.sessions add column if not exists run_reps integer;
alter table public.sessions add column if not exists run_pace_pct numeric;
--   run_pace_pct: 1.00 = 5km race pace, 1.10 = 10% slower, 0.95 = faster.
--   Held as a fraction of the member's own tested 5km, so a target pace
--   means the same effort to everyone rather than the same number.

-- ---------- target paces, from their own 5km ----------
--
-- The declared columns and the returned columns have to line up
-- exactly, in order and in type. The previous version listed four
-- columns and returned three, which Postgres reports as a return
-- type mismatch at whichever column first disagrees.
drop function if exists public.my_paces(uuid) cascade;

create function public.my_paces(p_user uuid)
returns table (
  label      text,
  pct        numeric,
  sec_per_km integer,
  note       text
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select (b.value_s / 5.0) as five_k_pace
    from public.benchmarks b
    where b.user_id = p_user and b.key = 'fivek' and b.week = 1
    limit 1
  ),
  bands (label, pct, note) as (
    values
      ('Easy'::text,      1.28::numeric,
       'Conversational. Most of your running should be here.'::text),
      ('Steady',          1.14,
       'Comfortably hard. The pace of a long compromised session.'),
      ('Race pace',       1.06,
       'What 8km inside a HYROX actually feels like.'),
      ('5km',             1.00,
       'Your tested pace, fresh.'),
      ('Interval',        0.94,
       'Faster than 5km. For 400s and 800s.')
  )
  select
    bands.label,
    bands.pct,
    round(base.five_k_pace * bands.pct)::integer,
    bands.note
  from bands
  cross join base
  where base.five_k_pace is not null
  order by bands.pct desc;
$$;

grant execute on function public.my_paces(uuid) to authenticated;

-- ---------- a member's running, for Progress ----------
drop view if exists public.run_history cascade;

create view public.run_history
with (security_invoker = on) as
select
  r.user_id,
  r.ran_at::date            as on_date,
  r.kind,
  r.distance_m,
  r.seconds,
  case when r.distance_m > 0
       then round(r.seconds::numeric / (r.distance_m / 1000.0))
  end                        as sec_per_km
from public.run_logs r
where r.seconds > 0;

grant select on public.run_history to authenticated;
