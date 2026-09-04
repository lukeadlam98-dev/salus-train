-- ============================================================
--  SALUS TRAIN — leaderboards
--
--  The Board tab stops being one hardcoded list. Boards become
--  rows: which ones exist, what they're built from, whether a
--  low number or a high one wins, and what order they appear in.
--
--  Sharing stays opt-in throughout. A member who hasn't switched
--  it on appears on no board, however the boards are configured.
--
--  Run after 07_coach_view.sql. Safe to re-run.
-- ============================================================

create table if not exists leaderboards (
  id        uuid primary key default gen_random_uuid(),
  key       text unique not null,
  label     text not null,
  note      text,
  source    text not null,              -- 'half' or a benchmarks.key
  lower_wins boolean default true,      -- times: yes. kilos: no.
  unit      text,                       -- 'time' | 'kg' | 'reps'
  ord       integer not null,
  visible   boolean default true
);

alter table leaderboards enable row level security;

drop policy if exists "read leaderboards" on leaderboards;
create policy "read leaderboards" on leaderboards
  for select to authenticated using (true);

drop policy if exists "admin writes leaderboards" on leaderboards;
create policy "admin writes leaderboards" on leaderboards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into leaderboards (key, label, note, source, lower_wins, unit, ord, visible) values
  ('half',  'The Salus Half', 'Projected finish from the week 1 half.', 'half',  true,  'time', 1, true),
  ('fivek', '5km',            'The week 1 time trial.',                  'fivek', true,  'time', 2, true),
  ('squat', 'Back Squat 5RM', 'Heaviest five held at depth.',            'squat', false, 'kg',   3, true),
  ('ski',   '1,000m SkiErg',  'Fresh, all out.',                         'ski',   true,  'time', 4, true),
  ('row',   '1,000m Row',     'Fresh, all out.',                         'row',   true,  'time', 5, false)
on conflict (key) do nothing;

-- ============================================================
--  One view for every benchmark board.
--
--  Only members who opted in appear, and only their name and
--  number are exposed — never the user id.
-- ============================================================
drop view if exists public.leaderboard_benchmarks cascade;

create view leaderboard_benchmarks
with (security_invoker = on) as
select
  b.key           as board_key,
  p.name          as name,
  b.value_num     as value_num,
  b.value_s       as value_s,
  b.week          as week
from benchmarks b
join profiles p on p.id = b.user_id
where p.share_on_leaderboard = true
  and p.name is not null
  and b.week = 1
  and (b.value_num is not null or b.value_s is not null);

grant select on leaderboard_benchmarks to authenticated;

-- The half board already exists from 02_schema as leaderboard_half.
-- Recreated here so both boards read the same way.
drop view if exists public.leaderboard_half cascade;

create view leaderboard_half
with (security_invoker = on) as
select
  p.name         as name,
  h.projected_s  as projected_s,
  h.total_s      as total_s,
  h.week_idx     as week_idx
from half_sims h
join profiles p on p.id = h.user_id
where p.share_on_leaderboard = true
  and p.name is not null
  and h.projected_s is not null;

grant select on leaderboard_half to authenticated;

-- ============================================================
--  What a coach sees: everyone, sharing or not, so you know who
--  is missing from the board and why.
-- ============================================================
drop view if exists public.leaderboard_admin cascade;

create view leaderboard_admin
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.share_on_leaderboard as sharing,
  (select h.projected_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1) as projected_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'fivek' and b.week = 1) as fivek_s,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'squat' and b.week = 1) as squat_kg
from profiles p
where p.role is distinct from 'admin';

grant select on leaderboard_admin to authenticated;
