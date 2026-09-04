-- ============================================================
--  SALUS TRAIN — the community feed
--
--  A solo member at six in the morning is training alone. The
--  one thing an app can give them that a printed plan can't is
--  the knowledge that eleven other people did the same session
--  this week.
--
--  Opt-in throughout, on the same flag as the leaderboard. A
--  member who hasn't shared appears nowhere, and nothing here
--  exposes a weight, a time or a score — only that somebody
--  trained.
--
--  Run after 17_session_video.sql. Safe to re-run.
-- ============================================================

drop view if exists public.community_feed cascade;

create view public.community_feed
with (security_invoker = on) as
select
  w.id,
  p.name,
  p.id            as user_id,
  s.title         as session_title,
  s.kind,
  wk.idx          as week_idx,
  pr.name         as programme,
  w.ended_at,
  w.effort
from public.workout_logs w
join public.profiles p        on p.id = w.user_id
left join public.sessions s   on s.id = w.session_id
left join public.weeks wk     on wk.id = s.week_id
left join public.programmes pr on pr.id = wk.programme_id
where w.ended_at is not null
  and p.share_on_leaderboard = true
  and p.name is not null
  and w.ended_at > now() - interval '14 days'
order by w.ended_at desc;

grant select on public.community_feed to authenticated;

-- ---------- who's on the same session as you ----------
drop function if exists public.session_company(uuid) cascade;

create function public.session_company(p_session uuid)
returns table (name text, ended_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name::text, max(w.ended_at)::timestamptz
  from public.workout_logs w
  join public.profiles p on p.id = w.user_id
  where w.session_id = p_session
    and w.ended_at is not null
    and p.share_on_leaderboard = true
    and p.name is not null
  group by p.name
  order by max(w.ended_at) desc
  limit 12;
$$;

grant execute on function public.session_company(uuid) to authenticated;

-- ---------- how the club is doing this week ----------
drop function if exists public.club_week() cascade;

create function public.club_week()
returns table (
  sessions  bigint,
  people    bigint,
  minutes   bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint,
    count(distinct w.user_id)::bigint,
    (coalesce(sum(w.elapsed_s), 0) / 60)::bigint
  from public.workout_logs w
  where w.ended_at is not null
    and w.ended_at > date_trunc('week', now());
$$;

grant execute on function public.club_week() to authenticated;
