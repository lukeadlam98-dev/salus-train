-- ============================================================
--  SALUS TRAIN — make "copy week" copy the whole week
--
--  duplicate_week_to was written before blocks had formats, and it
--  named its columns one by one:
--
--    insert into blocks (session_id, ord, letter, label, scheme, rest_note)
--
--  Every column added since has been quietly dropped on every copy —
--  format, rounds, work_s, rest_s, cap_s, window_s, ladder,
--  target_pct, target_rpe, pace_pct on a block, and slot, focus,
--  video_url, coach_id and the whole run plan on a session. So
--  "+ Copy 3" gave you a week where every AMRAP had become straight
--  sets, every interval had lost its clock, every superset had come
--  apart into a list, and two sessions on the same day had collided
--  on slot.
--
--  It compiled, it ran, it returned a week. You had to open a session
--  and know what used to be there to see what was missing.
--
--  The fix isn't a longer column list — that's the same bug waiting
--  for the next migration. It reads the columns from the catalogue, so
--  anything added later is carried without this function being
--  touched again.
--
--  Run after 55_rakhee.sql. Safe to re-run.
-- ============================================================

set lock_timeout = '5s';

-- ---------- which columns to carry ----------
--  Everything except the row's own identity, its link to its parent,
--  and the few things that must not be duplicated.
drop function if exists public.copyable_columns(text, text[]) cascade;

create function public.copyable_columns(p_table text, p_skip text[])
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    from information_schema.columns
   where table_schema = 'public'
     and table_name = p_table
     and column_name <> all (p_skip);
$$;

-- ---------- copy a week ----------
drop function if exists public.duplicate_week_to(uuid, uuid, integer) cascade;

