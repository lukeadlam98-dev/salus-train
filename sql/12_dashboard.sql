-- ============================================================
--  SALUS TRAIN — the dashboard
--
--  Two views. One for what the coaches should look at, one for
--  what needs doing about it.
--
--  Run after 11_score.sql. Safe to re-run.
-- ============================================================

-- ---------- what's been logged lately ----------
drop view if exists public.recent_activity cascade;

create view recent_activity
with (security_invoker = on) as
select
  w.id,
  w.user_id,
  p.name,
  s.title       as session_title,
  s.day,
  wk.idx        as week_idx,
  pr.name       as programme,
  w.started_at,
  w.ended_at,
  w.elapsed_s,
  w.effort
from workout_logs w
join profiles p    on p.id = w.user_id
left join sessions s on s.id = w.session_id
left join weeks wk   on wk.id = s.week_id
left join programmes pr on pr.id = wk.programme_id
order by w.started_at desc;

grant select on recent_activity to authenticated;

-- ---------- sessions that aren't finished being written ----------
-- A session with no blocks looks complete in the week grid but opens
-- to nothing on a member's phone. Worth knowing before they find out.
drop view if exists public.sessions_needing_work cascade;

create view sessions_needing_work
with (security_invoker = on) as
select
  s.id,
  s.title,
  s.day,
  s.kind,
  wk.idx          as week_idx,
  wk.published,
  pr.name         as programme,
  pr.id           as programme_id,
  (select count(*) from blocks b where b.session_id = s.id)        as blocks,
  (select count(*) from block_items bi
     join blocks b2 on b2.id = bi.block_id
     where b2.session_id = s.id)                                    as loggable,
  (s.cover_url is null)                                             as no_photo
from sessions s
join weeks wk on wk.id = s.week_id
join programmes pr on pr.id = wk.programme_id
where s.kind <> 'rest';

grant select on sessions_needing_work to authenticated;

-- ---------- the club view needs to know which programme a member is on ----------
-- Dropped first: Postgres can append a column to a view but not insert
-- one in the middle, and programme_id belongs next to the other profile
-- fields rather than tacked on the end.
drop view if exists public.member_overview cascade;

create view member_overview
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.race_date,
  p.race_division,
  p.role,
  p.programme_id,
  p.created_at,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'squat' and b.week = 1)  as squat_kg,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'bw' and b.week = 1)     as bodyweight_kg,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'fivek' and b.week = 1)  as fivek_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'ski' and b.week = 1)    as ski_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'row' and b.week = 1)    as row_s,
  (select count(*) from benchmarks b
     where b.user_id = p.id and b.week = 1)                      as tests_done,
  (select h.total_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as half_s,
  (select h.projected_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as projected_s,
  (select count(*) from workout_logs w
     where w.user_id = p.id and w.ended_at is not null)          as sessions_done,
  (select max(w.ended_at) from workout_logs w
     where w.user_id = p.id)                                     as last_trained
from profiles p;

grant select on member_overview to authenticated;
