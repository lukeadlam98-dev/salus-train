-- ============================================================
--  SALUS TRAIN — what a coach needs to know this morning
--
--  The back office could tell you what the programme says. It
--  couldn't tell you who is actually doing it, which is the only
--  question a coach has before opening the doors.
--
--  Three things, in the order they matter: who trained today,
--  who has gone quiet, and who never finished testing. The last
--  one is the quiet killer — an untested member is training on
--  default weights and nobody finds out until week six.
--
--  Run after 33_one_programme.sql. Safe to re-run.
-- ============================================================

drop view if exists public.coach_floor cascade;

create view public.coach_floor
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.programme_id,
  pr.name                                      as programme,
  coalesce(p.week_idx, 1)                      as week_idx,
  pr.weeks                                     as total_weeks,
  p.share_on_leaderboard,

  -- what they have done in the week they are on
  (select count(distinct l.session_id)
     from public.workout_logs l
     join public.sessions s on s.id = l.session_id
     join public.weeks w    on w.id = s.week_id
    where l.user_id = p.id and l.ended_at is not null
      and w.programme_id = p.programme_id
      and w.idx = coalesce(p.week_idx, 1))     as done_this_week,

  (select count(*)
     from public.sessions s
     join public.weeks w on w.id = s.week_id
    where w.programme_id = p.programme_id
      and w.idx = coalesce(p.week_idx, 1)
      and s.kind <> 'rest')                    as sessions_this_week,

  -- when they were last in
  (select max(l.ended_at) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)
                                               as last_trained,

  (select count(*) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null
      and l.ended_at::date = current_date)     as sessions_today,

  -- testing
  (select count(*) from public.benchmarks b
    where b.user_id = p.id and b.week = 1)     as tests_done,

  (select count(*) from public.half_sims h
    where h.user_id = p.id and h.total_s is not null)
                                               as halves_done,

  -- how long since they were in, in days
  (select current_date - max(l.ended_at)::date
     from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)
                                               as days_since

from public.profiles p
left join public.programmes pr on pr.id = p.programme_id
where public.is_admin()
  and p.role is distinct from 'admin'
  and p.name is not null;

grant select on public.coach_floor to authenticated;

-- ---------- the club, today ----------
drop function if exists public.floor_today() cascade;

create function public.floor_today()
returns table (
  trained_today   bigint,
  members         bigint,
  sessions_today  bigint,
  minutes_today   bigint,
  behind          bigint,
  untested        bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct l.user_id) from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select count(*) from public.profiles p
      where p.role is distinct from 'admin' and p.name is not null)::bigint,
    (select count(*) from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select coalesce(sum(l.elapsed_s), 0) / 60 from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select count(*) from public.coach_floor f
      where f.days_since >= 5 or f.days_since is null)::bigint,
    (select count(*) from public.coach_floor f
      where f.tests_done < 5)::bigint;
$$;

grant execute on function public.floor_today() to authenticated;
