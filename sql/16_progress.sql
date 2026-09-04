-- ============================================================
--  SALUS TRAIN — progress
--
--  The app logs sets but never shows anyone they're getting
--  stronger, which is most of the reason to log at all.
--
--  Estimated 1RM uses Epley: weight × (1 + reps/30). It's a
--  formula, not a measurement — reasonable to about six reps
--  and increasingly optimistic beyond that. Shown as "e1RM"
--  rather than "1RM" for that reason.
--
--  Run after 15_rearrange.sql. Safe to re-run.
-- ============================================================

-- ---------- what a member has done, per movement ----------
drop view if exists public.movement_history cascade;

create view public.movement_history
with (security_invoker = on) as
select
  w.user_id,
  m.id                as movement_id,
  m.name              as movement,
  w.started_at::date  as on_date,
  max(sl.kg)                                          as top_kg,
  max(sl.kg * (1 + sl.reps / 30.0))                   as e1rm,
  sum(sl.reps * sl.kg)                                as volume,
  count(*)                                            as sets
from public.set_logs sl
join public.workout_logs w   on w.id = sl.workout_log_id
join public.block_items bi   on bi.id = sl.block_item_id
join public.movements m      on m.id = bi.movement_id
where sl.done = true and sl.kg > 0 and sl.reps > 0
group by w.user_id, m.id, m.name, w.started_at::date;

grant select on public.movement_history to authenticated;

-- ---------- the summary at the top ----------
drop function if exists public.my_activity(uuid, date) cascade;

create function public.my_activity(p_user uuid, p_since date default null)
returns table (
  sessions   bigint,
  minutes    bigint,
  volume     numeric,
  sets       bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.workout_logs w
       where w.user_id = p_user and w.ended_at is not null
         and (p_since is null or w.started_at::date >= p_since))::bigint,
    (select coalesce(sum(w.elapsed_s), 0) / 60 from public.workout_logs w
       where w.user_id = p_user and w.ended_at is not null
         and (p_since is null or w.started_at::date >= p_since))::bigint,
    (select coalesce(sum(sl.reps * sl.kg), 0) from public.set_logs sl
       join public.workout_logs w on w.id = sl.workout_log_id
       where w.user_id = p_user and sl.done = true
         and (p_since is null or w.started_at::date >= p_since))::numeric,
    (select count(*) from public.set_logs sl
       join public.workout_logs w on w.id = sl.workout_log_id
       where w.user_id = p_user and sl.done = true
         and (p_since is null or w.started_at::date >= p_since))::bigint;
$$;

grant execute on function public.my_activity(uuid, date) to authenticated;

-- ---------- every movement, with its best and its trend ----------
drop function if exists public.my_movements(uuid) cascade;

create function public.my_movements(p_user uuid)
returns table (
  movement    text,
  best_e1rm   numeric,
  best_kg     numeric,
  last_date   date,
  points      numeric[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.movement::text,
    max(h.e1rm)::numeric   as best_e1rm,
    max(h.top_kg)::numeric as best_kg,
    max(h.on_date)::date   as last_date,
    array_agg(h.e1rm order by h.on_date)::numeric[] as points
  from public.movement_history h
  where h.user_id = p_user
  group by h.movement
  order by max(h.on_date) desc;
$$;

grant execute on function public.my_movements(uuid) to authenticated;
