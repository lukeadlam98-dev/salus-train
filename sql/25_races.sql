-- ============================================================
--  SALUS TRAIN — more than one race
--
--  profiles.race_date held a single date, which stops working
--  the moment someone books London in December and Manchester
--  in March. This gives a member a list.
--
--  It also gives them somewhere to record what they actually
--  ran — which matters more than it looks. A predicted finish
--  next to a real one is the only way the model gets better,
--  and right now the only validation this app has is one
--  member's race.
--
--  Run after 24_navigation.sql. Safe to re-run.
-- ============================================================

create table if not exists public.races (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  race_date   date not null,
  location    text,
  division    text,                    -- Open, Pro, Doubles, Relay
  wave        text,
  is_target   boolean default false,   -- the one the countdown points at

  -- filled in afterwards
  result_s      integer,
  result_place  integer,
  result_field  integer,
  result_ag     integer,               -- age group placing
  predicted_s   integer,               -- what we said, kept for comparison
  note          text,

  created_at  timestamptz default now()
);

create index if not exists races_user_date on public.races (user_id, race_date);

alter table public.races enable row level security;

drop policy if exists "own races read"   on public.races;
drop policy if exists "own races write"  on public.races;
drop policy if exists "own races update" on public.races;
drop policy if exists "own races delete" on public.races;

create policy "own races read" on public.races
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own races write" on public.races
  for insert with check (auth.uid() = user_id);
create policy "own races update" on public.races
  for update using (auth.uid() = user_id);
create policy "own races delete" on public.races
  for delete using (auth.uid() = user_id);

-- ---------- only one target at a time ----------
drop function if exists public.set_target_race(uuid) cascade;

create function public.set_target_race(p_race uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid;
begin
  select user_id into v_user from public.races where id = p_race;
  if v_user is distinct from auth.uid() then
    raise exception 'not yours';
  end if;

  update public.races set is_target = false where user_id = v_user;
  update public.races set is_target = true  where id = p_race;

  -- profiles.race_date stays in step, so everything that already
  -- reads it keeps working rather than needing rewriting at once.
  update public.profiles
     set race_date = (select race_date from public.races where id = p_race)
   where id = v_user;
end;
$$;

grant execute on function public.set_target_race(uuid) to authenticated;

-- ---------- the one the countdown points at ----------
-- The explicit target if there is one; otherwise the next race that
-- hasn't happened. A member who books one race shouldn't have to
-- also tell us it's the one they mean.
drop view if exists public.my_races cascade;

create view public.my_races
with (security_invoker = on) as
select
  r.*,
  (r.race_date < current_date)                          as done,
  (r.race_date - current_date)                          as days_away,
  (r.is_target or (
     not exists (select 1 from public.races t
                 where t.user_id = r.user_id and t.is_target)
     and r.race_date >= current_date
     and r.race_date = (select min(x.race_date) from public.races x
                        where x.user_id = r.user_id
                          and x.race_date >= current_date)
  ))                                                    as is_next
from public.races r
where r.user_id = auth.uid()
order by r.race_date;

grant select on public.my_races to authenticated;

-- ---------- how good the prediction was ----------
-- Across everyone who has raced and had a projection. The only honest
-- read on whether the model works.
drop view if exists public.prediction_accuracy cascade;

create view public.prediction_accuracy
with (security_invoker = on) as
select
  r.id,
  p.name,
  r.name          as race,
  r.race_date,
  r.predicted_s,
  r.result_s,
  (r.result_s - r.predicted_s)                             as delta_s,
  round(((r.result_s - r.predicted_s)::numeric
         / nullif(r.predicted_s, 0)) * 100, 1)             as delta_pct
from public.races r
join public.profiles p on p.id = r.user_id
where r.result_s is not null
  and r.predicted_s is not null;

grant select on public.prediction_accuracy to authenticated;

-- ---------- carry across whatever is already set ----------
insert into public.races (user_id, name, race_date, location, division, is_target)
select
  p.id,
  coalesce(pr.race_name, 'My race'),
  p.race_date,
  pr.race_location,
  p.race_division,
  true
from public.profiles p
left join public.programmes pr on pr.id = p.programme_id
where p.race_date is not null
  and not exists (select 1 from public.races r where r.user_id = p.id);
