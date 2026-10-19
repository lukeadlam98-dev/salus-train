-- ============================================================
--  SALUS TRAIN — the Full Body week, onto an account by email
--
--  Three days, written A1/A2 rather than as a list. A superset is
--  one block with two or three movements in it, and the app pairs
--  the sets: A1 set one, A2 set one, A1 set two. Listing them as
--  separate blocks would be "finish all of A1 first", which is a
--  different session.
--
--  The D piece on each day is a conditioning finisher and runs
--  through the guided screen rather than the set grid — 20 seconds
--  on and 40 off is a clock, not something to log a weight against.
--
--  Idempotent: re-running updates the content rather than adding a
--  second copy.
--
--  Supersedes 55_rakhee.sql, which matched on name.
--  Run after 57_name_the_programme.sql.
-- ============================================================

-- ---------- the movements this needs ----------
insert into public.movements (name, default_rest_s, has_time) values
  ('Leg Press', 90, false),
  ('Lat Pulldown', 90, false),
  ('DB Incline Press', 90, false),
  ('Seated Cable Row', 90, false),
  ('Face Pull', 90, false),
  ('Hip Thrust', 90, false),
  ('DB Split Squat', 90, false),
  ('BikeErg', 60, true),
  ('Goblet Squat', 90, false),
  ('Machine Chest Press', 90, false),
  ('Seated DB Shoulder Press', 90, false),
  ('Lat Pulldown Neutral', 90, false),
  ('Leg Extension', 90, false),
  ('Leg Curl', 90, false),
  ('SkiErg', 60, true),
  ('Hack Squat', 90, false),
  ('DB Romanian Deadlift', 90, false),
  ('Incline Press Up', 90, false),
  ('Seated Machine Row', 90, false),
  ('DB Curl', 90, false),
  ('Rope Pushdown', 90, false),
  ('Treadmill Sled Push', 60, true)
on conflict (name) do nothing;

drop function if exists public.seed_full_body_week1(text) cascade;

