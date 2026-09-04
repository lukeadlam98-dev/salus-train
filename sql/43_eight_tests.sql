-- ============================================================
--  SALUS TRAIN — back to eight
--
--  The sled and the wall balls come out. Reasonable call: both
--  need equipment set to race weight and a consistent target
--  height to mean anything, and a test nobody can repeat the
--  same way twice is worse than no test.
--
--  So the model goes back to treating the six unmeasured
--  stations as a constant. That is honest — it was never
--  pretending otherwise.
--
--  Run after 42_pillars.sql. Safe to re-run.
-- ============================================================

delete from public.test_defs      where key in ('sled', 'wallball');
delete from public.test_standards where key in ('sled', 'wallball');
delete from public.pillar_standards where key in ('sled', 'wallball');

-- Anything already recorded stays. Removing a member's number because
-- the test was retired is not the app's decision to make.

-- ---------- two pillars, not three ----------
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
  v_5k numeric; v_ski numeric; v_row numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric;
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

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k  := public.score_one('fivek', v_sex, v_5k);
  s_ski := public.score_one('ski',   v_sex, v_ski);
  s_row := public.score_one('row',   v_sex, v_row);

  return query
  select * from (values
    ('Strength'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead), ('Shoulder press', s_press)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead), 'Shoulder press', round(s_press))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('SkiErg', s_ski), ('Row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski), 'Row', round(s_row)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- the prediction, without them ----------
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
  v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;   -- 5km to 8km, Riegel at 1.06
  c_erg    constant numeric := 1.10;    -- ergs mid-race vs fresh
  c_rox    constant integer := 330;     -- a station we don't measure
  c_zone   constant integer := 330;     -- walking between stations

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek' and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'   and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'   and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat' and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'    and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg)
              + c_rox * 6;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 4 then 'good'
          when v_have = 3  then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have = 3  then 'from three tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;
