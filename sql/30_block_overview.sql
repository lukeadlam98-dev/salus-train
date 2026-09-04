-- ============================================================
--  SALUS TRAIN — the whole block, at a glance
--
--  A member can see this week and nothing else. Eight weeks is
--  the thing they signed up to, and not being able to see the
--  shape of it is why a plan feels like a series of unrelated
--  Mondays.
--
--  Run after 29_block_formats.sql. Safe to re-run.
-- ============================================================

alter table public.weeks add column if not exists phase text;
alter table public.weeks add column if not exists note text;

-- A sensible default phase, where a coach hasn't set one. Eight weeks
-- divides as three building, three loading, one peak, one taper —
-- which is roughly what everyone does anyway.
update public.weeks w
   set phase = case
     when w.idx <= 3 then 'Foundation'
     when w.idx <= 6 then 'Build'
     when w.idx = 7  then 'Peak'
     else                 'Taper'
   end
 where w.phase is null;

-- ---------- every week, with what's in it and what I've done ----------
drop view if exists public.my_block cascade;

create view public.my_block
with (security_invoker = on) as
select
  w.id,
  w.idx,
  w.phase,
  w.note,
  w.published,
  pr.id                                     as programme_id,
  pr.name                                   as programme,
  pr.weeks                                  as total_weeks,

  count(s.id) filter (where s.kind <> 'rest')                as sessions,
  count(s.id) filter (where s.is_test)                       as tests,

  count(distinct l.session_id) filter (where l.ended_at is not null
                                         and l.user_id = auth.uid())
                                                             as done,

  -- Minutes actually spent, not minutes prescribed.
  coalesce(sum(l.elapsed_s) filter (where l.user_id = auth.uid()), 0) / 60
                                                             as minutes,

  -- The kinds of session in the week, so the overview can say
  -- "two strength, two runs" rather than just a number.
  array_agg(distinct s.kind) filter (where s.kind is not null
                                       and s.kind <> 'rest') as kinds

from public.weeks w
join public.programmes pr        on pr.id = w.programme_id
left join public.sessions s      on s.week_id = w.id
left join public.workout_logs l  on l.session_id = s.id
where pr.id = (select p.programme_id from public.profiles p
               where p.id = auth.uid())
group by w.id, w.idx, w.phase, w.note, w.published,
         pr.id, pr.name, pr.weeks
order by w.idx;

grant select on public.my_block to authenticated;

-- ---------- the sessions in one week ----------
drop function if exists public.week_sessions(uuid) cascade;

create function public.week_sessions(p_week uuid)
returns table (
  id        uuid,
  day       integer,
  slot      integer,
  title     text,
  kind      text,
  is_test   boolean,
  est_min   integer,
  focus     text,
  done      boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, s.day, coalesce(s.slot, 1)::integer, s.title::text, s.kind::text,
    s.is_test, s.est_min,
    s.focus::text,
    exists (select 1 from public.workout_logs l
            where l.session_id = s.id and l.user_id = auth.uid()
              and l.ended_at is not null)
  from public.sessions s
  where s.week_id = p_week
  order by s.day, coalesce(s.slot, 1);
$$;

grant execute on function public.week_sessions(uuid) to authenticated;
