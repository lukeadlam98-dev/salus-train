-- ============================================================
--  SALUS TRAIN — wall balls back in, sled stays out
--
--  The two were removed together, but they aren't the same
--  test. Wall balls are standard everywhere: a 6kg or 9kg ball
--  to a fixed target height. A member can do the test at Salus,
--  at a HYROX, or anywhere else and the number means the same
--  thing.
--
--  The sled doesn't travel. Surface, sled type and what "race
--  weight" means all vary by floor, so the number is about the
--  gym as much as the athlete.
--
--  Nine tests, and one more measured station in the model.
--
--  Run after 43_eight_tests.sql. Safe to re-run.
-- ============================================================

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds)
values
  ('wallball', 'Wall balls unbroken', 'reps',
   'How many before you put the ball down. 6kg to a 9ft target, or 9kg to 10ft. Stop when you break the set, not when you fail a rep.',
   9, true,
   'The last station, and how much of it you can do without putting the ball down.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('wallball', 'm', 'Wall balls unbroken', 20, 120, false, false, 'reps', 9),
  ('wallball', 'f', 'Wall balls unbroken', 16, 100, false, false, 'reps', 9)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

insert into public.pillar_standards (key, sex, poor, ok, good, great, elite)
values
  ('wallball', 'm', 25, 45, 70, 100, 140),
  ('wallball', 'f', 20, 38, 60,  85, 120)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

-- ---------- it joins the engine ----------
--  Not a third pillar on its own. One test doesn't make a category,
--  and a hundred wall balls at the end of a race is an aerobic
--  problem far more than a strength one — which is why people who
--  can squat break at thirty.
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
  v_squat numeric; v_dead numeric; v_press numeric;
  v_5k numeric; v_ski numeric; v_row numeric; v_wb numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric; s_wb numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift' and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'    and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k  := public.score_one('fivek',    v_sex, v_5k);
  s_ski := public.score_one('ski',      v_sex, v_ski);
  s_row := public.score_one('row',      v_sex, v_row);
  s_wb  := public.score_one('wallball', v_sex, v_wb);

  return query
  select * from (values
    ('Strength'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead), ('Shoulder press', s_press)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead), 'Shoulder press', round(s_press))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_ski, s_row, s_wb]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_ski, s_row, s_wb]) x where x is not null),
     (select k from (values ('5km', s_5k), ('SkiErg', s_ski), ('Row', s_row), ('Wall balls', s_wb)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski),
                        'Row', round(s_row), 'Wall balls', round(s_wb)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- and into the prediction ----------
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
  v_5k integer; v_ski integer; v_row integer;
  v_wb numeric; v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;
  c_erg    constant numeric := 1.10;
  c_rox    constant integer := 330;   -- a station we don't measure
  c_zone   constant integer := 330;

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int
          + (v_wb is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- A hundred wall balls at the end of a race. Someone holding a
  -- hundred unbroken gets through in about two and a half minutes;
  -- someone breaking at twenty takes closer to seven, because every
  -- break costs the pick-up as well as the rest.
  v_stations := v_stations
              + case when v_wb is null then 300
                     else greatest(150, round(150 + (100 - least(v_wb, 100)) * 3.2))
                end;

  -- The seven we still don't measure.
  v_stations := v_stations + c_rox * 5;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 5 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 5 then 'from all five tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;
