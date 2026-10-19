-- ============================================================
--  SALUS TRAIN — 1:1 clients
--
--  A private programme written for one person. Rakhee's three
--  days a week are not a block the club runs; they are hers, and
--  nobody else should see them in the picker, on a leaderboard,
--  or in the member count of anything.
--
--  Privacy by construction rather than by a flag somebody has to
--  remember to set: a programme with a client_id is private, and
--  every query that lists programmes already has to decide what
--  to do with it.
--
--  Run after 53_push.sql. Safe to re-run.
-- ============================================================

alter table public.programmes
  add column if not exists client_id uuid references auth.users on delete set null;

create index if not exists programmes_client on public.programmes (client_id)
  where client_id is not null;

-- ---------- what a member is allowed to see ----------
--  The club's blocks, plus their own 1:1 if they have one. Somebody
--  else's 1:1 is invisible, which is the whole point.
drop view if exists public.visible_programmes cascade;

create view public.visible_programmes
with (security_invoker = on) as
select pr.*
  from public.programmes pr
 where pr.archived = false
   and (pr.client_id is null or pr.client_id = auth.uid())
 order by
   -- A member's own 1:1 sits first. It's the thing they're actually
   -- doing; the club blocks are the alternatives.
   (pr.client_id = auth.uid()) desc nulls last,
   pr.sort;

grant select on public.visible_programmes to authenticated;

-- ---------- a 1:1 is never on a board ----------
--  The Salus Test ranks members against each other on the same
--  tests, which still applies. The WOD does not: a session written
--  for one person has no field to place in.
drop view if exists public.wotw_board cascade;

create view public.wotw_board
with (security_invoker = on) as
with the_one as (
  select s.id, s.title, coalesce(s.wotw_metric, 'time') as metric, s.est_min
    from public.sessions s
    join public.weeks w       on w.id = s.week_id
    join public.programmes pr on pr.id = w.programme_id
   where s.wotw and pr.client_id is null
   limit 1
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

-- ---------- create one ----------
--  Takes the member, makes the programme, builds the weeks, and puts
--  them on it. Four steps that have to happen together — a client
--  programme nobody is attached to is a programme that will be found
--  six months later and nobody will know whose it was.
drop function if exists public.create_client_programme(uuid, text, integer) cascade;

create function public.create_client_programme(
  p_client uuid,
  p_name   text default null,
  p_weeks  integer default 4
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_name text;
  v_slug text;
  i      integer;
begin
  -- auth.uid() is null when this is called from the SQL editor or with
  -- the service role — direct database access, which is strictly more
  -- privileged than an admin, not less. Gating on is_admin() alone
  -- meant the seed script couldn't create the programme it needed.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  select coalesce(p_name, p.name || ' — 1:1') into v_name
    from public.profiles p where p.id = p_client;

  if v_name is null then
    raise exception 'no such member';
  end if;

  -- A slug nobody has to think about, unique even if the same member
  -- gets a second programme later.
  v_slug := 'c-' || replace(p_client::text, '-', '') || '-'
            || to_char(now(), 'YYYYMMDDHH24MISS');

  insert into public.programmes
    (slug, name, weeks, blurb, live, archived, client_id, sort)
  values
    (v_slug, v_name, p_weeks,
     'Written for you. Nobody else can see this.',
     true, false, p_client,
     coalesce((select max(sort) from public.programmes), 0) + 1)
  returning id into v_id;

  for i in 1..p_weeks loop
    insert into public.weeks (programme_id, idx, phase, published)
    values (v_id, i, 'Week ' || i, true);
  end loop;

  -- Straight onto it. A 1:1 client isn't choosing between blocks.
  update public.profiles
     set programme_id = v_id, week_idx = 1, week_started = current_date
   where id = p_client;

  return v_id;
end;
$$;

grant execute on function public.create_client_programme(uuid, text, integer)
  to authenticated;

-- ---------- who's on one ----------
drop view if exists public.client_programmes cascade;

create view public.client_programmes
with (security_invoker = on) as
select
  pr.id,
  pr.name,
  pr.weeks,
  pr.archived,
  pr.client_id,
  p.name                                   as client_name,
  p.photo_url                              as client_photo,
  coalesce(p.week_idx, 1)                  as week_idx,

  (select count(*) from public.sessions s
    join public.weeks w on w.id = s.week_id
   where w.programme_id = pr.id and s.kind <> 'rest')     as sessions,

  (select count(distinct l.session_id)
     from public.workout_logs l
     join public.sessions s on s.id = l.session_id
     join public.weeks w    on w.id = s.week_id
    where w.programme_id = pr.id
      and l.user_id = pr.client_id
      and l.ended_at is not null)                         as done,

  (select max(l.ended_at) from public.workout_logs l
    where l.user_id = pr.client_id and l.ended_at is not null)
                                                          as last_trained
from public.programmes pr
join public.profiles p on p.id = pr.client_id
where pr.client_id is not null
  and public.is_admin()
order by p.name;

grant select on public.client_programmes to authenticated;
