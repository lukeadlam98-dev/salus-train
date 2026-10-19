-- ============================================================
--  SALUS TRAIN — name the sessions and blocks after the training
--
--  "Full Body A" and "Full Body B" are only distinguishable if you
--  already know what's in them, which the person standing in the gym
--  doesn't. Same for a block called "A": the letter is what you call
--  out mid-set, not what tells you what's coming.
--
--  The letters stay on the blocks — they're what makes the app pair
--  A1 with A2, and they're what you say out loud. It's the labels
--  that change, so the screen reads "Legs & pull" with A1/A2 inside
--  it rather than "A" with A1/A2 inside it.
--
--  Run after 58_full_body_week.sql. Safe to re-run.
-- ============================================================

set lock_timeout = '5s';

drop function if exists public.name_full_body_week(uuid) cascade;

create function public.name_full_body_week(p_programme uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r       record;
  v_sess  uuid;
  n       integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  -- ---------- the sessions ----------
  for r in
    select * from (values
      (1, 'Legs & Pull',   'Press, pull and glutes'),
      (3, 'Squat & Press', 'Squat, shoulders and legs'),
      (5, 'Hinge & Arms',  'Hinge, row and arms')
    ) as t(day, title, focus)
  loop
    update public.sessions s
       set title = r.title, focus = r.focus
      from public.weeks w
     where w.id = s.week_id
       and w.programme_id = p_programme
       and s.day = r.day
       and s.kind <> 'rest';
    n := n + 1;
  end loop;

  -- ---------- the blocks ----------
  --  Named for what they do, per day. The letter is untouched.
  for r in
    select * from (values
      (1, 'A', 'Legs & pull'),
      (1, 'B', 'Push & pull'),
      (1, 'C', 'Glutes & single leg'),
      (1, 'D', 'Bike intervals'),
      (3, 'A', 'Squat & press'),
      (3, 'B', 'Shoulders & lats'),
      (3, 'C', 'Quads & hamstrings'),
      (3, 'D', 'Ski intervals'),
      (5, 'A', 'Squat & hinge'),
      (5, 'B', 'Push & row'),
      (5, 'C', 'Arms'),
      (5, 'D', 'Sled intervals')
    ) as t(day, letter, label)
  loop
    update public.blocks b
       set label = r.label
      from public.sessions s
      join public.weeks w on w.id = s.week_id
     where b.session_id = s.id
       and w.programme_id = p_programme
       and s.day = r.day
       and b.letter = r.letter;
  end loop;

  return n;
end;
$$;

grant execute on function public.name_full_body_week(uuid) to authenticated;

-- ---------- apply it to every Full Body programme ----------
do $$
declare
  p record;
begin
  for p in
    select id, name from public.programmes
     where client_id is not null and archived = false
  loop
    perform public.name_full_body_week(p.id);
  end loop;
  raise notice 'Sessions and blocks renamed.';
end $$;
