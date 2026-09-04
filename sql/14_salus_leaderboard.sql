-- ============================================================
--  SALUS TRAIN — the Salus Leaderboard
--
--  Ranked the way ATHX ranks: a placing in each of the five
--  tests, ranks added up, lowest total wins.
--
--  Why ranks rather than points against a standard: a
--  leaderboard is relative by definition. Being 4th is the
--  fact — the gap in seconds isn't what anyone is arguing
--  about in the room. Ranking also handles the mixed units
--  cleanly, which points never quite do.
--
--  The Salus Score stays as it is, on You. That one is scored
--  against fixed standards so it only moves when the member
--  does, which is what a progress measure needs and a
--  leaderboard doesn't.
--
--  A test not done takes last place, so someone with three of
--  five sinks rather than being flattered by the average of
--  what they did do. Same as a DNF.
--
--  Every table is schema-qualified. Supabase's SQL editor
--  doesn't always run with public on the search path, and an
--  unqualified name fails with "relation does not exist" in a
--  way that looks like the table is missing when it isn't.
--
--  Run after 13_programme_delete.sql. Safe to re-run.
-- ============================================================

drop view if exists public.salus_leaderboard cascade;

create view public.salus_leaderboard
with (security_invoker = on) as
with shared as (
  select
    p.id,
    p.name,
    coalesce(p.sex, 'm') as sex,
    (select b.value_num from public.benchmarks b
       where b.user_id = p.id and b.key = 'bw' and b.week = 1) as bw
  from public.profiles p
  where p.share_on_leaderboard = true
    and p.name is not null
    and p.role is distinct from 'admin'
),
raw as (
  select
    s.id, s.name, s.sex,
    -- squat relative to bodyweight, or it's just a board for heavy people
    case when s.bw > 0 then
      (select b.value_num from public.benchmarks b
         where b.user_id = s.id and b.key = 'squat' and b.week = 1) / s.bw
    end as squat,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'fivek' and b.week = 1) as fivek,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'ski' and b.week = 1)   as ski,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'row' and b.week = 1)   as row_s,
    (select h.total_s from public.half_sims h
       where h.user_id = s.id and h.week_idx = 1)                 as half
  from shared s
),
ranked as (
  select
    r.*,
    rank() over (order by r.squat  desc nulls last) as r_squat,
    rank() over (order by r.fivek  asc  nulls last) as r_fivek,
    rank() over (order by r.ski    asc  nulls last) as r_ski,
    rank() over (order by r.row_s  asc  nulls last) as r_row,
    rank() over (order by r.half   asc  nulls last) as r_half,
    (r.squat is not null)::int
      + (r.fivek is not null)::int
      + (r.ski   is not null)::int
      + (r.row_s is not null)::int
      + (r.half  is not null)::int as tests_done
  from raw r
)
select
  id, name, sex,
  squat, fivek, ski, row_s, half,
  r_squat, r_fivek, r_ski, r_row, r_half,
  tests_done,
  (r_squat + r_fivek + r_ski + r_row + r_half) as points,
  -- "place", not "position": position is a reserved word in Postgres.
  rank() over (
    order by (r_squat + r_fivek + r_ski + r_row + r_half) asc,
             tests_done desc
  ) as place
from ranked;

grant select on public.salus_leaderboard to authenticated;

-- ---------- one member's card, with their five placings ----------
drop function if exists public.my_leaderboard_row(uuid) cascade;

create function public.my_leaderboard_row(p_user uuid)
returns table (
  place      bigint,
  points     bigint,
  tests_done integer,
  field      bigint,
  r_squat    bigint,
  r_fivek    bigint,
  r_ski      bigint,
  r_row      bigint,
  r_half     bigint,
  squat      numeric,
  fivek      integer,
  ski        integer,
  row_s      integer,
  half       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.place::bigint, l.points::bigint, l.tests_done::integer,
    (select count(*) from public.salus_leaderboard)::bigint,
    l.r_squat::bigint, l.r_fivek::bigint, l.r_ski::bigint,
    l.r_row::bigint, l.r_half::bigint,
    l.squat::numeric, l.fivek::integer, l.ski::integer,
    l.row_s::integer, l.half::integer
  from public.salus_leaderboard l
  where l.id = p_user;
$$;

grant execute on function public.my_leaderboard_row(uuid) to authenticated;

-- ---------- make it the main board ----------
update public.leaderboards
   set label      = 'Salus Leaderboard',
       note       = 'Your placing in each of the five tests, added up. Lowest wins.',
       source     = 'salus',
       unit       = 'points',
       lower_wins = true,
       ord        = 0,
       visible    = true
 where key = 'score';

insert into public.leaderboards
  (key, label, note, source, lower_wins, unit, ord, visible)
values
  ('salus', 'Salus Leaderboard',
   'Your placing in each of the five tests, added up. Lowest wins.',
   'salus', true, 'points', 0, true)
on conflict (key) do update set
  label      = excluded.label,
  note       = excluded.note,
  source     = excluded.source,
  unit       = excluded.unit,
  lower_wins = excluded.lower_wins,
  ord        = excluded.ord,
  visible    = excluded.visible;
