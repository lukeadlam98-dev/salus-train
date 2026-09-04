-- ============================================================
--  SALUS TRAIN — ten badges
--
--  Badges are easy to do badly. A hundred of them for everything
--  is a participation trophy scheme, and members stop reading
--  them by week two.
--
--  So: ten, and each one marks something that was actually hard.
--  Nothing is awarded for opening the app, setting a profile
--  photo, or existing. Every one of these took a decision on a
--  cold morning.
--
--  Run after 47_targets.sql. Safe to re-run.
-- ============================================================

create table if not exists public.badges (
  key         text primary key,
  label       text not null,
  earned_for  text not null,     -- what a member reads
  why         text,              -- why it's worth having
  ord         integer not null
);

alter table public.badges enable row level security;
drop policy if exists "read badges" on public.badges;
create policy "read badges" on public.badges
  for select to authenticated using (true);

insert into public.badges (key, label, earned_for, why, ord) values
  ('first',       'First In',
   'Logged your first session',
   'Everything else starts here.', 1),

  ('tested',      'Measured',
   'Finished all nine tests',
   'Until these are in, every weight and pace in your block is a default. This is the one that makes the rest of it yours.', 2),

  ('full_week',   'Perfect Week',
   'Every session in a week, none missed',
   'Harder than it sounds. Most weeks something gets in the way.', 3),

  ('three_weeks', 'Three Up',
   'Three full weeks in a row',
   'The point where training stops being a decision you make each morning.', 4),

  ('block',       'Block Done',
   'Finished all eight weeks',
   'Most people who start an eight-week block do not finish it.', 5),

  ('half',        'Halfway House',
   'Ran the Salus Half',
   'Turns a projection into a real number. Also genuinely unpleasant.', 6),

  ('early',       'Before Six',
   'Ten sessions started before 7am',
   'Nobody accidentally trains at that time.', 7),

  ('pb',          'Moved the Needle',
   'Beat one of your own test numbers',
   'The whole reason for testing. Everything before this was setup.', 8),

  ('engine',      'Engine Room',
   'Ran 100km inside a block',
   'Eight kilometres of a HYROX is most of it, and this is what makes that part easy.', 9),

  ('raced',       'On the Day',
   'Recorded a real race result',
   'The block was for something. This is the something.', 10)
on conflict (key) do update
  set label = excluded.label, earned_for = excluded.earned_for,
      why = excluded.why, ord = excluded.ord;

-- ---------- what a member has ----------
create table if not exists public.member_badges (
  user_id   uuid references auth.users on delete cascade not null,
  key       text references public.badges on delete cascade not null,
  earned_at timestamptz default now(),
  note      text,                        -- '3 weeks', '112km'
  primary key (user_id, key)
);

alter table public.member_badges enable row level security;

drop policy if exists "read member_badges"  on public.member_badges;
drop policy if exists "own member_badges"   on public.member_badges;

-- Visible to everyone: a badge nobody else can see is a private note.
create policy "read member_badges" on public.member_badges
  for select to authenticated using (true);
create policy "own member_badges" on public.member_badges
  for insert to authenticated with check (auth.uid() = user_id);

-- ---------- work out what's been earned ----------
--  Recomputed rather than fired on events. An event that misfires
--  loses a badge silently and nobody finds out; a query that runs
--  again is self-correcting.
drop function if exists public.award_badges(uuid) cascade;

