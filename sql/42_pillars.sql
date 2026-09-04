-- ============================================================
--  SALUS TRAIN — strength, engine, stations
--
--  One Salus Score says where you rank. It doesn't say what to
--  do on Monday. Three do:
--
--    Strength  the three lifts, relative to bodyweight
--    Engine    5km, ski, row
--    Stations  sled and wall balls
--
--  Relative to bodyweight throughout, because HYROX is carrying
--  yourself for eight kilometres. An 80kg member pressing 60 is
--  in better shape for it than a 110kg member pressing 70, and
--  an absolute number says the opposite.
--
--  Run after 41_ten_tests.sql. Safe to re-run.
-- ============================================================

-- ---------- what good looks like, as multiples of bodyweight ----------
create table if not exists public.pillar_standards (
  key    text not null,
  sex    text not null,
  poor   numeric, ok numeric, good numeric, great numeric, elite numeric,
  primary key (key, sex)
);

alter table public.pillar_standards enable row level security;

drop policy if exists "read pillar_standards"  on public.pillar_standards;
drop policy if exists "admin pillar_standards" on public.pillar_standards;

create policy "read pillar_standards" on public.pillar_standards
  for select to authenticated using (true);
create policy "admin pillar_standards" on public.pillar_standards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

--  Lifts as a multiple of bodyweight. Times in seconds, lower better.
--  Wall balls in reps, higher better.
insert into public.pillar_standards (key, sex, poor, ok, good, great, elite) values
  ('squat_bw',    'm', 0.90, 1.20, 1.50, 1.80, 2.20),
  ('squat_bw',    'f', 0.70, 0.95, 1.20, 1.45, 1.80),
  ('deadlift_bw', 'm', 1.10, 1.45, 1.80, 2.15, 2.60),
  ('deadlift_bw', 'f', 0.85, 1.15, 1.45, 1.75, 2.10),
  ('press_bw',    'm', 0.45, 0.60, 0.75, 0.90, 1.10),
  ('press_bw',    'f', 0.30, 0.42, 0.55, 0.68, 0.85),
  ('fivek',       'm', 1800, 1620, 1440, 1290, 1140),
  ('fivek',       'f', 2010, 1800, 1620, 1440, 1290),
  ('ski',         'm',  300,  270,  245,  225,  205),
  ('ski',         'f',  345,  310,  280,  255,  232),
  ('row',         'm',  290,  262,  238,  218,  198),
  ('row',         'f',  335,  300,  272,  248,  225),
  ('sled',        'm',   80,   64,   52,   43,   35),
  ('sled',        'f',   95,   76,   62,   51,   41),
  ('wallball',    'm',   25,   45,   70,  100,  140),
  ('wallball',    'f',   20,   38,   60,   85,  120)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

-- ---------- one test, scored 0 to 100 ----------
--  Piecewise between the five anchors, so the curve is flat where
--  progress is easy and steep where it isn't. Clamped: nobody scores
--  120 for a freak lift, and nobody scores below zero for a bad day.
drop function if exists public.score_one(text, text, numeric) cascade;

create function public.score_one(p_key text, p_sex text, p_value numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.pillar_standards%rowtype;
  lower_better boolean;
  bands numeric[];
  marks numeric[] := array[20, 40, 60, 80, 100];
  i integer;
begin
  select * into s from public.pillar_standards
   where key = p_key and sex = coalesce(p_sex, 'm');
  if not found or p_value is null then return null; end if;

  lower_better := p_key in ('fivek', 'ski', 'row', 'sled');
  bands := array[s.poor, s.ok, s.good, s.great, s.elite];

  if lower_better then
    if p_value >= bands[1] then return 20 * (bands[1] / p_value); end if;
    if p_value <= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value > bands[i + 1] then
        return marks[i] + 20 *
          ((bands[i] - p_value) / nullif(bands[i] - bands[i + 1], 0));
      end if;
    end loop;
  else
    if p_value <= bands[1] then return 20 * (p_value / nullif(bands[1], 0)); end if;
    if p_value >= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value < bands[i + 1] then
        return marks[i] + 20 *
          ((p_value - bands[i]) / nullif(bands[i + 1] - bands[i], 0));
      end if;
    end loop;
  end if;
  return 100;
end;
$$;

grant execute on function public.score_one(text, text, numeric) to authenticated;

-- ---------- the three pillars ----------
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
  v_sled numeric; v_wb numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric;
  s_sled numeric; s_wb numeric;
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
  select b.value_s   into v_sled  from public.benchmarks b where b.user_id = p_user and b.key = 'sled'     and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;

  -- Lifts only score with a bodyweight to divide by. Without one the
  -- pillar is honestly empty rather than quietly absolute.
  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k   := public.score_one('fivek',    v_sex, v_5k);
  s_ski  := public.score_one('ski',      v_sex, v_ski);
  s_row  := public.score_one('row',      v_sex, v_row);
  s_sled := public.score_one('sled',     v_sex, v_sled);
  s_wb   := public.score_one('wallball', v_sex, v_wb);

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
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski), 'Row', round(s_row))),

    ('Stations',
     (select round(avg(x), 0) from unnest(array[s_sled, s_wb]) x where x is not null),
     (select count(*)::integer from unnest(array[s_sled, s_wb]) x where x is not null),
     (select k from (values ('Sled push', s_sled), ('Wall balls', s_wb)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Sled push', round(s_sled), 'Wall balls', round(s_wb)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;
