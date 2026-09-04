-- ============================================================
--  SALUS TRAIN — coaches can see the training
--
--  Members' logs are private by default, which is right. A coach
--  needs to see them to coach. These policies are additive: they
--  don't loosen anything for members, they only let an admin read.
--
--  Nobody can edit a member's logs, including admins. If Katy
--  thinks a number is wrong she asks; she doesn't overwrite it.
--
--  Run after 06_layout.sql. Safe to re-run.
-- ============================================================

-- ---------- benchmarks ----------
drop policy if exists "admin reads benchmarks" on benchmarks;
create policy "admin reads benchmarks" on benchmarks
  for select to authenticated using (public.is_admin());

-- ---------- workouts ----------
drop policy if exists "admin reads workout_logs" on workout_logs;
create policy "admin reads workout_logs" on workout_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "admin reads set_logs" on set_logs;
create policy "admin reads set_logs" on set_logs
  for select to authenticated using (public.is_admin());

-- ---------- the half ----------
drop policy if exists "admin reads half_sims" on half_sims;
create policy "admin reads half_sims" on half_sims
  for select to authenticated using (public.is_admin());

drop policy if exists "admin reads half_splits" on half_splits;
create policy "admin reads half_splits" on half_splits
  for select to authenticated using (public.is_admin());

-- ---------- messages ----------
-- A coach sees the threads addressed to them, not everyone's.
drop policy if exists "coach reads own threads" on messages;
create policy "coach reads own threads" on messages
  for select to authenticated using (
    exists (select 1 from public.coaches c
            where c.id = messages.coach_id and c.user_id = auth.uid()));

drop policy if exists "coach replies" on messages;
create policy "coach replies" on messages
  for insert to authenticated with check (
    from_member = false
    and exists (select 1 from public.coaches c
                where c.id = messages.coach_id and c.user_id = auth.uid()));

-- ============================================================
--  Cohort views — the numbers worth looking at
-- ============================================================

-- Every member with their headline training numbers in one row.
drop view if exists public.member_overview cascade;

create view member_overview
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.race_date,
  p.race_division,
  p.role,
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

-- Where the cohort is weakest, station by station. This is the one
-- that changes what you programme: if sled pull is everyone's worst
-- station, that's a Tuesday problem, not eight individual problems.
drop view if exists public.station_averages cascade;

create view station_averages
with (security_invoker = on) as
select
  s.leg_key,
  count(*)                      as entries,
  round(avg(s.seconds))::int    as avg_s,
  min(s.seconds)                as best_s,
  max(s.seconds)                as worst_s
from half_splits s
join half_sims h on h.id = s.half_sim_id
where s.leg_key not like 'r%'
group by s.leg_key;

grant select on station_averages to authenticated;
