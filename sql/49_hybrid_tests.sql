-- ============================================================
--  SALUS TRAIN — nine tests for a hybrid athlete
--
--  What changed and why:
--
--  Both ergs became one 2km row. A 1k ski and a 1k row are two
--  tests measuring nearly the same thing — three or four minutes
--  of the same engine. The 2km is the standard hybrid benchmark,
--  long enough to be a threshold test rather than a sprint, and
--  everybody already knows what a good one is.
--
--  Wall balls became a 400m. Wall balls tell you about one
--  event's last five minutes; speed is the thing hybrid
--  programmes neglect and the marker that separates a fit person
--  from a fast one. It also feeds the pace work directly.
--
--  A pull-up went in. Squat, deadlift and press cover legs and
--  push and left the pulling side entirely unmeasured, which for
--  a hybrid athlete is a real hole.
--
--  All three barbell lifts moved to 3RM. One conversion, clean
--  comparisons when somebody retests, and safer than a 1RM for
--  members who aren't competitive lifters.
--
--  Nothing already recorded is deleted. A retired test's number
--  stays on the row — that was the member's work.
--
--  Run after 48_badges.sql. Safe to re-run.
-- ============================================================

delete from public.test_defs        where key in ('ski', 'wallball');
delete from public.test_standards   where key in ('ski', 'wallball');
delete from public.pillar_standards where key in ('ski', 'wallball');

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds) values
  ('bw',       'Bodyweight',       'kg',   'Everything relative is worked out from it.', 1, false,
   'Every lift target, and how the sleds get scaled.'),

  ('squat',    'Back squat 3RM',   'kg',   'Three reps, as heavy as form holds. Stop the set when the depth goes.', 2, true,
   'Squats, lunges, step-ups and anything else on your legs.'),

  ('deadlift', 'Deadlift 3RM',     'kg',   'Three reps. Stop when the back rounds, not when it fails.', 3, true,
   'Deadlifts, Romanian deadlifts, and the sled pull.'),

  ('press',    'Strict press 3RM', 'kg',   'Strict — no dip, no drive. Three reps.', 4, true,
   'Push press and everything overhead.'),

  ('pullup',   'Weighted pull-up 3RM', 'kg', 'Total load: your bodyweight plus anything added. Three strict reps. Bodyweight only is a valid answer.', 5, true,
   'Pull-ups, rows, and how well you hold a farmers carry.'),

  ('fivek',    '5km',              'time', 'Flat, fresh, honest.', 6, true,
   'Every running pace in the block, and half the projection.'),

  ('row',      '2,000m Row',       'time', 'The hybrid benchmark. Threshold, not a sprint — go out too hard and the last 500 will tell you.', 7, true,
   'Your erg pacing, and the row leg of the projection.'),

  ('fourhundred','400m',           'time', 'Flat out, from a standing start. One rep, fully rested.', 8, true,
   'Speed work targets, and a read on what you have got at the end of a race.'),

  ('half',     'The Salus Half',   'time', 'Four runs, four stations. Turns an estimate into a projection.', 9, true,
   'The whole projection.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

-- ---------- what good looks like ----------
--
--  Lifts as a multiple of bodyweight. The pull-up is total load over
--  bodyweight, so a strict bodyweight-only triple is exactly 1.00 and
--  everybody sits on one scale — no branching between "can you do a
--  pull-up" and "how much can you add".
insert into public.pillar_standards (key, sex, poor, ok, good, great, elite) values
  ('squat_bw',     'm', 0.90, 1.20, 1.50, 1.80, 2.20),
  ('squat_bw',     'f', 0.70, 0.95, 1.20, 1.45, 1.80),
  ('deadlift_bw',  'm', 1.10, 1.45, 1.80, 2.15, 2.60),
  ('deadlift_bw',  'f', 0.85, 1.15, 1.45, 1.75, 2.10),
  ('press_bw',     'm', 0.42, 0.55, 0.70, 0.85, 1.00),
  ('press_bw',     'f', 0.28, 0.38, 0.50, 0.62, 0.78),
  ('pullup_bw',    'm', 0.85, 1.00, 1.15, 1.30, 1.50),
  ('pullup_bw',    'f', 0.80, 1.00, 1.12, 1.25, 1.42),
  ('fivek',        'm', 1800, 1620, 1440, 1290, 1140),
  ('fivek',        'f', 2010, 1800, 1620, 1440, 1290),
  ('row',          'm',  510,  465,  428,  400,  375),
  ('row',          'f',  580,  528,  485,  452,  420),
  ('fourhundred',  'm',   90,   80,   72,   65,   58),
  ('fourhundred',  'f',  105,   93,   84,   76,   68)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('pullup',      'm', 'Weighted pull-up 3RM', 0.85, 1.55, false, true,  'ratio', 5),
  ('pullup',      'f', 'Weighted pull-up 3RM', 0.80, 1.45, false, true,  'ratio', 5),
  ('row',         'm', '2,000m Row',            510,  370, true,  false, 'time',  7),
  ('row',         'f', '2,000m Row',            580,  415, true,  false, 'time',  7),
  ('fourhundred', 'm', '400m',                   92,   57, true,  false, 'time',  8),
  ('fourhundred', 'f', '400m',                  107,   67, true,  false, 'time',  8)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

-- ============================================================
--  FOUR PILLARS
--
--  Lower, Upper, Engine, Speed. Better than Strength and Engine
--  because "your upper body is behind" is an instruction and
--  "your strength is behind" is a shrug.
-- ============================================================
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar   text,
  score    numeric,
  tests    integer,
  weakest  text,
  detail   jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
  v_squat numeric; v_dead numeric; v_press numeric; v_pull numeric;
  v_5k numeric; v_row numeric; v_400 numeric;
  s_squat numeric; s_dead numeric; s_press numeric; s_pull numeric;
  s_5k numeric; s_row numeric; s_400 numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'          and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'       and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift'    and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'       and b.week = 1;
  select b.value_num into v_pull  from public.benchmarks b where b.user_id = p_user and b.key = 'pullup'      and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'       and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'         and b.week = 1;
  select b.value_s   into v_400   from public.benchmarks b where b.user_id = p_user and b.key = 'fourhundred' and b.week = 1;

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
    s_pull  := public.score_one('pullup_bw',   v_sex, v_pull  / v_bw);
  end if;

  s_5k  := public.score_one('fivek',       v_sex, v_5k);
  s_row := public.score_one('row',         v_sex, v_row);
  s_400 := public.score_one('fourhundred', v_sex, v_400);

  return query
  select * from (values
    ('Lower'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead))),

    ('Upper',
     (select round(avg(x), 0) from unnest(array[s_press, s_pull]) x where x is not null),
     (select count(*)::integer from unnest(array[s_press, s_pull]) x where x is not null),
     (select k from (values ('Strict press', s_press), ('Pull-up', s_pull)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Strict press', round(s_press), 'Pull-up', round(s_pull))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('2k row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), '2k row', round(s_row))),

    ('Speed',
     round(s_400, 0),
     (case when s_400 is null then 0 else 1 end),
     (case when s_400 is null then null else '400m' end),
     jsonb_build_object('400m', round(s_400)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- the projection, on the new tests ----------
--  The 2km row extends to the race's 1km leg; the 400 gives a read on
--  what's left at the end. The ski becomes a constant, which is honest
--  — we no longer measure it.
drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k integer; v_row integer; v_400 integer;
  v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;
  c_erg    constant numeric := 1.10;
  c_rox    constant integer := 330;
  c_zone   constant integer := 330;

  v_run integer; v_stations integer; v_1k integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'       and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'         and b.week = 1;
  select b.value_s   into v_400   from public.benchmarks b where b.user_id = p_user and b.key = 'fourhundred' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'       and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'          and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_row is not null)::int
          + (v_400 is not null)::int + (v_squat is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  -- A 1km row from a 2km, using the same Riegel exponent. Halving the
  -- distance is worth roughly 4% a metre.
  v_1k := case when v_row is null then 250
               else round(v_row * power(0.5, 1.06)) end;

  -- The ski is no longer tested, so it's a constant like the rest.
  v_stations := round(v_1k * c_erg) + round(260 * c_erg) + c_rox * 6;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 4 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;
