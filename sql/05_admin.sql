-- ============================================================
--  SALUS TRAIN — back office
--  Run after 02_schema.sql, 03_seed.sql and 04_photos.sql.
--  Safe to re-run.
-- ============================================================

-- ---------- who is an admin ----------
-- A function rather than a subquery in every policy: it can be marked
-- STABLE so Postgres caches it per statement instead of re-running it
-- for every row.
drop function if exists public.is_admin() cascade;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------- content is writable by admins only ----------
-- Members keep their existing read-only policies; these add write.
do $$
declare t text;
begin
  foreach t in array array[
    'programmes','weeks','sessions','blocks','block_lines',
    'coach_notes','movements','block_items','notices','coaches','config'
  ] loop
    execute format('drop policy if exists "admin writes %1$s" on public.%1$I', t);
    execute format(
      'create policy "admin writes %1$s" on public.%1$I
         for all to authenticated
         using (public.is_admin())
         with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- admins can read every profile ----------
drop policy if exists "admin reads profiles" on profiles;
create policy "admin reads profiles" on profiles
  for select to authenticated using (public.is_admin());

-- ---------- storage: admins can upload ----------
-- The bucket stays publicly readable so <img> tags work without a token.
-- Only admins may write to it.
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select using (bucket_id = 'Photos');

drop policy if exists "admin writes photos" on storage.objects;
create policy "admin writes photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'Photos' and public.is_admin());

drop policy if exists "admin updates photos" on storage.objects;
create policy "admin updates photos" on storage.objects
  for update to authenticated using (bucket_id = 'Photos' and public.is_admin());

drop policy if exists "admin deletes photos" on storage.objects;
create policy "admin deletes photos" on storage.objects
  for delete to authenticated using (bucket_id = 'Photos' and public.is_admin());

-- ---------- draft state ----------
-- So a half-written week doesn't appear on anyone's phone.
alter table weeks add column if not exists published boolean default false;

-- Members only see published weeks; admins see everything.
drop policy if exists "read weeks" on weeks;
create policy "read weeks" on weeks
  for select to authenticated
  using (published = true or public.is_admin());

-- Week 1 is already live.
update weeks set published = true where idx = 1;

-- ============================================================
--  THE WEEK DUPLICATOR
--
--  Weeks 2-8 are not seven different weeks. They are the same
--  shape with different loads. So the useful operation isn't
--  "create a session" — it's "copy last week and change the
--  percentages". This does the whole tree in one call.
-- ============================================================
drop function if exists public.duplicate_week(integer, integer, text) cascade;

create function public.duplicate_week(
  src_idx  integer,
  dest_idx integer,
  prog_slug text default 'road-to-hyrox'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prog   uuid;
  v_src    uuid;
  v_dest   uuid;
  v_sess   record;
  v_new_s  uuid;
  v_block  record;
  v_new_b  uuid;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;

  select id into v_prog from public.programmes where slug = prog_slug;
  if v_prog is null then raise exception 'no programme %', prog_slug; end if;

  select id into v_src from public.weeks
    where programme_id = v_prog and idx = src_idx;
  if v_src is null then raise exception 'no week %', src_idx; end if;

  if exists (select 1 from public.weeks
             where programme_id = v_prog and idx = dest_idx) then
    raise exception 'week % already exists — delete it first', dest_idx;
  end if;

  -- the week itself, unpublished so it can be edited in peace
  insert into public.weeks (programme_id, idx, phase, note, published)
  select programme_id, dest_idx, phase, note, false
  from public.weeks where id = v_src
  returning id into v_dest;

  -- sessions, then each session's blocks, then each block's children
  for v_sess in
    select * from public.sessions where week_id = v_src order by day
  loop
    insert into public.sessions
      (week_id, day, title, tag, kind, est_min, is_test, body, cover_url)
    values
      (v_dest, v_sess.day, v_sess.title, v_sess.tag, v_sess.kind,
       v_sess.est_min, v_sess.is_test, v_sess.body, v_sess.cover_url)
    returning id into v_new_s;

    for v_block in
      select * from public.blocks where session_id = v_sess.id order by ord
    loop
      insert into public.blocks (session_id, ord, letter, label, scheme, rest_note)
      values (v_new_s, v_block.ord, v_block.letter, v_block.label,
              v_block.scheme, v_block.rest_note)
      returning id into v_new_b;

      insert into public.block_lines (block_id, ord, prescription, movement, sub)
      select v_new_b, ord, prescription, movement, sub
      from public.block_lines where block_id = v_block.id;

      insert into public.coach_notes (block_id, ord, heading, body)
      select v_new_b, ord, heading, body
      from public.coach_notes where block_id = v_block.id;

      insert into public.block_items (block_id, movement_id, ord, sets, reps, rest_s)
      select v_new_b, movement_id, ord, sets, reps, rest_s
      from public.block_items where block_id = v_block.id;
    end loop;
  end loop;

  return v_dest;
end;
$$;

grant execute on function public.duplicate_week(integer, integer, text) to authenticated;

-- ============================================================
--  Make yourself an admin. Replace the email, then run.
-- ============================================================
-- update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@salus.house');
