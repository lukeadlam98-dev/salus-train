-- ============================================================
--  SALUS TRAIN — the Salus Score
--
--  Five tests, each scored 0–100 against a fixed standard, then
--  averaged. One number for overall fitness.
--
--  Fixed standards rather than a curve against the club, on
--  purpose. Scored against the best member, everyone's number
--  drops whenever someone new posts a big squat — you'd train
--  for eight weeks and watch your score fall. Against a fixed
--  target, your score only moves when you do.
--
--  The standards are rows, not code, so a coach can argue with
--  them and change them.
--
--  Run after 10_media.sql. Safe to re-run.
-- ============================================================

create table if not exists test_standards (
  id        uuid primary key default gen_random_uuid(),
  key       text not null,          -- squat | fivek | ski | row | half
  sex       text not null,          -- 'm' | 'f'
  label     text not null,
  floor_v   numeric not null,       -- scores 0
  target_v  numeric not null,       -- scores 100
  lower_wins boolean default true,  -- times yes, ratios no
  per_kg    boolean default false,  -- score relative to bodyweight
  unit      text,                   -- 'time' | 'ratio' | 'kg'
  ord       integer not null,
  active    boolean default true,
  unique (key, sex)
);

alter table test_standards enable row level security;

drop policy if exists "read test_standards" on test_standards;
create policy "read test_standards" on test_standards
  for select to authenticated using (true);

drop policy if exists "admin writes test_standards" on test_standards;
create policy "admin writes test_standards" on test_standards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- opening standards ----------
-- Floor is "just started". Target is "genuinely strong for the Open
-- category". Deliberately not elite: a score of 100 should be
-- achievable by a good club athlete, or nobody engages with it.
insert into test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord) values
  -- squat scored per kilo of bodyweight, so it isn't just a heavy-person board
  ('squat', 'm', 'Back squat',      0.75,  1.75, false, true,  'ratio', 1),
  ('squat', 'f', 'Back squat',      0.60,  1.40, false, true,  'ratio', 1),
  ('fivek', 'm', '5km',             1800,  1200, true,  false, 'time',  2),
  ('fivek', 'f', '5km',             2040,  1380, true,  false, 'time',  2),
  ('ski',   'm', '1,000m SkiErg',    285,   210, true,  false, 'time',  3),
  ('ski',   'f', '1,000m SkiErg',    330,   245, true,  false, 'time',  3),
  ('row',   'm', '1,000m Row',       270,   200, true,  false, 'time',  4),
  ('row',   'f', '1,000m Row',       310,   235, true,  false, 'time',  4),
  ('half',  'm', 'The Salus Half',  3300,  2160, true,  false, 'time',  5),
  ('half',  'f', 'The Salus Half',  3720,  2520, true,  false, 'time',  5)
on conflict (key, sex) do nothing;

-- ---------- profiles need a sex for the standards to apply ----------
alter table profiles add column if not exists sex text;

-- ============================================================
--  The score itself.
--
--  Each test lands somewhere between floor and target and is
--  clamped to 0–100. The overall is the mean of whatever they
--  have done, so a member with three tests still gets a number —
--  it just says how many it is out of.
-- ============================================================
drop function if exists public.salus_score(uuid) cascade;

create function public.salus_score(p_user uuid)
returns table (
  key       text,
  label     text,
  raw       numeric,
  score     numeric,
  unit      text,
  ord       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select p.id,
           coalesce(p.sex, 'm') as sex,
           (select b.value_num from public.benchmarks b
              where b.user_id = p.id and b.key = 'bw' and b.week = 1) as bw
    from public.profiles p where p.id = p_user
  ),
  raw as (
    select 'squat'::text as key,
           (select b.value_num from public.benchmarks b
              where b.user_id = p_user and b.key = 'squat' and b.week = 1) as v
    union all
    select 'fivek',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'fivek' and b.week = 1)
    union all
    select 'ski',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'ski' and b.week = 1)
    union all
    select 'row',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'row' and b.week = 1)
    union all
    select 'half',
           (select h.total_s from public.half_sims h
              where h.user_id = p_user and h.week_idx = 1)
  )
  select
    s.key::text,
    s.label::text,
    r.v::numeric as raw,
    round(
      greatest(0, least(100,
        case
          -- per_kg tests compare the ratio, not the absolute number
          when s.per_kg then
            case when me.bw is null or me.bw = 0 then null
                 else ((r.v / me.bw) - s.floor_v) / (s.target_v - s.floor_v) * 100
            end
          when s.lower_wins then
            (s.floor_v - r.v) / (s.floor_v - s.target_v) * 100
          else
            (r.v - s.floor_v) / (s.target_v - s.floor_v) * 100
        end
      )), 0)::numeric as score,
    s.unit::text,
    s.ord::integer
  from raw r
  join me on true
  join public.test_standards s
    on s.key = r.key and s.sex = me.sex and s.active
  where r.v is not null
  order by s.ord;
$$;

grant execute on function public.salus_score(uuid) to authenticated;

-- ============================================================
--  A leaderboard of overall scores.
--  Opt-in as ever — a member who hasn't shared appears on none.
-- ============================================================
drop view if exists public.leaderboard_score cascade;

create view leaderboard_score
with (security_invoker = on) as
select
  p.id,
  p.name,
  (select round(avg(s.score)) from public.salus_score(p.id) s)  as score,
  (select count(*) from public.salus_score(p.id) s)             as tests
from profiles p
where p.share_on_leaderboard = true
  and p.name is not null
  and p.role is distinct from 'admin';

grant select on leaderboard_score to authenticated;

-- ---------- add it as a board ----------
insert into leaderboards (key, label, note, source, lower_wins, unit, ord, visible)
values ('score', 'Salus Score',
        'All five tests, scored out of 100 and averaged. Fixed standards, so it only moves when you do.',
        'score', false, 'score', 0, true)
on conflict (key) do nothing;
