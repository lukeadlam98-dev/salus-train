-- ============================================================
--  SALUS TRAIN — the running IS the block's running
--
--  40_running_plan wrote the progression onto the HYROX block's
--  sessions but left the seeded titles alone, so Tuesday said
--  "Threshold 800s" while the plan underneath said 30 minutes in
--  five blocks. Two descriptions of one session.
--
--  This makes them one thing: the title, the body and the
--  structure all come from the same rule, so changing the
--  progression changes what a member reads.
--
--  Wednesday is deliberately untouched. Compromised running is
--  the HYROX-specific session and it isn't part of a general
--  running plan — it's the thing the running plan exists to
--  support.
--
--  Run after 45_preferences.sql. Safe to re-run.
-- ============================================================

do $$
declare
  w record;
  v_int_min integer;
  v_blocks  integer;
  v_easy    integer;
  v_ladder  text;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    v_int_min := public.interval_minutes(w.idx);
    v_blocks  := case when w.idx >= 6 then 6 else v_int_min / 6 end;
    v_easy    := public.easy_minutes(w.idx);
    v_ladder  := public.speed_ladder(w.idx);

    -- ---------- Monday evening: speed ----------
    update public.sessions
       set title       = 'Speed',
           tag         = 'PM',
           kind        = 'run',
           run_kind    = 'speed',
           run_ladder  = v_ladder,
           est_min     = 40,
           focus       = 'Running fast',
           body        = v_ladder || ', above race pace. Sixty seconds '
                      || 'walking or jogging between. Every rep should feel '
                      || 'the same — if the last is slower than the first, '
                      || 'the recovery was too short.'
     where week_id = w.id and day = 1 and coalesce(slot, 1) = 2;

    -- ---------- Tuesday: intervals ----------
    update public.sessions
       set title       = 'Intervals',
           kind        = 'run',
           run_kind    = 'intervals',
           run_minutes = v_int_min,
           run_blocks  = v_blocks,
           est_min     = v_int_min + 16,
           focus       = 'Race pace',
           body        = v_int_min || ' minutes of work in ' || v_blocks
                      || case when w.idx >= 6
                              then ' ten-minute blocks — three easy, three '
                                || 'moderate, four at or above race pace.'
                              else ' six-minute blocks. Two minutes two '
                                || 'kilometres an hour under race pace, two '
                                || 'minutes one under, two minutes at it.'
                         end
                      || ' Six minutes of warm-up first, building to race '
                      || 'pace. The point is learning what recovery feels '
                      || 'like next to race pace, not the total.'
     where week_id = w.id and day = 2 and coalesce(slot, 1) = 1;

    -- ---------- Thursday evening: the second easy run ----------
    update public.sessions
       set title       = 'Easy',
           tag         = 'PM',
           kind        = 'run',
           run_kind    = 'easy',
           run_minutes = greatest(v_easy - 10, 20),
           est_min     = greatest(v_easy - 10, 20) + 5,
           focus       = 'Zone 2',
           body        = 'Conversational the whole way. If the heart rate '
                      || 'climbs above the band, slow down or walk until it '
                      || 'comes back.'
     where week_id = w.id and day = 4 and coalesce(slot, 1) = 2;

    -- ---------- Friday: the main easy run ----------
    update public.sessions
       set title       = 'Easy',
           kind        = 'run',
           run_kind    = 'easy',
           run_minutes = v_easy,
           est_min     = v_easy + 15,
           focus       = 'Zone 2',
           body        = v_easy || ' minutes in zone two, then core. Time '
                      || 'in zone is the whole session — pace is a '
                      || 'by-product.'
                      || case when v_easy >= 40
                              then ' You are past forty minutes now, so hold '
                                || 'the heart rate and let the pace come up '
                                || 'on its own.'
                              else '' end
     where week_id = w.id and day = 5;

    -- ---------- Saturday: the long one ----------
    --  Stays mixed on the HYROX block — a long run with stations in
    --  it is closer to the race than a pure long run, and the plan's
    --  long-run progression still governs the running part.
    update public.sessions
       set run_kind    = 'long',
           run_minutes = least(60 + (w.idx - 1) * 10, 120),
           focus       = 'Aerobic base'
     where week_id = w.id and day = 6 and kind = 'run';
  end loop;
end $$;

-- ---------- what this week's running looks like, in one line ----------
--  For the Train screen, so a member can see the shape of the week
--  without opening five sessions.
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
  z.high                                    as hr_high,
  case s.run_kind
    when 'easy'      then s.run_minutes || ' min in zone 2'
    when 'long'      then s.run_minutes || ' min, long'
    when 'intervals' then s.run_minutes || ' min · ' || s.run_blocks || ' blocks'
    when 'speed'     then s.run_ladder
  end                                       as summary
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
