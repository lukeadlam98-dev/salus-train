-- ============================================================
--  SALUS TRAIN — which week a member is on
--
--  The app was asking for week 1 and would have kept asking for
--  week 1 in November. Nobody noticed because nobody has finished
--  a week yet.
--
--  A member's week is now a fact on their profile rather than
--  something inferred, so a coach can move someone forward, a
--  member joining late can start at week 3, and someone who takes
--  a fortnight off doesn't come back to a block that has run away
--  without them.
--
--  Run after 31_elite_block.sql. Safe to re-run.
-- ============================================================

alter table public.profiles
  add column if not exists week_idx integer default 1;

alter table public.profiles
  add column if not exists week_started date;

update public.profiles set week_idx = 1 where week_idx is null;

-- ---------- move a member on ----------
drop function if exists public.set_my_week(integer) cascade;

create function public.set_my_week(p_idx integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_max integer;
begin
  select pr.weeks into v_max
    from public.profiles p
    join public.programmes pr on pr.id = p.programme_id
   where p.id = auth.uid();

  p_idx := greatest(1, least(p_idx, coalesce(v_max, 8)));

  update public.profiles
     set week_idx = p_idx, week_started = current_date
   where id = auth.uid();

  return p_idx;
end;
$$;

grant execute on function public.set_my_week(integer) to authenticated;

-- ---------- a coach moving someone ----------
drop function if exists public.set_member_week(uuid, integer) cascade;

create function public.set_member_week(p_user uuid, p_idx integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_max integer;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select pr.weeks into v_max
    from public.profiles p
    join public.programmes pr on pr.id = p.programme_id
   where p.id = p_user;

  p_idx := greatest(1, least(p_idx, coalesce(v_max, 8)));

  update public.profiles
     set week_idx = p_idx, week_started = current_date
   where id = p_user;

  return p_idx;
end;
$$;

grant execute on function public.set_member_week(uuid, integer) to authenticated;

-- ---------- put Luke on week 2 ----------
update public.profiles
   set week_idx = 2, week_started = current_date
 where id in (select id from auth.users
              where email in ('luke@salus.house', 'luke.adlam98@gmail.com'));
