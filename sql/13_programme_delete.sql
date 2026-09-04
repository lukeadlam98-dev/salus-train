-- ============================================================
--  SALUS TRAIN — archiving and deleting a programme
--
--  Deleting cascades: weeks, sessions, blocks, every prescription
--  line and coach's note goes with it, and anyone following it is
--  left with nothing to open.
--
--  So there are two operations, and archive is the one you almost
--  always want. Delete is for a programme created by mistake.
--
--  Run after 12_dashboard.sql. Safe to re-run.
-- ============================================================

alter table programmes add column if not exists archived boolean default false;

-- Members only ever see live, unarchived programmes.
drop policy if exists "read programmes" on programmes;
create policy "read programmes" on programmes
  for select to authenticated
  using (archived = false or public.is_admin());

-- ---------- what would be lost ----------
-- Called before deleting, so the warning is specific rather than
-- generic. "This will delete 8 weeks and 47 sessions" is a different
-- sentence from "are you sure?".
drop function if exists public.programme_contents(uuid) cascade;

create function public.programme_contents(p_id uuid)
returns table (
  weeks    bigint,
  sessions bigint,
  blocks   bigint,
  members  bigint,
  logs     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.weeks w where w.programme_id = p_id)::bigint,
    (select count(*) from public.sessions s
       join public.weeks w on w.id = s.week_id
       where w.programme_id = p_id)::bigint,
    (select count(*) from public.blocks b
       join public.sessions s on s.id = b.session_id
       join public.weeks w on w.id = s.week_id
       where w.programme_id = p_id)::bigint,
    (select count(*) from public.profiles p
       where p.programme_id = p_id)::bigint,
    (select count(*) from public.workout_logs l
       join public.sessions s on s.id = l.session_id
       join public.weeks w on w.id = s.week_id
       where w.programme_id = p_id)::bigint;
$$;

grant execute on function public.programme_contents(uuid) to authenticated;

-- ---------- deleting, with the obvious mistake blocked ----------
drop function if exists public.delete_programme(uuid, uuid) cascade;

create function public.delete_programme(
  p_id      uuid,
  p_move_to uuid default null   -- where to send anyone following it
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_members bigint;
  v_logs    bigint;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;

  select count(*) into v_members
    from public.profiles where programme_id = p_id;

  -- Members must go somewhere. Orphaning them means they open the app
  -- to an empty screen with no explanation.
  if v_members > 0 and p_move_to is null then
    raise exception '% member(s) are on this programme. Move them first.', v_members;
  end if;

  if p_move_to is not null then
    update public.profiles set programme_id = p_move_to where programme_id = p_id;
  end if;

  -- Logged training is a member's record of what they actually did.
  -- It shouldn't disappear because a coach tidied up a programme.
  select count(*) into v_logs
    from public.workout_logs l
    join public.sessions s on s.id = l.session_id
    join public.weeks w on w.id = s.week_id
    where w.programme_id = p_id;

  if v_logs > 0 then
    raise exception
      '% logged session(s) belong to this programme. Archive it instead.', v_logs;
  end if;

  delete from public.programmes where id = p_id;
end;
$$;

grant execute on function public.delete_programme(uuid, uuid) to authenticated;
