-- ============================================================
--  SALUS TRAIN — ten tests
--
--  Five became ten. Three lifts instead of one, and two station
--  tests that the model was previously guessing at.
--
--  The sled and the wall balls are the additions that earn their
--  place: six of the eight stations are currently a flat 330
--  seconds each in predict_finish, which is a constant rather
--  than a measurement. Those two vary most between members and
--  can't be derived from a squat or an erg.
--
--  Run after 40_running_plan.sql. Safe to re-run.
-- ============================================================

create table if not exists public.test_defs (
  key        text primary key,
  label      text not null,
  unit       text not null,          -- kg | time | reps
  hint       text,
  ord        integer not null,
  scored     boolean default true,   -- counts toward the Salus Score
  feeds      text                    -- what it sets in the programme
);

alter table public.test_defs enable row level security;

drop policy if exists "read test_defs"  on public.test_defs;
drop policy if exists "admin test_defs" on public.test_defs;

create policy "read test_defs" on public.test_defs
  for select to authenticated using (true);
create policy "admin test_defs" on public.test_defs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds) values
  ('bw',      'Bodyweight',        'kg',   'Everything relative is worked out from it.',                    1, false,
   'The squat and deadlift percentages, and how the sleds are scaled.'),
  ('squat',   'Back squat 3RM',    'kg',   'Three reps, as heavy as form holds.',                           2, true,
   'Every squat, lunge and step-up weight in the block.'),
  ('deadlift','Deadlift 5RM',      'kg',   'Five reps. Stop the set when the back rounds, not when it fails.', 3, true,
   'Deadlift and Romanian deadlift loads.'),
  ('press',   'Shoulder press 1RM','kg',   'Strict, from the rack or the floor.',                           4, true,
   'Push press and overhead work.'),
  ('fivek',   '5km',               'time', 'Flat, fresh, honest.',                                          5, true,
   'Every running pace in the block, and half the projection.'),
  ('ski',     '1,000m SkiErg',     'time', 'Station one, and a read on your engine.',                        6, true,
   'The ski leg of the projection.'),
  ('row',     '1,000m Row',        'time', 'Station five, fresh.',                                          7, true,
   'The row leg of the projection.'),
  ('sled',    'Sled push 50m',     'time', 'At race weight. Technique more than strength — most people are slower here than they expect.', 8, true,
   'The sled legs of the projection, which were a flat guess before.'),
  ('wallball','Wall balls',        'reps', 'Max unbroken, 6kg to a 9ft target. Stop when you break, not when you fail.', 9, true,
   'The last station, and the one that decides how a race ends.'),
  ('half',    'The Salus Half',    'time', 'Four runs, four stations. The one that turns an estimate into a projection.', 10, true,
   'The whole projection.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

-- ---------- the standards the score is measured against ----------
--  Matches the shape test_standards already has: a floor that scores
--  zero and a target that scores a hundred, with lower_wins for times
--  and per_kg for lifts. Not the five-band shape used by
--  pillar_standards — two different jobs, two different tables.
insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('deadlift', 'm', 'Deadlift 5RM',       1.10, 2.30, false, true,  'ratio',  6),
  ('deadlift', 'f', 'Deadlift 5RM',       0.85, 1.85, false, true,  'ratio',  6),
  ('press',    'm', 'Shoulder press 1RM', 0.45, 0.95, false, true,  'ratio',  7),
  ('press',    'f', 'Shoulder press 1RM', 0.30, 0.72, false, true,  'ratio',  7),
  ('sled',     'm', 'Sled push 50m',      80,   38,   true,  false, 'time',   8),
  ('sled',     'f', 'Sled push 50m',      95,   45,   true,  false, 'time',   8),
  ('wallball', 'm', 'Wall balls',         20,   120,  false, false, 'reps',   9),
  ('wallball', 'f', 'Wall balls',         16,   100,  false, false, 'reps',   9)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

-- ---------- how many are in ----------
drop view if exists public.my_tests cascade;

create view public.my_tests
with (security_invoker = on) as
select
  d.key, d.label, d.unit, d.hint, d.ord, d.scored, d.feeds,
  case d.key
    when 'half' then (select h.total_s::numeric from public.half_sims h
                       where h.user_id = auth.uid()
                         and h.total_s is not null
                       order by h.created_at desc limit 1)
    else coalesce(
      (select b.value_num from public.benchmarks b
        where b.user_id = auth.uid() and b.key = d.key and b.week = 1),
      (select b.value_s::numeric from public.benchmarks b
        where b.user_id = auth.uid() and b.key = d.key and b.week = 1))
  end                                                        as value
from public.test_defs d
order by d.ord;

grant select on public.my_tests to authenticated;

-- ---------- the prediction, with the sleds measured ----------
--  Replaces the flat 330-per-station constant for the two stations
--  we now have real numbers for. The rest stay constant, honestly
--  labelled as such.
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
  v_5k    integer; v_ski integer; v_row integer;
  v_sled  integer; v_wb  numeric;
  v_squat numeric; v_bw  numeric;
  v_have  integer := 0;

  c_riegel constant numeric := 1.028;   -- 5km to 8km, Riegel at 1.06
  c_erg    constant numeric := 1.10;    -- ergs mid-race vs fresh
  c_rox    constant integer := 330;     -- a station we haven't measured
  c_zone   constant integer := 330;     -- walking between stations

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_s   into v_sled  from public.benchmarks b where b.user_id = p_user and b.key = 'sled'     and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int
          + (v_sled is not null)::int + (v_wb is not null)::int;

  -- Running: Riegel out to 8km, then a penalty for doing it in eight
  -- pieces with a station between each.
  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  -- The ergs, slowed for being done mid-race.
  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- The sleds. Two of them, and the race weight is heavier than a
  -- fresh 50m test feels — 1.25 for the push, 1.35 for the pull,
  -- which is harder for most people.
  v_stations := v_stations
              + round(coalesce(v_sled, 55) * 1.25)
              + round(coalesce(v_sled, 55) * 1.35);

  -- Wall balls. 100 reps at the end of a race, off a max-unbroken
  -- set: someone who can hold 100 unbroken does them in about two
  -- and a half minutes, someone who breaks at 20 takes twice that.
  v_stations := v_stations
              + case when v_wb is null then 300
                     else greatest(150, round(150 + (100 - least(v_wb, 100)) * 3.2))
                end;

  -- The four we still have no measurement for: burpee broad jump,
  -- farmers carry, lunges, and the run-out. Flat, and honest about it.
  v_stations := v_stations + c_rox * 4;

  -- A stronger squat helps the sleds a little, but much less than
  -- people expect — it's a technique problem far more than a
  -- strength one.
  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(70, greatest(-50, round(((v_squat / v_bw) - 1.2) * 80)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 5 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 5 then 'from ' || v_have || ' tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;
