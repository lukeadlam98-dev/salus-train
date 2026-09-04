-- ============================================================
--  SALUS TRAIN — the running, properly
--
--  Three runs a week that each do a different job, from the
--  club's own coaching notes:
--
--    Easy      Zone 2 by Maffetone. Time in zone, not pace.
--    Intervals Six-minute blocks stepping up to race pace.
--    Speed     A rotating ladder of short reps.
--
--  All three progress by rule rather than by a number typed into
--  a session, so week six is derived from week one and a coach
--  changing the start changes the whole block.
--
--  Run after 39_race_images.sql. Safe to re-run.
-- ============================================================

-- ---------- what the zone needs ----------
--  A year, not a date of birth. Maffetone only needs the age, and
--  storing less is the right default.
alter table public.profiles add column if not exists birth_year integer;

-- ---------- the zone ----------
--  180 minus age. Five beats either side, ten in the heat — the app
--  doesn't know the weather, so it gives the band and says the rest.
--
--  Returns nothing rather than guessing when there's no birth year:
--  a made-up heart rate ceiling is worse than none.
drop function if exists public.my_aerobic_zone(uuid) cascade;

create function public.my_aerobic_zone(p_user uuid)
returns table (age integer, centre integer, low integer, high integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (extract(year from current_date)::integer - p.birth_year)          as age,
    (180 - (extract(year from current_date)::integer - p.birth_year))  as centre,
    (175 - (extract(year from current_date)::integer - p.birth_year))  as low,
    (185 - (extract(year from current_date)::integer - p.birth_year))  as high
  from public.profiles p
  where p.id = p_user and p.birth_year is not null;
$$;

grant execute on function public.my_aerobic_zone(uuid) to authenticated;

-- ---------- how a run session is shaped ----------
alter table public.sessions add column if not exists run_kind text;
--   easy       time in zone 2
--   intervals  six-minute blocks
--   speed      a rep ladder
--   long       the weekend one

alter table public.sessions add column if not exists run_minutes integer;
alter table public.sessions add column if not exists run_blocks integer;
alter table public.sessions add column if not exists run_ladder text;

-- ============================================================
--  THE PROGRESSION
--
--  Easy      20 min in week one, plus five a week. Past 40 the
--            instruction changes: hold the heart rate and let the
--            pace come up on its own.
--
--  Intervals 24 min in week one, plus six a week to 48. Then 60,
--            run as six ten-minute blocks instead of four sixes.
--
--  Speed     A five-session ladder that rotates. Reps get longer
--            and fewer, so the body meets a different demand each
--            week rather than the same one louder.
-- ============================================================

drop function if exists public.easy_minutes(integer) cascade;
create function public.easy_minutes(p_week integer)
returns integer language sql immutable as $$
  select least(20 + (p_week - 1) * 5, 60);
$$;

drop function if exists public.interval_minutes(integer) cascade;
create function public.interval_minutes(p_week integer)
returns integer language sql immutable as $$
  select case when p_week >= 6 then 60
              else least(24 + (p_week - 1) * 6, 48) end;
$$;

drop function if exists public.speed_ladder(integer) cascade;
create function public.speed_ladder(p_week integer)
returns text language sql immutable as $$
  select (array[
    '10 × 200m',
    '6 × 300m, 4 × 200m',
    '5 × 400m, 3 × 300m, 2 × 200m',
    '3 × 500m, 3 × 400m, 2 × 300m, 1 × 200m',
    '2 × 800m, 4 × 400m, 2 × 200m'
  ])[((p_week - 1) % 5) + 1];
$$;

-- ---------- write it into the block ----------
--  Tuesday is intervals, Friday is easy, Saturday keeps the long
--  run, and a second easy run goes on Thursday evening where the
--  double already sits.
do $$
declare
  w record;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    -- Tuesday morning: intervals
    update public.sessions
       set run_kind    = 'intervals',
           run_minutes = public.interval_minutes(w.idx),
           run_blocks  = case when w.idx >= 6 then 6 else
                           public.interval_minutes(w.idx) / 6 end,
           est_min     = public.interval_minutes(w.idx) + 16,
           focus       = 'Running',
           body        = 'Six minutes of warm-up, stepping up to race pace. '
                      || 'Then ' || (case when w.idx >= 6 then 6 else
                           public.interval_minutes(w.idx) / 6 end)
                      || ' blocks. The point is learning what recovery pace '
                      || 'feels like next to race pace, not the total.'
     where week_id = w.id and day = 2 and coalesce(slot, 1) = 1;

    -- Friday: easy
    update public.sessions
       set run_kind    = 'easy',
           run_minutes = public.easy_minutes(w.idx),
           est_min     = public.easy_minutes(w.idx) + 15,
           focus       = 'Zone 2',
           body        = 'Time in zone, not pace. If the heart rate climbs '
                      || 'above the band, slow down or walk until it comes '
                      || 'back — that is the session working, not failing.'
     where week_id = w.id and day = 5;

    -- Thursday evening: the second easy run
    update public.sessions
       set run_kind    = 'easy',
           run_minutes = greatest(public.easy_minutes(w.idx) - 10, 20),
           focus       = 'Zone 2'
     where week_id = w.id and day = 4 and coalesce(slot, 1) = 2;

    -- Monday evening becomes the speed session, which the block was
    -- missing entirely — it had two easy runs and no strides.
    update public.sessions
       set run_kind    = 'speed',
           run_ladder  = public.speed_ladder(w.idx),
           est_min     = 40,
           title       = 'Speed',
           tag         = 'PM',
           focus       = 'Running fast',
           body        = public.speed_ladder(w.idx)
                      || '. Above race pace, 60 seconds walking or jogging '
                      || 'between. Every rep should feel the same — if the '
                      || 'last one is slower than the first, the recovery '
                      || 'was too short.'
     where week_id = w.id and day = 1 and coalesce(slot, 1) = 2;

    -- Saturday stays long, but with a target
    update public.sessions
       set run_kind    = 'long',
           run_minutes = least(60 + (w.idx - 1) * 10, 120),
           focus       = 'Aerobic base'
     where week_id = w.id and day = 6 and kind = 'run';
  end loop;
end $$;

-- ---------- what this week's running asks of me ----------
drop view if exists public.my_running_week cascade;

create view public.my_running_week
with (security_invoker = on) as
select
  s.id,
  s.day,
  coalesce(s.slot, 1)                       as slot,
  s.title,
  s.run_kind,
  s.run_minutes,
  s.run_blocks,
  s.run_ladder,
  w.idx                                     as week_idx,
  z.centre                                  as hr_centre,
  z.low                                     as hr_low,
  z.high                                    as hr_high
from public.sessions s
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
join public.profiles p    on p.id = auth.uid()
left join lateral public.my_aerobic_zone(auth.uid()) z on true
where pr.id = p.programme_id
  and w.idx = coalesce(p.week_idx, 1)
  and s.run_kind is not null
order by s.day, coalesce(s.slot, 1);

grant select on public.my_running_week to authenticated;