create function public.duplicate_week_to(
  src_week    uuid,
  dest_prog   uuid,
  dest_idx    integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dest   uuid;
  v_idx    integer;
  v_sess   record;
  v_new_s  uuid;
  v_block  record;
  v_new_b  uuid;
  c_sess   text;
  c_block  text;
  c_line   text;
  c_note   text;
  c_item   text;
begin
  -- Null uid means the SQL editor or the service role, which is more
  -- privileged than an admin rather than less.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  v_idx := coalesce(dest_idx,
    coalesce((select max(idx) from public.weeks
               where programme_id = dest_prog), 0) + 1);

  if exists (select 1 from public.weeks
              where programme_id = dest_prog and idx = v_idx) then
    raise exception 'week % already exists there', v_idx;
  end if;

  --  wotw is deliberately not carried: two sessions flagged as the
  --  workout of the week means the board picks one of them at random.
  c_sess  := public.copyable_columns('sessions',
               array['id','week_id','created_at','wotw','wotw_metric']);
  c_block := public.copyable_columns('blocks',
               array['id','session_id','created_at']);
  c_line  := public.copyable_columns('block_lines',
               array['id','block_id','created_at']);
  c_note  := public.copyable_columns('coach_notes',
               array['id','block_id','created_at']);
  c_item  := public.copyable_columns('block_items',
               array['id','block_id','created_at']);

  insert into public.weeks (programme_id, idx, phase, note, published)
  select dest_prog, v_idx, phase, note, false
    from public.weeks where id = src_week
  returning id into v_dest;

  for v_sess in
    select id from public.sessions where week_id = src_week
     order by day, slot
  loop
    execute format(
      'insert into public.sessions (week_id, %s)
       select $1, %s from public.sessions where id = $2
       returning id', c_sess, c_sess)
      using v_dest, v_sess.id into v_new_s;

    for v_block in
      select id from public.blocks where session_id = v_sess.id order by ord
    loop
      execute format(
        'insert into public.blocks (session_id, %s)
         select $1, %s from public.blocks where id = $2
         returning id', c_block, c_block)
        using v_new_s, v_block.id into v_new_b;

      execute format(
        'insert into public.block_lines (block_id, %s)
         select $1, %s from public.block_lines where block_id = $2',
        c_line, c_line) using v_new_b, v_block.id;

      execute format(
        'insert into public.coach_notes (block_id, %s)
         select $1, %s from public.coach_notes where block_id = $2',
        c_note, c_note) using v_new_b, v_block.id;

      execute format(
        'insert into public.block_items (block_id, %s)
         select $1, %s from public.block_items where block_id = $2',
        c_item, c_item) using v_new_b, v_block.id;
    end loop;
  end loop;

  return v_dest;
end;
$$;

grant execute on function public.duplicate_week_to(uuid, uuid, integer)
  to authenticated;

-- ---------- copy somebody's 1:1 week onto somebody else ----------
--  For trying a programme out on yourself before the client sees it,
--  which is the only honest way to know whether it reads right on a
--  phone in a gym.
drop function if exists public.copy_client_week(uuid, uuid, integer) cascade;

create function public.copy_client_week(
  p_from  uuid,     -- the member whose 1:1 to copy from
  p_to    uuid,     -- the member to give a copy to
  p_idx   integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_src_prog  uuid;
  v_src_week  uuid;
  v_dest_prog uuid;
  v_dest_week uuid;
  v_was       uuid;
  v_was_idx   integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  select id into v_src_prog from public.programmes
   where client_id = p_from and archived = false order by sort limit 1;
  if v_src_prog is null then
    raise exception 'that member has no 1:1 programme to copy';
  end if;

  select id into v_src_week from public.weeks
   where programme_id = v_src_prog and idx = p_idx;
  if v_src_week is null then
    raise exception 'week % is not written yet', p_idx;
  end if;

  -- Where they were, so it can be said out loud. Switching programme
  -- resets the week, and finding that out afterwards is no good.
  select programme_id, week_idx into v_was, v_was_idx
    from public.profiles where id = p_to;

  select id into v_dest_prog from public.programmes
   where client_id = p_to and archived = false order by sort limit 1;
  if v_dest_prog is null then
    v_dest_prog := public.create_client_programme(
                     p_to, (select name from public.programmes
                             where id = v_src_prog), 4);
  end if;

  -- create_client_programme builds empty weeks. Clear the one we're
  -- about to write so the copy can take its number rather than
  -- landing after it.
  delete from public.weeks
   where programme_id = v_dest_prog and idx = p_idx
     and not exists (select 1 from public.sessions s
                      where s.week_id = weeks.id);

  if exists (select 1 from public.weeks
              where programme_id = v_dest_prog and idx = p_idx) then
    raise exception
      'week % already has sessions in it — delete it first if you mean to replace it',
      p_idx;
  end if;

  v_dest_week := public.duplicate_week_to(v_src_week, v_dest_prog, p_idx);

  update public.weeks set published = true where id = v_dest_week;
  update public.profiles
     set programme_id = v_dest_prog, week_idx = p_idx,
         week_started = current_date
   where id = p_to;

  if v_was is distinct from v_dest_prog then
    raise notice '%', format(
      'Moved off programme %s (week %s). To go back: '
      || 'update profiles set programme_id = %L, week_idx = %s where id = %L;',
      v_was, v_was_idx, v_was, v_was_idx, p_to);
  end if;

  return v_dest_week;
end;
$$;

grant execute on function public.copy_client_week(uuid, uuid, integer)
  to authenticated;

-- ---------- give Luke a copy of Rakhee's week one ----------
do $$
declare
  v_luke   uuid;
  v_rakhee uuid;
begin
  select id into v_luke from public.profiles
   where lower(name) like 'luke%adlam%' limit 1;
  if v_luke is null then
    select id into v_luke from public.profiles
     where lower(name) like 'luke%' limit 1;
  end if;

  select id into v_rakhee from public.profiles
   where lower(name) like 'rakhee%' limit 1;

  if v_luke is null then
    raise notice 'No member matching Luke — skipping.';
    return;
  end if;
  if v_rakhee is null then
    raise notice 'No member matching Rakhee — run 55_rakhee.sql first.';
    return;
  end if;

  begin
    perform public.copy_client_week(v_rakhee, v_luke, 1);
    raise notice 'Luke now has his own copy of week one.';
  exception when others then
    -- Most likely he already has it, which is not a failure worth
    -- stopping a paste for.
    raise notice 'Not copied: %', sqlerrm;
  end;
end $$;