create function public.seed_full_body_week1(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_prog   uuid;
  v_week   uuid;
  v_sess   uuid;
  v_block  uuid;
  r        record;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  -- By email, not by name. Two members are called "Luke"; nobody
  -- shares an email, and matching on a name that isn't unique had the
  -- seed attaching a programme to whichever row came back first.
  select u.id into v_client
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(btrim(p_email));

  if v_client is null then
    raise exception 'no member with the email %', p_email;
  end if;

  select id into v_prog from public.programmes
   where client_id = v_client order by sort limit 1;

  if v_prog is null then
    v_prog := public.create_client_programme(v_client, 'Full Body', 4);
  else
    update public.programmes set name = 'Full Body'
     where id = v_prog and name like '%1:1%';
  end if;

  select id into v_week from public.weeks
   where programme_id = v_prog and idx = 1;

  -- ---------- the three days ----------
  for r in
    select * from (values
      (1, 'Legs & Pull',   'Press, pull and glutes'),
      (3, 'Squat & Press', 'Squat, shoulders and legs'),
      (5, 'Hinge & Arms',  'Hinge, row and arms')
    ) as t(day, title, focus)
  loop
    select id into v_sess from public.sessions
     where week_id = v_week and day = r.day and coalesce(slot, 1) = 1;

    if v_sess is null then
      insert into public.sessions
        (week_id, day, slot, title, kind, est_min, focus, body)
      values
        (v_week, r.day, 1, r.title, 'strength', 55, r.focus,
         'Supersets. Work through A1 and A2 together — one set of each, '
         || 'then rest, then go again.')
      returning id into v_sess;
    else
      update public.sessions
         set title = r.title, kind = 'strength', focus = r.focus, est_min = 55
       where id = v_sess;
    end if;

    -- wipe and rewrite the blocks, so a re-run is an update
    delete from public.blocks where session_id = v_sess;
  end loop;

  -- ---------- blocks ----------
  for r in
    select * from (values
  (1, 1, 'A', 'Legs & pull', 'superset',  3, 90, null),
  (1, 2, 'B', 'Push & pull', 'superset',  3, 90, null),
  (1, 3, 'C', 'Glutes & single leg', 'superset',  3, 90, null),
  (1, 4, 'D', 'Bike intervals', 'intervals', 5, 40, 20),   -- bike 20s on / 40s off
  (3, 1, 'A', 'Squat & press', 'superset',  3, 90, null),
  (3, 2, 'B', 'Shoulders & lats', 'superset',  3, 90, null),
  (3, 3, 'C', 'Quads & hamstrings', 'superset',  3, 75, null),
  (3, 4, 'D', 'Ski intervals', 'intervals', 4, 60, 30),   -- ski 30s on / 60s off
  (5, 1, 'A', 'Squat & hinge', 'superset',  3, 90, null),
  (5, 2, 'B', 'Push & row', 'superset',  3, 90, null),
  (5, 3, 'C', 'Arms', 'superset',  2, 60, null),
  (5, 4, 'D', 'Sled intervals', 'intervals', 4, 60, 20)    -- sled 20s on / 60s off
    ) as t(day, ord, letter, label, fmt, rounds, rest_s, work_s)
  loop
    select s.id into v_sess from public.sessions s
     where s.week_id = v_week and s.day = r.day and coalesce(s.slot,1) = 1;

    insert into public.blocks
      (session_id, ord, letter, label, format, rounds, rest_s, work_s, scheme)
    values
      (v_sess, r.ord, r.letter, r.label, r.fmt, r.rounds, r.rest_s,
       r.work_s, null);
  end loop;

  -- the chip, from the structured fields
  update public.blocks b set scheme = public.block_scheme(b)
    from public.sessions s
    join public.weeks w on w.id = s.week_id
   where b.session_id = s.id and w.programme_id = v_prog;

  -- ---------- the lines members read ----------
  for r in
    select * from (values
  (1, 'A', 1, 'A1', '3 × 12', 'Leg Press'),
  (1, 'A', 2, 'A2', '3 × 12', 'Lat Pulldown'),
  (1, 'B', 1, 'B1', '3 × 10', 'DB Incline Press'),
  (1, 'B', 2, 'B2', '3 × 12', 'Seated Cable Row'),
  (1, 'B', 3, 'B3', '3 × 12', 'Face Pull'),
  (1, 'C', 1, 'C1', '3 × 12', 'Hip Thrust'),
  (1, 'C', 2, 'C2', '2 × 8 each leg', 'DB Split Squat'),
  (1, 'D', 1, 'D1', '5 × 20s hard / 40s easy', 'BikeErg'),
  (3, 'A', 1, 'A1', '3 × 10', 'Goblet Squat'),
  (3, 'A', 2, 'A2', '3 × 12', 'Machine Chest Press'),
  (3, 'B', 1, 'B1', '3 × 10', 'Seated DB Shoulder Press'),
  (3, 'B', 2, 'B2', '3 × 12', 'Lat Pulldown Neutral'),
  (3, 'C', 1, 'C1', '3 × 12', 'Leg Extension'),
  (3, 'C', 2, 'C2', '3 × 12', 'Leg Curl'),
  (3, 'D', 1, 'D1', '4 × 30s hard / 60s easy', 'SkiErg'),
  (5, 'A', 1, 'A1', '3 × 10', 'Hack Squat'),
  (5, 'A', 2, 'A2', '3 × 10', 'DB Romanian Deadlift'),
  (5, 'B', 1, 'B1', '3 × 8–10', 'Incline Press Up'),
  (5, 'B', 2, 'B2', '3 × 12', 'Seated Machine Row'),
  (5, 'C', 1, 'C1', '2 × 12', 'DB Curl'),
  (5, 'C', 2, 'C2', '2 × 12', 'Rope Pushdown'),
  (5, 'D', 1, 'D1', '4 × 20s push / 60s walk', 'Treadmill Sled Push')
    ) as t(day, letter, ord, tag, pres, movement)
  loop
    select b.id into v_block
      from public.blocks b
      join public.sessions s on s.id = b.session_id
     where s.week_id = v_week and s.day = r.day
       and coalesce(s.slot,1) = 1 and b.letter = r.letter;

    insert into public.block_lines (block_id, ord, prescription, movement, sub)
    values (v_block, r.ord, r.pres, r.movement, r.tag);
  end loop;

  -- ---------- the items she logs against ----------
  for r in
    select * from (values
  (1, 'A', 1, 'Leg Press', 3, 12, 90),
  (1, 'A', 2, 'Lat Pulldown', 3, 12, 90),
  (1, 'B', 1, 'DB Incline Press', 3, 10, 90),
  (1, 'B', 2, 'Seated Cable Row', 3, 12, 90),
  (1, 'B', 3, 'Face Pull', 3, 12, 90),
  (1, 'C', 1, 'Hip Thrust', 3, 12, 90),
  (1, 'C', 2, 'DB Split Squat', 2, 8, 90),
  (1, 'D', 1, 'BikeErg', 5, null, 40),
  (3, 'A', 1, 'Goblet Squat', 3, 10, 90),
  (3, 'A', 2, 'Machine Chest Press', 3, 12, 90),
  (3, 'B', 1, 'Seated DB Shoulder Press', 3, 10, 90),
  (3, 'B', 2, 'Lat Pulldown Neutral', 3, 12, 90),
  (3, 'C', 1, 'Leg Extension', 3, 12, 75),
  (3, 'C', 2, 'Leg Curl', 3, 12, 75),
  (3, 'D', 1, 'SkiErg', 4, null, 60),
  (5, 'A', 1, 'Hack Squat', 3, 10, 90),
  (5, 'A', 2, 'DB Romanian Deadlift', 3, 10, 90),
  (5, 'B', 1, 'Incline Press Up', 3, 9, 90),
  (5, 'B', 2, 'Seated Machine Row', 3, 12, 90),
  (5, 'C', 1, 'DB Curl', 2, 12, 60),
  (5, 'C', 2, 'Rope Pushdown', 2, 12, 60),
  (5, 'D', 1, 'Treadmill Sled Push', 4, null, 60)
    ) as t(day, letter, ord, movement, sets, reps, rest_s)
  loop
    select b.id into v_block
      from public.blocks b
      join public.sessions s on s.id = b.session_id
     where s.week_id = v_week and s.day = r.day
       and coalesce(s.slot,1) = 1 and b.letter = r.letter;

    insert into public.block_items (block_id, movement_id, ord, sets, reps, rest_s)
    select v_block, m.id, r.ord, r.sets, r.reps, r.rest_s
      from public.movements m where m.name = r.movement;
  end loop;

  -- ---------- the rest of the week ----------
  insert into public.sessions (week_id, day, slot, title, kind, est_min, body)
  select v_week, d, 1, 'Rest', 'rest', 0,
         'Walk if you fancy it. Nothing that needs a warm-up.'
    from unnest(array[2,4,6,7]) as d
   where not exists (select 1 from public.sessions s
                      where s.week_id = v_week and s.day = d);

  raise notice 'Full Body week 1 written for %: 3 sessions, 12 blocks',
    p_email;
  return v_prog;
end;
$$;

grant execute on function public.seed_full_body_week1(text) to authenticated;

-- ---------- write it onto an account ----------
--  Change the email and re-run for anyone else. Re-running rewrites
--  that week rather than adding a second copy.
select public.seed_full_body_week1('luke@salus.house');
