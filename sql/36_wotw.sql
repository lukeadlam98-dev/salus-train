-- ============================================================
--  SALUS TRAIN — the board, cut back to two things
--
--  The leaderboard had every configured board on it, which meant
--  five tabs nobody read. Two boards, both of which people
--  actually care about:
--
--    Salus Test — placing across the five tests, ranks summed,
--    lowest wins. Standing, slow-moving, earned over a block.
--
--    WOD — one session, everybody's score on it, resets every
--    Monday. Fast, disposable, and the reason anyone opens the
--    tab twice in a week.
--
--  Run after 35_multiplier.sql. Safe to re-run.
-- ============================================================

-- ---------- which session is this week's ----------
alter table public.sessions add column if not exists wotw boolean default false;
alter table public.sessions add column if not exists wotw_metric text;
--   time     fastest wins — a for-time piece
--   rounds   most wins — an AMRAP
--   weight   heaviest wins — a lift

create index if not exists sessions_wotw on public.sessions (wotw)
  where wotw;

-- Only one at a time.
drop function if exists public.set_wotw(uuid) cascade;

create function public.set_wotw(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  update public.sessions set wotw = false where wotw;
  update public.sessions set wotw = true where id = p_session;
end;
$$;

grant execute on function public.set_wotw(uuid) to authenticated;

-- ---------- the board ----------
--  Opt-in like everything else: a member who hasn't shared doesn't
--  appear. Ranked by whichever metric the session is scored on.
drop view if exists public.wotw_board cascade;

create view public.wotw_board
with (security_invoker = on) as
with the_one as (
  select s.id, s.title, coalesce(s.wotw_metric, 'time') as metric, s.est_min
    from public.sessions s where s.wotw limit 1
),
entries as (
  select
    l.user_id,
    p.name,
    max(l.elapsed_s)                                      as seconds,
    max(coalesce((select sum(sl.reps) from public.set_logs sl
                   where sl.workout_log_id = l.id and sl.done), 0))
                                                          as reps,
    max(coalesce((select max(sl.kg) from public.set_logs sl
                   where sl.workout_log_id = l.id and sl.done), 0))
                                                          as kg,
    max(l.ended_at)                                       as done_at
  from public.workout_logs l
  join the_one t         on t.id = l.session_id
  join public.profiles p on p.id = l.user_id
  where l.ended_at is not null
    and p.share_on_leaderboard = true
    and p.name is not null
  group by l.user_id, p.name
)
select
  t.id            as session_id,
  t.title         as session_title,
  t.metric,
  e.user_id,
  e.name,
  e.seconds,
  e.reps,
  e.kg,
  e.done_at,
  (e.user_id = auth.uid())                                as mine,
  rank() over (
    order by case t.metric
      when 'rounds' then -e.reps
      when 'weight' then -e.kg
      else               e.seconds::numeric
    end
  )                                                       as place
from entries e
cross join the_one t
order by place;

grant select on public.wotw_board to authenticated;

-- ---------- pick one to start with ----------
--  Whatever this week's most-logged session is, if nothing is set.
update public.sessions
   set wotw = true, wotw_metric = 'time'
 where id = (
   select s.id from public.sessions s
    join public.weeks w on w.id = s.week_id
   where s.kind <> 'rest'
     and not exists (select 1 from public.sessions x where x.wotw)
   order by (select count(*) from public.workout_logs l
              where l.session_id = s.id) desc,
            w.idx, s.day
   limit 1
 );
