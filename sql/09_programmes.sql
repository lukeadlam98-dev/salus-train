-- ============================================================
--  SALUS TRAIN — more than one programme
--
--  Everything so far assumed Road to HYROX. This makes the
--  programme a real thing: members belong to one, the back
--  office edits any of them, and a new one arrives with its
--  weeks already scaffolded.
--
--  Run after 08_leaderboards.sql. Safe to re-run.
-- ============================================================

-- ---------- a member is on a programme ----------
alter table profiles add column if not exists programme_id uuid
  references programmes on delete set null;

-- Everyone currently on the app is on Road to HYROX.
update profiles
set programme_id = (select id from programmes where slug = 'road-to-hyrox')
where programme_id is null;

-- ---------- programmes gain the fields the app wants ----------
--
-- All of them here, before anything selects from them. Later files add
-- more, but a view built in this file can only reference columns that
-- exist by this point — which is what "column pr.race_image does not
-- exist" was telling us.
alter table programmes add column if not exists starts_on date;
alter table programmes add column if not exists ends_on date;
alter table programmes add column if not exists race_name text;
alter table programmes add column if not exists uses_half boolean default false;
alter table programmes add column if not exists race_image text;
alter table programmes add column if not exists race_location text;
alter table programmes add column if not exists race_date date;
alter table programmes add column if not exists archived boolean default false;
alter table programmes add column if not exists cover_url text;
alter table programmes add column if not exists sessions_per_week integer;

update programmes
set race_name = 'HYROX London ExCeL', uses_half = true
where slug = 'road-to-hyrox' and race_name is null;

-- ============================================================
--  Creating a programme scaffolds its weeks.
--
--  A ten-week block shouldn't mean clicking "add week" ten times.
--  This makes the programme and its empty weeks in one go, all
--  unpublished so nothing appears until you're ready.
-- ============================================================
drop function if exists public.create_programme(text, text, integer, text) cascade;

create function public.create_programme(
  p_name  text,
  p_slug  text,
  p_weeks integer default 8,
  p_blurb text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  i    integer;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;

  if exists (select 1 from public.programmes where slug = p_slug) then
    raise exception 'a programme with that name already exists';
  end if;

  insert into public.programmes (slug, name, weeks, blurb, live, sort)
  values (p_slug, p_name, p_weeks, p_blurb, false,
          coalesce((select max(sort) from public.programmes), 0) + 1)
  returning id into v_id;

  for i in 1..p_weeks loop
    insert into public.weeks (programme_id, idx, phase, published)
    values (v_id, i, 'Week ' || i, false);
  end loop;

  return v_id;
end;
$$;

grant execute on function public.create_programme(text, text, integer, text)
  to authenticated;

-- ============================================================
--  Adding a single week to an existing programme.
-- ============================================================
drop function if exists public.add_week(uuid, integer) cascade;

create function public.add_week(
  p_programme uuid,
  p_idx       integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idx integer;
  v_id  uuid;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;

  v_idx := coalesce(p_idx,
    coalesce((select max(idx) from public.weeks where programme_id = p_programme), 0) + 1);

  if exists (select 1 from public.weeks
             where programme_id = p_programme and idx = v_idx) then
    raise exception 'week % already exists', v_idx;
  end if;

  insert into public.weeks (programme_id, idx, phase, published)
  values (p_programme, v_idx, 'Week ' || v_idx, false)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_week(uuid, integer) to authenticated;

-- ============================================================
--  duplicate_week, by id rather than slug.
--
--  The old signature took a slug, which meant the caller had to
--  know it. This takes the programme directly, and can copy
--  across programmes — useful when a new block borrows a week
--  from an old one.
-- ============================================================
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
  v_dest  uuid;
  v_idx   integer;
  v_sess  record;
  v_new_s uuid;
  v_block record;
  v_new_b uuid;
begin
  if not public.is_admin() then
    raise exception 'not permitted';
  end if;

  v_idx := coalesce(dest_idx,
    coalesce((select max(idx) from public.weeks where programme_id = dest_prog), 0) + 1);

  if exists (select 1 from public.weeks
             where programme_id = dest_prog and idx = v_idx) then
    raise exception 'week % already exists there', v_idx;
  end if;

  insert into public.weeks (programme_id, idx, phase, note, published)
  select dest_prog, v_idx, phase, note, false
  from public.weeks where id = src_week
  returning id into v_dest;

  for v_sess in
    select * from public.sessions where week_id = src_week order by day
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

grant execute on function public.duplicate_week_to(uuid, uuid, integer)
  to authenticated;

-- ============================================================
--  A member's current week, whichever programme they're on.
-- ============================================================
drop view if exists public.my_programme cascade;

create view my_programme
with (security_invoker = on) as
select
  p.id            as user_id,
  pr.id           as programme_id,
  pr.slug,
  pr.name,
  pr.weeks        as total_weeks,
  pr.race_name,
  pr.uses_half,
  pr.starts_on,
  pr.race_image,
  pr.race_location
from profiles p
join programmes pr on pr.id = p.programme_id
where p.id = auth.uid();

grant select on my_programme to authenticated;

-- ---------- the seeded programmes get sensible week counts ----------
update programmes set weeks = 10 where slug = 'athx'     and weeks is null;
update programmes set weeks = 6  where slug = 'reformer' and weeks is null;
update programmes set weeks = 8  where slug = 'five-k'   and weeks is null;