create function public.award_badges(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer := 0;
  v_prog uuid;
  v_km numeric;
  v_early integer;
  v_full integer;
  v_streak integer;
begin
  select p.programme_id into v_prog
    from public.profiles p where p.id = p_user;

  -- first session
  if exists (select 1 from public.workout_logs
              where user_id = p_user and ended_at is not null) then
    insert into public.member_badges (user_id, key)
    values (p_user, 'first') on conflict do nothing;
  end if;

  -- all nine tests
  if (select count(*) from public.benchmarks
       where user_id = p_user and week = 1
         and (value_num is not null or value_s is not null)) >= 8
     and exists (select 1 from public.half_sims
                  where user_id = p_user and total_s is not null) then
    insert into public.member_badges (user_id, key)
    values (p_user, 'tested') on conflict do nothing;
  end if;

  -- the half
  if exists (select 1 from public.half_sims
              where user_id = p_user and total_s is not null) then
    insert into public.member_badges (user_id, key)
    values (p_user, 'half') on conflict do nothing;
  end if;

  -- a race with a result
  if exists (select 1 from public.races
              where user_id = p_user and result_s is not null) then
    insert into public.member_badges (user_id, key)
    values (p_user, 'raced') on conflict do nothing;
  end if;

  -- before seven, ten times
  select count(*) into v_early
    from public.workout_logs l
   where l.user_id = p_user and l.ended_at is not null
     and extract(hour from l.started_at) < 7;
  if v_early >= 10 then
    insert into public.member_badges (user_id, key, note)
    values (p_user, 'early', v_early || ' sessions')
    on conflict (user_id, key) do update set note = excluded.note;
  end if;

  -- a hundred kilometres
  select coalesce(sum(distance_m), 0) / 1000.0 into v_km
    from public.run_logs where user_id = p_user;
  if v_km >= 100 then
    insert into public.member_badges (user_id, key, note)
    values (p_user, 'engine', round(v_km) || 'km')
    on conflict (user_id, key) do update set note = excluded.note;
  end if;

  -- full weeks, and consecutive ones
  with weeks_done as (
    select w.idx,
      count(*) filter (where s.kind <> 'rest')                     as due,
      count(distinct l.session_id) filter (where l.ended_at is not null) as did
    from public.weeks w
    join public.sessions s on s.week_id = w.id
    left join public.workout_logs l
      on l.session_id = s.id and l.user_id = p_user
    where w.programme_id = v_prog
    group by w.idx
  ),
  full_weeks as (
    select idx, (did >= due and due > 0) as complete from weeks_done
  ),
  runs as (
    select idx, complete,
      idx - row_number() over (order by idx) as grp
    from full_weeks where complete
  )
  select
    (select count(*) from full_weeks where complete),
    (select coalesce(max(n), 0) from (
       select count(*) as n from runs group by grp) x)
  into v_full, v_streak;

  if v_full >= 1 then
    insert into public.member_badges (user_id, key, note)
    values (p_user, 'full_week', v_full || ' weeks')
    on conflict (user_id, key) do update set note = excluded.note;
  end if;

  if v_streak >= 3 then
    insert into public.member_badges (user_id, key, note)
    values (p_user, 'three_weeks', v_streak || ' in a row')
    on conflict (user_id, key) do update set note = excluded.note;
  end if;

  if v_full >= 8 then
    insert into public.member_badges (user_id, key)
    values (p_user, 'block') on conflict do nothing;
  end if;

  -- beaten one of their own numbers
  if exists (
    select 1 from public.benchmarks a
    join public.benchmarks b
      on b.user_id = a.user_id and b.key = a.key and b.week > a.week
    where a.user_id = p_user and a.week = 1
      and ((a.value_num is not null and b.value_num > a.value_num)
        or (a.value_s   is not null and b.value_s   < a.value_s))
  ) then
    insert into public.member_badges (user_id, key)
    values (p_user, 'pb') on conflict do nothing;
  end if;

  select count(*) into v_new from public.member_badges where user_id = p_user;
  return v_new;
end;
$$;

grant execute on function public.award_badges(uuid) to authenticated;

-- ---------- what I have, and what's left ----------
drop view if exists public.my_badges cascade;

create view public.my_badges
with (security_invoker = on) as
select
  b.key, b.label, b.earned_for, b.why, b.ord,
  m.earned_at,
  m.note,
  (m.user_id is not null) as earned
from public.badges b
left join public.member_badges m
  on m.key = b.key and m.user_id = auth.uid()
order by b.ord;

grant select on public.my_badges to authenticated;
