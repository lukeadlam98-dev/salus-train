-- ============================================================
--  SALUS TRAIN — everything, in order, in one paste.
--
--  ⚠  CLOSE THE APP FIRST — every tab, every device.
-- ============================================================

set lock_timeout = '5s';
set statement_timeout = '180s';


-- ============================================================
--  02_schema.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — remaining schema
--  Run this AFTER the profiles, benchmarks and content tables.
--  Safe to re-run: everything is guarded.
-- ============================================================

-- ---------- config ----------
create table if not exists config (
  key   text primary key,
  value text not null
);
alter table config enable row level security;
drop policy if exists "read config" on config;
create policy "read config" on config for select to authenticated using (true);

insert into config (key, value) values ('half_multiplier', '2.08')
  on conflict (key) do nothing;

-- ---------- movements ----------
create table if not exists movements (
  id              uuid primary key default gen_random_uuid(),
  name            text unique not null,
  default_rest_s  integer default 90,
  has_time        boolean default false,
  pct_of          text,          -- 'squat' | null
  pct             numeric        -- 0.90 = 90% of that benchmark
);
alter table movements enable row level security;
drop policy if exists "read movements" on movements;
create policy "read movements" on movements for select to authenticated using (true);

-- ---------- block items (the loggable sets) ----------
create table if not exists block_items (
  id           uuid primary key default gen_random_uuid(),
  block_id     uuid references blocks on delete cascade not null,
  movement_id  uuid references movements on delete restrict not null,
  ord          integer not null,
  sets         integer not null,
  reps         integer,
  rest_s       integer
);
alter table block_items enable row level security;
drop policy if exists "read block_items" on block_items;
create policy "read block_items" on block_items for select to authenticated using (true);

-- ---------- workout logs ----------
create table if not exists workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  session_id  uuid references sessions on delete cascade not null,
  started_at  timestamptz default now(),
  ended_at    timestamptz,
  elapsed_s   integer,
  effort      integer,
  created_at  timestamptz default now()
);
alter table workout_logs enable row level security;
drop policy if exists "own workout_logs read"   on workout_logs;
drop policy if exists "own workout_logs insert" on workout_logs;
drop policy if exists "own workout_logs update" on workout_logs;
create policy "own workout_logs read"   on workout_logs for select using (auth.uid() = user_id);
create policy "own workout_logs insert" on workout_logs for insert with check (auth.uid() = user_id);
create policy "own workout_logs update" on workout_logs for update using (auth.uid() = user_id);

-- ---------- set logs ----------
create table if not exists set_logs (
  id              uuid primary key default gen_random_uuid(),
  workout_log_id  uuid references workout_logs on delete cascade not null,
  block_item_id   uuid references block_items on delete cascade not null,
  set_idx         integer not null,
  reps            numeric,
  kg              numeric,
  seconds         integer,
  done            boolean default true,
  unique (workout_log_id, block_item_id, set_idx)
);
alter table set_logs enable row level security;
drop policy if exists "own set_logs read"   on set_logs;
drop policy if exists "own set_logs write"  on set_logs;
drop policy if exists "own set_logs update" on set_logs;
create policy "own set_logs read" on set_logs for select using (
  exists (select 1 from workout_logs w where w.id = workout_log_id and w.user_id = auth.uid()));
create policy "own set_logs write" on set_logs for insert with check (
  exists (select 1 from workout_logs w where w.id = workout_log_id and w.user_id = auth.uid()));
create policy "own set_logs update" on set_logs for update using (
  exists (select 1 from workout_logs w where w.id = workout_log_id and w.user_id = auth.uid()));

-- ---------- half simulations ----------
create table if not exists half_sims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  week_idx     integer not null default 1,
  total_s      integer,
  projected_s  integer,
  created_at   timestamptz default now(),
  unique (user_id, week_idx)
);
alter table half_sims enable row level security;
drop policy if exists "own half read"   on half_sims;
drop policy if exists "own half write"  on half_sims;
drop policy if exists "own half update" on half_sims;
create policy "own half read"   on half_sims for select using (auth.uid() = user_id);
create policy "own half write"  on half_sims for insert with check (auth.uid() = user_id);
create policy "own half update" on half_sims for update using (auth.uid() = user_id);

create table if not exists half_splits (
  id           uuid primary key default gen_random_uuid(),
  half_sim_id  uuid references half_sims on delete cascade not null,
  leg_key      text not null,
  seconds      integer not null,
  unique (half_sim_id, leg_key)
);
alter table half_splits enable row level security;
drop policy if exists "own split read"   on half_splits;
drop policy if exists "own split write"  on half_splits;
drop policy if exists "own split update" on half_splits;
create policy "own split read" on half_splits for select using (
  exists (select 1 from half_sims h where h.id = half_sim_id and h.user_id = auth.uid()));
create policy "own split write" on half_splits for insert with check (
  exists (select 1 from half_sims h where h.id = half_sim_id and h.user_id = auth.uid()));
create policy "own split update" on half_splits for update using (
  exists (select 1 from half_sims h where h.id = half_sim_id and h.user_id = auth.uid()));

-- ---------- coaches ----------
create table if not exists coaches (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users on delete set null,
  slug      text unique not null,
  name      text not null,
  role      text,
  bio       text,
  spec      text[],
  replies   text,
  tint      text default '#4E463C',
  sort      integer default 0
);
alter table coaches enable row level security;
drop policy if exists "read coaches" on coaches;
create policy "read coaches" on coaches for select to authenticated using (true);

-- ---------- messages ----------
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references auth.users on delete cascade not null,
  coach_id    uuid references coaches on delete cascade not null,
  from_member boolean not null,
  body        text not null,
  created_at  timestamptz default now(),
  read_at     timestamptz
);
alter table messages enable row level security;
drop policy if exists "own messages read"  on messages;
drop policy if exists "own messages write" on messages;
create policy "own messages read"  on messages for select using (auth.uid() = member_id);
create policy "own messages write" on messages for insert
  with check (auth.uid() = member_id and from_member = true);

-- ---------- notices ----------
create table if not exists notices (
  id            uuid primary key default gen_random_uuid(),
  tag           text,
  title         text not null,
  body          text not null,
  pinned        boolean default false,
  published_at  timestamptz default now()
);
alter table notices enable row level security;
drop policy if exists "read notices" on notices;
create policy "read notices" on notices for select to authenticated using (true);

-- ---------- leaderboard ----------
-- A view, not a table. Only members who opted in appear, and only
-- name plus score are exposed — never the user id.
drop view if exists public.leaderboard_half cascade;

create view leaderboard_half
with (security_invoker = on) as
select
  p.name                       as name,
  h.projected_s                as projected_s,
  h.total_s                    as total_s,
  h.week_idx                   as week_idx
from half_sims h
join profiles p on p.id = h.user_id
where p.share_on_leaderboard = true
  and h.projected_s is not null;

grant select on leaderboard_half to authenticated;

-- members can read opted-in profiles so the view can resolve names
drop policy if exists "read shared profiles" on profiles;
create policy "read shared profiles" on profiles
  for select to authenticated using (share_on_leaderboard = true);

-- ============================================================
--  COLUMNS ADDED BY LATER FILES, DECLARED HERE
--
--  Every one of these is also added by the file that introduces
--  the feature — "if not exists" makes that a no-op. They are
--  repeated up front because a view built in an early file can
--  only select columns that exist by that point, and running the
--  whole thing top to bottom is the common case.
--
--  Without this you get "column pr.race_image does not exist"
--  from a view three hundred lines before the alter that adds it.
-- ============================================================

alter table programmes add column if not exists cover_url text;
alter table programmes add column if not exists sessions_per_week integer;
alter table programmes add column if not exists starts_on date;
alter table programmes add column if not exists ends_on date;
alter table programmes add column if not exists race_name text;
alter table programmes add column if not exists race_location text;
alter table programmes add column if not exists race_date date;
alter table programmes add column if not exists race_image text;
alter table programmes add column if not exists uses_half boolean default false;
alter table programmes add column if not exists archived boolean default false;

alter table sessions add column if not exists cover_url text;
alter table sessions add column if not exists slot integer default 1;
alter table sessions add column if not exists video_url text;
alter table sessions add column if not exists focus text;
alter table sessions add column if not exists run_distance_m integer;
alter table sessions add column if not exists run_reps integer;
alter table sessions add column if not exists run_pace_pct numeric;

alter table weeks add column if not exists published boolean default false;

alter table profiles add column if not exists sex text;
alter table profiles add column if not exists programme_id uuid;

alter table coaches add column if not exists photo_url text;

-- coach_id needs the coaches table, so it comes after both exist
alter table sessions add column if not exists coach_id uuid;

-- ---------- more than one session in a day ----------
--
--  sessions was unique on (week_id, day), which is fine until a
--  programme has a hard session in the morning and an easy one in the
--  evening. That is the whole difference between training for a good
--  time and training for a podium, so the constraint goes rather than
--  the doubles.
--
--  slot 1 is the morning, 2 is the evening.
update sessions set slot = 1 where slot is null;
alter table sessions drop constraint if exists sessions_week_id_day_key;
alter table sessions drop constraint if exists sessions_week_day_slot_key;
alter table sessions add constraint sessions_week_day_slot_key
  unique (week_id, day, slot);


-- ============================================================
--  03_seed.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — seed data
--  Run AFTER 02_schema.sql. Safe to re-run.
-- ============================================================

-- ---------- movements ----------
insert into movements (name, default_rest_s, has_time, pct_of, pct) values
  ('Barbell Back Squat',    150, false, 'squat', 1.00),
  ('Pause Back Squat',       90, false, 'squat', 0.72),
  ('Chest-Supported Row',    90, false, null,    null),
  ('Lat Pulldown',           90, false, null,    null),
  ('Dead Hang',              90, true,  null,    null),
  ('SkiErg 1,000m',         180, true,  null,    null),
  ('Row 1,000m',            180, true,  null,    null),
  ('5km Time Trial',          0, true,  null,    null)
on conflict (name) do nothing;

-- ---------- loggable items on Monday ----------
-- Block A: the squat test
insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 5, 5, 150
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = 'Barbell Back Squat'
where w.idx = 1 and s.day = 1 and b.letter = 'A'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- Block B: rows and hangs
insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, x.ord, x.sets, x.reps, 90
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('Chest-Supported Row', 1, 3, 10),
  ('Dead Hang',           2, 3, 1)
) as x(mv, ord, sets, reps)
join movements m on m.name = x.mv
where w.idx = 1 and s.day = 1 and b.letter = 'B'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- Thursday: the ergs ----------
insert into blocks (session_id, ord, letter, label, scheme, rest_note)
select s.id, x.ord, x.letter, x.label, x.scheme, x.rest
from sessions s
join weeks w on w.id = s.week_id
cross join (values
  (1, 'W', 'Warm Up', 'Build over 3 efforts', null),
  (2, 'A', 'SkiErg 1,000m', 'All out, fresh', '10 min rest before the row'),
  (3, 'B', 'Row 1,000m', 'All out', null)
) as x(ord, letter, label, scheme, rest)
where w.idx = 1 and s.day = 4
  and not exists (select 1 from blocks b where b.session_id = s.id);

insert into block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('W', 1, '5 min',   'BikeErg easy', null),
  ('W', 2, '3 × 100m','SkiErg, building', null),
  ('W', 3, '3 × 100m','Row, building', null),
  ('A', 1, '1,000m',  'SkiErg', 'Log the time and the average split'),
  ('B', 1, '1,000m',  'Row', 'Log the time and the average split')
) as x(letter, ord, pres, mv, sub)
where w.idx = 1 and s.day = 4 and b.letter = x.letter
  and not exists (select 1 from block_lines bl where bl.block_id = b.id);

insert into coach_notes (block_id, ord, heading, body)
select b.id, x.ord, x.heading, x.body
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('A', 1, 'Pacing', 'Roughly a four-minute effort. Go out at a pace you can hold, not one you can survive for 300m.'),
  ('B', 1, 'Compare', 'Most people are notably better at one. The gap tells you which machine to attack and which to sit on.')
) as x(letter, ord, heading, body)
where w.idx = 1 and s.day = 4 and b.letter = x.letter
  and not exists (select 1 from coach_notes cn where cn.block_id = b.id);

insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 1, null, 600
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = case b.letter when 'A' then 'SkiErg 1,000m' else 'Row 1,000m' end
where w.idx = 1 and s.day = 4 and b.letter in ('A','B')
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- Saturday: the 5km ----------
insert into blocks (session_id, ord, letter, label, scheme, rest_note)
select s.id, x.ord, x.letter, x.label, x.scheme, null
from sessions s
join weeks w on w.id = s.week_id
cross join (values
  (1, 'W', 'Warm Up', '15 min'),
  (2, 'A', 'The Test', 'One effort')
) as x(ord, letter, label, scheme)
where w.idx = 1 and s.day = 6
  and not exists (select 1 from blocks b where b.session_id = s.id);

insert into block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('W', 1, '10 min',  'Easy jog', null),
  ('W', 2, '4 × 20s', 'Strides', 'Full recovery between'),
  ('A', 1, '5km',     'Time trial', 'Even pace, 1% incline')
) as x(letter, ord, pres, mv, sub)
where w.idx = 1 and s.day = 6 and b.letter = x.letter
  and not exists (select 1 from block_lines bl where bl.block_id = b.id);

insert into coach_notes (block_id, ord, heading, body)
select b.id, x.ord, x.heading, x.body
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('A', 1, 'Why treadmill', 'Same conditions in week 8. Outdoors in November you would be testing the weather.'),
  ('A', 2, 'Pacing', 'Set the belt and hold it. Most people go out 20 sec/km too fast and lose ninety seconds in the last kilometre.')
) as x(letter, ord, heading, body)
where w.idx = 1 and s.day = 6 and b.letter = x.letter
  and not exists (select 1 from coach_notes cn where cn.block_id = b.id);

insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 1, null, 0
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = '5km Time Trial'
where w.idx = 1 and s.day = 6 and b.letter = 'A'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- coaches ----------
insert into coaches (slug, name, role, bio, spec, replies, tint, sort) values
  ('luke', 'Luke', 'Co-founder & Head of Programming',
   'Co-founded Salus House and writes the training blocks. On the floor most of the week with the hybrid sessions.',
   array['Hybrid training','HYROX programming','Strength'],
   'Usually replies within a day', '#4E463C', 1),
  ('katy', 'Katy', 'Coach',
   'Runs most of the reformer and strength sessions. If squat depth or your hips are the limiter, ask her.',
   array['Reformer Pilates','Strength','Movement quality'],
   'Usually replies within a few hours', '#615146', 2),
  ('stephen', 'Stephen', 'Coach & Operations',
   'Handles the running side and everything race-day — logistics, pacing, wave times, what to expect at ExCeL.',
   array['Running','Conditioning','Race prep'],
   'Usually replies within a few hours', '#4C5348', 3),
  ('alex', 'Alex', 'Coach',
   'Takes the heavy days. Sled position, carries, and anything needing a second pair of eyes under a barbell.',
   array['Strength','Sled & carries','Technique'],
   'Usually replies within a day', '#6B5644', 4)
on conflict (slug) do nothing;

-- ---------- notices ----------
insert into notices (tag, title, body, pinned) values
  ('RACE DAY', 'ExCeL group travel is open',
   'We are taking a group down on the DLR for the Wednesday and Saturday waves. Add your name at the desk by 20 November so we can sort times.',
   true),
  ('TIMETABLE', 'Extra hybrid slot on Tuesday mornings',
   'From next week there is a 06:15 hybrid slot on Tuesdays, built around the compromised running session. Booking is open.',
   false),
  ('THE ROOM', 'New sleds in — race weight from Monday',
   'Both sleds now load to full HYROX Open standards. Ask Alex for a hand setting yours the first time.',
   false)
on conflict do nothing;


-- ============================================================
--  04_photos.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — photos
--  Adds a cover image to sessions and programmes.
--  The photo belongs to the content, not the code — so a coach
--  changes it by pasting a URL into a table, with no deploy.
-- ============================================================

alter table sessions   add column if not exists cover_url text;
alter table programmes add column if not exists cover_url text;

-- Fill these in from Storage → photos → the file → Copy URL.
-- Replace YOURPROJECT with your project ref.
--
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/squat.jpg'    where day = 1;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/hero.jpg'     where day = 2;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/reformer.jpg' where day = 3;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/plate.jpg'    where day = 6;
--
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/hero.jpg'     where slug = 'road-to-hyrox';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/squat.jpg'    where slug = 'athx';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/reformer.jpg' where slug = 'reformer';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/plate.jpg'    where slug = 'five-k';


-- ============================================================
--  05_admin.sql
-- ============================================================

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


-- ============================================================
--  06_layout.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — layout as content
--
--  The Today screen stops being hardcoded. Sections become rows
--  you can reorder and switch off, so the members' home can be
--  rearranged from the back office without a deploy.
--
--  Run after 05_admin.sql. Safe to re-run.
-- ============================================================

-- ---------- the sections of the members' home ----------
create table if not exists home_sections (
  id       uuid primary key default gen_random_uuid(),
  key      text unique not null,   -- what the app switches on
  label    text not null,          -- what you see in the back office
  note     text,                   -- what it does, in plain words
  ord      integer not null,
  visible  boolean default true,
  heading  text                    -- the label above it, where it has one
);

alter table home_sections enable row level security;

drop policy if exists "read home_sections" on home_sections;
create policy "read home_sections" on home_sections
  for select to authenticated using (true);

drop policy if exists "admin writes home_sections" on home_sections;
create policy "admin writes home_sections" on home_sections
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into home_sections (key, label, note, ord, visible, heading) values
  ('greeting',  'Greeting',        'Morning, [name] — plus the week and the mark.', 1, true, null),
  ('daystrip',  'Day strip',       'Mon to Sun, with a dot on days that have a session.', 2, true, null),
  ('countdown', 'Race countdown',  'Days to go, the eight-week bar, and the projected finish once they have done a half.', 3, true, null),
  ('session',   'Today''s session','The photo card with View session on it.', 4, true, null),
  ('notices',   'Notices',         'What''s on at Salus.', 5, true, 'WHAT''S ON AT SALUS'),
  ('programmes','Programmes',      'Road to HYROX plus whatever else is coming.', 6, true, 'PROGRAMMES')
on conflict (key) do nothing;

-- ---------- programmes get the fields the app already wants ----------
alter table programmes add column if not exists cover_url text;
alter table programmes add column if not exists sessions_per_week integer;
alter table programmes add column if not exists starts_on date;

-- ---------- app-wide copy and settings ----------
-- The config table already exists from 02_schema. These are the rows
-- that let you change wording without a deploy.
insert into config (key, value) values
  ('app_name',        'Salus Train'),
  ('login_headline',  'Train with intent.'),
  ('home_greeting',   'Morning'),
  ('race_name',       'HYROX London ExCeL'),
  ('race_default',    '2026-12-02')
on conflict (key) do nothing;

-- ---------- a view so the app fetches settings in one go ----------
drop view if exists public.app_config cascade;

create view app_config
with (security_invoker = on) as
  select key, value from config;

grant select on app_config to authenticated;


-- ============================================================
--  07_coach_view.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — coaches can see the training
--
--  Members' logs are private by default, which is right. A coach
--  needs to see them to coach. These policies are additive: they
--  don't loosen anything for members, they only let an admin read.
--
--  Nobody can edit a member's logs, including admins. If Katy
--  thinks a number is wrong she asks; she doesn't overwrite it.
--
--  Run after 06_layout.sql. Safe to re-run.
-- ============================================================

-- ---------- benchmarks ----------
drop policy if exists "admin reads benchmarks" on benchmarks;
create policy "admin reads benchmarks" on benchmarks
  for select to authenticated using (public.is_admin());

-- ---------- workouts ----------
drop policy if exists "admin reads workout_logs" on workout_logs;
create policy "admin reads workout_logs" on workout_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "admin reads set_logs" on set_logs;
create policy "admin reads set_logs" on set_logs
  for select to authenticated using (public.is_admin());

-- ---------- the half ----------
drop policy if exists "admin reads half_sims" on half_sims;
create policy "admin reads half_sims" on half_sims
  for select to authenticated using (public.is_admin());

drop policy if exists "admin reads half_splits" on half_splits;
create policy "admin reads half_splits" on half_splits
  for select to authenticated using (public.is_admin());

-- ---------- messages ----------
-- A coach sees the threads addressed to them, not everyone's.
drop policy if exists "coach reads own threads" on messages;
create policy "coach reads own threads" on messages
  for select to authenticated using (
    exists (select 1 from public.coaches c
            where c.id = messages.coach_id and c.user_id = auth.uid()));

drop policy if exists "coach replies" on messages;
create policy "coach replies" on messages
  for insert to authenticated with check (
    from_member = false
    and exists (select 1 from public.coaches c
                where c.id = messages.coach_id and c.user_id = auth.uid()));

-- ============================================================
--  Cohort views — the numbers worth looking at
-- ============================================================

-- Every member with their headline training numbers in one row.
drop view if exists public.member_overview cascade;

create view member_overview
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.race_date,
  p.race_division,
  p.role,
  p.created_at,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'squat' and b.week = 1)  as squat_kg,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'bw' and b.week = 1)     as bodyweight_kg,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'fivek' and b.week = 1)  as fivek_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'ski' and b.week = 1)    as ski_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'row' and b.week = 1)    as row_s,
  (select count(*) from benchmarks b
     where b.user_id = p.id and b.week = 1)                      as tests_done,
  (select h.total_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as half_s,
  (select h.projected_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as projected_s,
  (select count(*) from workout_logs w
     where w.user_id = p.id and w.ended_at is not null)          as sessions_done,
  (select max(w.ended_at) from workout_logs w
     where w.user_id = p.id)                                     as last_trained
from profiles p;

grant select on member_overview to authenticated;

-- Where the cohort is weakest, station by station. This is the one
-- that changes what you programme: if sled pull is everyone's worst
-- station, that's a Tuesday problem, not eight individual problems.
drop view if exists public.station_averages cascade;

create view station_averages
with (security_invoker = on) as
select
  s.leg_key,
  count(*)                      as entries,
  round(avg(s.seconds))::int    as avg_s,
  min(s.seconds)                as best_s,
  max(s.seconds)                as worst_s
from half_splits s
join half_sims h on h.id = s.half_sim_id
where s.leg_key not like 'r%'
group by s.leg_key;

grant select on station_averages to authenticated;


-- ============================================================
--  08_leaderboards.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — leaderboards
--
--  The Board tab stops being one hardcoded list. Boards become
--  rows: which ones exist, what they're built from, whether a
--  low number or a high one wins, and what order they appear in.
--
--  Sharing stays opt-in throughout. A member who hasn't switched
--  it on appears on no board, however the boards are configured.
--
--  Run after 07_coach_view.sql. Safe to re-run.
-- ============================================================

create table if not exists leaderboards (
  id        uuid primary key default gen_random_uuid(),
  key       text unique not null,
  label     text not null,
  note      text,
  source    text not null,              -- 'half' or a benchmarks.key
  lower_wins boolean default true,      -- times: yes. kilos: no.
  unit      text,                       -- 'time' | 'kg' | 'reps'
  ord       integer not null,
  visible   boolean default true
);

alter table leaderboards enable row level security;

drop policy if exists "read leaderboards" on leaderboards;
create policy "read leaderboards" on leaderboards
  for select to authenticated using (true);

drop policy if exists "admin writes leaderboards" on leaderboards;
create policy "admin writes leaderboards" on leaderboards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into leaderboards (key, label, note, source, lower_wins, unit, ord, visible) values
  ('half',  'The Salus Half', 'Projected finish from the week 1 half.', 'half',  true,  'time', 1, true),
  ('fivek', '5km',            'The week 1 time trial.',                  'fivek', true,  'time', 2, true),
  ('squat', 'Back Squat 5RM', 'Heaviest five held at depth.',            'squat', false, 'kg',   3, true),
  ('ski',   '1,000m SkiErg',  'Fresh, all out.',                         'ski',   true,  'time', 4, true),
  ('row',   '1,000m Row',     'Fresh, all out.',                         'row',   true,  'time', 5, false)
on conflict (key) do nothing;

-- ============================================================
--  One view for every benchmark board.
--
--  Only members who opted in appear, and only their name and
--  number are exposed — never the user id.
-- ============================================================
drop view if exists public.leaderboard_benchmarks cascade;

create view leaderboard_benchmarks
with (security_invoker = on) as
select
  b.key           as board_key,
  p.name          as name,
  b.value_num     as value_num,
  b.value_s       as value_s,
  b.week          as week
from benchmarks b
join profiles p on p.id = b.user_id
where p.share_on_leaderboard = true
  and p.name is not null
  and b.week = 1
  and (b.value_num is not null or b.value_s is not null);

grant select on leaderboard_benchmarks to authenticated;

-- The half board already exists from 02_schema as leaderboard_half.
-- Recreated here so both boards read the same way.
drop view if exists public.leaderboard_half cascade;

create view leaderboard_half
with (security_invoker = on) as
select
  p.name         as name,
  h.projected_s  as projected_s,
  h.total_s      as total_s,
  h.week_idx     as week_idx
from half_sims h
join profiles p on p.id = h.user_id
where p.share_on_leaderboard = true
  and p.name is not null
  and h.projected_s is not null;

grant select on leaderboard_half to authenticated;

-- ============================================================
--  What a coach sees: everyone, sharing or not, so you know who
--  is missing from the board and why.
-- ============================================================
drop view if exists public.leaderboard_admin cascade;

create view leaderboard_admin
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.share_on_leaderboard as sharing,
  (select h.projected_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1) as projected_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'fivek' and b.week = 1) as fivek_s,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'squat' and b.week = 1) as squat_kg
from profiles p
where p.role is distinct from 'admin';

grant select on leaderboard_admin to authenticated;


-- ============================================================
--  09_programmes.sql
-- ============================================================

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


-- ============================================================
--  10_media.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the splash media, from the back office
--
--  The login video and its poster were filenames in the code.
--  They become config rows, so a new film is an upload and a
--  click rather than a deploy.
--
--  Run after 09_programmes.sql. Safe to re-run.
-- ============================================================

insert into config (key, value) values
  ('splash_video',  ''),   -- empty = fall back to the photo alone
  ('splash_poster', ''),   -- the still underneath, so it never shows black
  ('logo_url',      '')    -- the mark, light on transparent
on conflict (key) do nothing;


-- ============================================================
--  11_score.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the Salus Score
--
--  Five tests, each scored 0–100 against a fixed standard, then
--  averaged. One number for overall fitness.
--
--  Fixed standards rather than a curve against the club, on
--  purpose. Scored against the best member, everyone's number
--  drops whenever someone new posts a big squat — you'd train
--  for eight weeks and watch your score fall. Against a fixed
--  target, your score only moves when you do.
--
--  The standards are rows, not code, so a coach can argue with
--  them and change them.
--
--  Run after 10_media.sql. Safe to re-run.
-- ============================================================

create table if not exists test_standards (
  id        uuid primary key default gen_random_uuid(),
  key       text not null,          -- squat | fivek | ski | row | half
  sex       text not null,          -- 'm' | 'f'
  label     text not null,
  floor_v   numeric not null,       -- scores 0
  target_v  numeric not null,       -- scores 100
  lower_wins boolean default true,  -- times yes, ratios no
  per_kg    boolean default false,  -- score relative to bodyweight
  unit      text,                   -- 'time' | 'ratio' | 'kg'
  ord       integer not null,
  active    boolean default true,
  unique (key, sex)
);

alter table test_standards enable row level security;

drop policy if exists "read test_standards" on test_standards;
create policy "read test_standards" on test_standards
  for select to authenticated using (true);

drop policy if exists "admin writes test_standards" on test_standards;
create policy "admin writes test_standards" on test_standards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- opening standards ----------
-- Floor is "just started". Target is "genuinely strong for the Open
-- category". Deliberately not elite: a score of 100 should be
-- achievable by a good club athlete, or nobody engages with it.
insert into test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord) values
  -- squat scored per kilo of bodyweight, so it isn't just a heavy-person board
  ('squat', 'm', 'Back squat',      0.75,  1.75, false, true,  'ratio', 1),
  ('squat', 'f', 'Back squat',      0.60,  1.40, false, true,  'ratio', 1),
  ('fivek', 'm', '5km',             1800,  1200, true,  false, 'time',  2),
  ('fivek', 'f', '5km',             2040,  1380, true,  false, 'time',  2),
  ('ski',   'm', '1,000m SkiErg',    285,   210, true,  false, 'time',  3),
  ('ski',   'f', '1,000m SkiErg',    330,   245, true,  false, 'time',  3),
  ('row',   'm', '1,000m Row',       270,   200, true,  false, 'time',  4),
  ('row',   'f', '1,000m Row',       310,   235, true,  false, 'time',  4),
  ('half',  'm', 'The Salus Half',  3300,  2160, true,  false, 'time',  5),
  ('half',  'f', 'The Salus Half',  3720,  2520, true,  false, 'time',  5)
on conflict (key, sex) do nothing;

-- ---------- profiles need a sex for the standards to apply ----------
alter table profiles add column if not exists sex text;

-- ============================================================
--  The score itself.
--
--  Each test lands somewhere between floor and target and is
--  clamped to 0–100. The overall is the mean of whatever they
--  have done, so a member with three tests still gets a number —
--  it just says how many it is out of.
-- ============================================================
drop function if exists public.salus_score(uuid) cascade;

create function public.salus_score(p_user uuid)
returns table (
  key       text,
  label     text,
  raw       numeric,
  score     numeric,
  unit      text,
  ord       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select p.id,
           coalesce(p.sex, 'm') as sex,
           (select b.value_num from public.benchmarks b
              where b.user_id = p.id and b.key = 'bw' and b.week = 1) as bw
    from public.profiles p where p.id = p_user
  ),
  raw as (
    select 'squat'::text as key,
           (select b.value_num from public.benchmarks b
              where b.user_id = p_user and b.key = 'squat' and b.week = 1) as v
    union all
    select 'fivek',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'fivek' and b.week = 1)
    union all
    select 'ski',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'ski' and b.week = 1)
    union all
    select 'row',
           (select b.value_s from public.benchmarks b
              where b.user_id = p_user and b.key = 'row' and b.week = 1)
    union all
    select 'half',
           (select h.total_s from public.half_sims h
              where h.user_id = p_user and h.week_idx = 1)
  )
  select
    s.key::text,
    s.label::text,
    r.v::numeric as raw,
    round(
      greatest(0, least(100,
        case
          -- per_kg tests compare the ratio, not the absolute number
          when s.per_kg then
            case when me.bw is null or me.bw = 0 then null
                 else ((r.v / me.bw) - s.floor_v) / (s.target_v - s.floor_v) * 100
            end
          when s.lower_wins then
            (s.floor_v - r.v) / (s.floor_v - s.target_v) * 100
          else
            (r.v - s.floor_v) / (s.target_v - s.floor_v) * 100
        end
      )), 0)::numeric as score,
    s.unit::text,
    s.ord::integer
  from raw r
  join me on true
  join public.test_standards s
    on s.key = r.key and s.sex = me.sex and s.active
  where r.v is not null
  order by s.ord;
$$;

grant execute on function public.salus_score(uuid) to authenticated;

-- ============================================================
--  A leaderboard of overall scores.
--  Opt-in as ever — a member who hasn't shared appears on none.
-- ============================================================
drop view if exists public.leaderboard_score cascade;

create view leaderboard_score
with (security_invoker = on) as
select
  p.id,
  p.name,
  (select round(avg(s.score)) from public.salus_score(p.id) s)  as score,
  (select count(*) from public.salus_score(p.id) s)             as tests
from profiles p
where p.share_on_leaderboard = true
  and p.name is not null
  and p.role is distinct from 'admin';

grant select on leaderboard_score to authenticated;

-- ---------- add it as a board ----------
insert into leaderboards (key, label, note, source, lower_wins, unit, ord, visible)
values ('score', 'Salus Score',
        'All five tests, scored out of 100 and averaged. Fixed standards, so it only moves when you do.',
        'score', false, 'score', 0, true)
on conflict (key) do nothing;


-- ============================================================
--  12_dashboard.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the dashboard
--
--  Two views. One for what the coaches should look at, one for
--  what needs doing about it.
--
--  Run after 11_score.sql. Safe to re-run.
-- ============================================================

-- ---------- what's been logged lately ----------
drop view if exists public.recent_activity cascade;

create view recent_activity
with (security_invoker = on) as
select
  w.id,
  w.user_id,
  p.name,
  s.title       as session_title,
  s.day,
  wk.idx        as week_idx,
  pr.name       as programme,
  w.started_at,
  w.ended_at,
  w.elapsed_s,
  w.effort
from workout_logs w
join profiles p    on p.id = w.user_id
left join sessions s on s.id = w.session_id
left join weeks wk   on wk.id = s.week_id
left join programmes pr on pr.id = wk.programme_id
order by w.started_at desc;

grant select on recent_activity to authenticated;

-- ---------- sessions that aren't finished being written ----------
-- A session with no blocks looks complete in the week grid but opens
-- to nothing on a member's phone. Worth knowing before they find out.
drop view if exists public.sessions_needing_work cascade;

create view sessions_needing_work
with (security_invoker = on) as
select
  s.id,
  s.title,
  s.day,
  s.kind,
  wk.idx          as week_idx,
  wk.published,
  pr.name         as programme,
  pr.id           as programme_id,
  (select count(*) from blocks b where b.session_id = s.id)        as blocks,
  (select count(*) from block_items bi
     join blocks b2 on b2.id = bi.block_id
     where b2.session_id = s.id)                                    as loggable,
  (s.cover_url is null)                                             as no_photo
from sessions s
join weeks wk on wk.id = s.week_id
join programmes pr on pr.id = wk.programme_id
where s.kind <> 'rest';

grant select on sessions_needing_work to authenticated;

-- ---------- the club view needs to know which programme a member is on ----------
-- Dropped first: Postgres can append a column to a view but not insert
-- one in the middle, and programme_id belongs next to the other profile
-- fields rather than tacked on the end.
drop view if exists public.member_overview cascade;

create view member_overview
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.race_date,
  p.race_division,
  p.role,
  p.programme_id,
  p.created_at,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'squat' and b.week = 1)  as squat_kg,
  (select b.value_num from benchmarks b
     where b.user_id = p.id and b.key = 'bw' and b.week = 1)     as bodyweight_kg,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'fivek' and b.week = 1)  as fivek_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'ski' and b.week = 1)    as ski_s,
  (select b.value_s from benchmarks b
     where b.user_id = p.id and b.key = 'row' and b.week = 1)    as row_s,
  (select count(*) from benchmarks b
     where b.user_id = p.id and b.week = 1)                      as tests_done,
  (select h.total_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as half_s,
  (select h.projected_s from half_sims h
     where h.user_id = p.id and h.week_idx = 1)                  as projected_s,
  (select count(*) from workout_logs w
     where w.user_id = p.id and w.ended_at is not null)          as sessions_done,
  (select max(w.ended_at) from workout_logs w
     where w.user_id = p.id)                                     as last_trained
from profiles p;

grant select on member_overview to authenticated;


-- ============================================================
--  13_programme_delete.sql
-- ============================================================

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


-- ============================================================
--  14_salus_leaderboard.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the Salus Leaderboard
--
--  Ranked the way ATHX ranks: a placing in each of the five
--  tests, ranks added up, lowest total wins.
--
--  Why ranks rather than points against a standard: a
--  leaderboard is relative by definition. Being 4th is the
--  fact — the gap in seconds isn't what anyone is arguing
--  about in the room. Ranking also handles the mixed units
--  cleanly, which points never quite do.
--
--  The Salus Score stays as it is, on You. That one is scored
--  against fixed standards so it only moves when the member
--  does, which is what a progress measure needs and a
--  leaderboard doesn't.
--
--  A test not done takes last place, so someone with three of
--  five sinks rather than being flattered by the average of
--  what they did do. Same as a DNF.
--
--  Every table is schema-qualified. Supabase's SQL editor
--  doesn't always run with public on the search path, and an
--  unqualified name fails with "relation does not exist" in a
--  way that looks like the table is missing when it isn't.
--
--  Run after 13_programme_delete.sql. Safe to re-run.
-- ============================================================

drop view if exists public.salus_leaderboard cascade;

create view public.salus_leaderboard
with (security_invoker = on) as
with shared as (
  select
    p.id,
    p.name,
    coalesce(p.sex, 'm') as sex,
    (select b.value_num from public.benchmarks b
       where b.user_id = p.id and b.key = 'bw' and b.week = 1) as bw
  from public.profiles p
  where p.share_on_leaderboard = true
    and p.name is not null
    and p.role is distinct from 'admin'
),
raw as (
  select
    s.id, s.name, s.sex,
    -- squat relative to bodyweight, or it's just a board for heavy people
    case when s.bw > 0 then
      (select b.value_num from public.benchmarks b
         where b.user_id = s.id and b.key = 'squat' and b.week = 1) / s.bw
    end as squat,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'fivek' and b.week = 1) as fivek,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'ski' and b.week = 1)   as ski,
    (select b.value_s from public.benchmarks b
       where b.user_id = s.id and b.key = 'row' and b.week = 1)   as row_s,
    (select h.total_s from public.half_sims h
       where h.user_id = s.id and h.week_idx = 1)                 as half
  from shared s
),
ranked as (
  select
    r.*,
    rank() over (order by r.squat  desc nulls last) as r_squat,
    rank() over (order by r.fivek  asc  nulls last) as r_fivek,
    rank() over (order by r.ski    asc  nulls last) as r_ski,
    rank() over (order by r.row_s  asc  nulls last) as r_row,
    rank() over (order by r.half   asc  nulls last) as r_half,
    (r.squat is not null)::int
      + (r.fivek is not null)::int
      + (r.ski   is not null)::int
      + (r.row_s is not null)::int
      + (r.half  is not null)::int as tests_done
  from raw r
)
select
  id, name, sex,
  squat, fivek, ski, row_s, half,
  r_squat, r_fivek, r_ski, r_row, r_half,
  tests_done,
  (r_squat + r_fivek + r_ski + r_row + r_half) as points,
  -- "place", not "position": position is a reserved word in Postgres.
  rank() over (
    order by (r_squat + r_fivek + r_ski + r_row + r_half) asc,
             tests_done desc
  ) as place
from ranked;

grant select on public.salus_leaderboard to authenticated;

-- ---------- one member's card, with their five placings ----------
drop function if exists public.my_leaderboard_row(uuid) cascade;

create function public.my_leaderboard_row(p_user uuid)
returns table (
  place      bigint,
  points     bigint,
  tests_done integer,
  field      bigint,
  r_squat    bigint,
  r_fivek    bigint,
  r_ski      bigint,
  r_row      bigint,
  r_half     bigint,
  squat      numeric,
  fivek      integer,
  ski        integer,
  row_s      integer,
  half       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.place::bigint, l.points::bigint, l.tests_done::integer,
    (select count(*) from public.salus_leaderboard)::bigint,
    l.r_squat::bigint, l.r_fivek::bigint, l.r_ski::bigint,
    l.r_row::bigint, l.r_half::bigint,
    l.squat::numeric, l.fivek::integer, l.ski::integer,
    l.row_s::integer, l.half::integer
  from public.salus_leaderboard l
  where l.id = p_user;
$$;

grant execute on function public.my_leaderboard_row(uuid) to authenticated;

-- ---------- make it the main board ----------
update public.leaderboards
   set label      = 'Salus Leaderboard',
       note       = 'Your placing in each of the five tests, added up. Lowest wins.',
       source     = 'salus',
       unit       = 'points',
       lower_wins = true,
       ord        = 0,
       visible    = true
 where key = 'score';

insert into public.leaderboards
  (key, label, note, source, lower_wins, unit, ord, visible)
values
  ('salus', 'Salus Leaderboard',
   'Your placing in each of the five tests, added up. Lowest wins.',
   'salus', true, 'points', 0, true)
on conflict (key) do update set
  label      = excluded.label,
  note       = excluded.note,
  source     = excluded.source,
  unit       = excluded.unit,
  lower_wins = excluded.lower_wins,
  ord        = excluded.ord,
  visible    = excluded.visible;


-- ============================================================
--  15_rearrange.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — a member can move their own week
--
--  Sessions are written to a day, but a member's week isn't the
--  coach's week. Someone works Tuesdays, someone's kid is ill on
--  Thursday. Right now they skip the session and it's gone.
--
--  This lets them move sessions around within their own week
--  without touching what the coach wrote — an override per
--  member, per session, not an edit to the programme.
--
--  Run after 14_salus_leaderboard.sql. Safe to re-run.
-- ============================================================

create table if not exists session_moves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  session_id  uuid references public.sessions on delete cascade not null,
  day         integer not null check (day between 1 and 7),
  moved_at    timestamptz default now(),
  unique (user_id, session_id)
);

alter table public.session_moves enable row level security;

drop policy if exists "own moves read"   on public.session_moves;
drop policy if exists "own moves write"  on public.session_moves;
drop policy if exists "own moves update" on public.session_moves;
drop policy if exists "own moves delete" on public.session_moves;

create policy "own moves read"   on public.session_moves
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own moves write"  on public.session_moves
  for insert with check (auth.uid() = user_id);
create policy "own moves update" on public.session_moves
  for update using (auth.uid() = user_id);
create policy "own moves delete" on public.session_moves
  for delete using (auth.uid() = user_id);

-- ---------- a member's week, with their moves applied ----------
drop function if exists public.my_week(uuid) cascade;

create function public.my_week(p_week uuid)
returns table (
  id         uuid,
  day        integer,
  coach_day  integer,
  moved      boolean,
  slot       integer,
  title      text,
  tag        text,
  kind       text,
  est_min    integer,
  is_test    boolean,
  body       text,
  cover_url  text,
  video_url  text,
  focus      text,
  coach_id   uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    coalesce(m.day, s.day)::integer as day,
    s.day::integer                  as coach_day,
    (m.day is not null and m.day <> s.day)::boolean as moved,
    coalesce(s.slot, 1)::integer as slot,
    s.title::text, s.tag::text, s.kind::text, s.est_min::integer,
    s.is_test::boolean, s.body::text, s.cover_url::text,
    s.video_url::text, s.focus::text, s.coach_id::uuid
  from public.sessions s
  left join public.session_moves m
    on m.session_id = s.id and m.user_id = auth.uid()
  where s.week_id = p_week
  order by coalesce(m.day, s.day), coalesce(s.slot, 1);
$$;

grant execute on function public.my_week(uuid) to authenticated;

-- ---------- save a whole rearrangement in one go ----------
-- One call rather than seven, so a half-applied week can't happen
-- if the connection drops between two of them.
drop function if exists public.rearrange_week(uuid, uuid[], integer[]) cascade;

create function public.rearrange_week(
  p_week    uuid,
  p_session uuid[],
  p_day     integer[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if array_length(p_session, 1) is distinct from array_length(p_day, 1) then
    raise exception 'mismatched arrays';
  end if;

  for i in 1 .. coalesce(array_length(p_session, 1), 0) loop
    insert into public.session_moves (user_id, session_id, day)
    values (auth.uid(), p_session[i], p_day[i])
    on conflict (user_id, session_id)
      do update set day = excluded.day, moved_at = now();
  end loop;
end;
$$;

grant execute on function public.rearrange_week(uuid, uuid[], integer[])
  to authenticated;

-- ---------- put it back the way the coach wrote it ----------
drop function if exists public.reset_week(uuid) cascade;

create function public.reset_week(p_week uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.session_moves m
  using public.sessions s
  where m.session_id = s.id
    and s.week_id = p_week
    and m.user_id = auth.uid();
$$;

grant execute on function public.reset_week(uuid) to authenticated;


-- ============================================================
--  16_progress.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — progress
--
--  The app logs sets but never shows anyone they're getting
--  stronger, which is most of the reason to log at all.
--
--  Estimated 1RM uses Epley: weight × (1 + reps/30). It's a
--  formula, not a measurement — reasonable to about six reps
--  and increasingly optimistic beyond that. Shown as "e1RM"
--  rather than "1RM" for that reason.
--
--  Run after 15_rearrange.sql. Safe to re-run.
-- ============================================================

-- ---------- what a member has done, per movement ----------
drop view if exists public.movement_history cascade;

create view public.movement_history
with (security_invoker = on) as
select
  w.user_id,
  m.id                as movement_id,
  m.name              as movement,
  w.started_at::date  as on_date,
  max(sl.kg)                                          as top_kg,
  max(sl.kg * (1 + sl.reps / 30.0))                   as e1rm,
  sum(sl.reps * sl.kg)                                as volume,
  count(*)                                            as sets
from public.set_logs sl
join public.workout_logs w   on w.id = sl.workout_log_id
join public.block_items bi   on bi.id = sl.block_item_id
join public.movements m      on m.id = bi.movement_id
where sl.done = true and sl.kg > 0 and sl.reps > 0
group by w.user_id, m.id, m.name, w.started_at::date;

grant select on public.movement_history to authenticated;

-- ---------- the summary at the top ----------
drop function if exists public.my_activity(uuid, date) cascade;

create function public.my_activity(p_user uuid, p_since date default null)
returns table (
  sessions   bigint,
  minutes    bigint,
  volume     numeric,
  sets       bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.workout_logs w
       where w.user_id = p_user and w.ended_at is not null
         and (p_since is null or w.started_at::date >= p_since))::bigint,
    (select coalesce(sum(w.elapsed_s), 0) / 60 from public.workout_logs w
       where w.user_id = p_user and w.ended_at is not null
         and (p_since is null or w.started_at::date >= p_since))::bigint,
    (select coalesce(sum(sl.reps * sl.kg), 0) from public.set_logs sl
       join public.workout_logs w on w.id = sl.workout_log_id
       where w.user_id = p_user and sl.done = true
         and (p_since is null or w.started_at::date >= p_since))::numeric,
    (select count(*) from public.set_logs sl
       join public.workout_logs w on w.id = sl.workout_log_id
       where w.user_id = p_user and sl.done = true
         and (p_since is null or w.started_at::date >= p_since))::bigint;
$$;

grant execute on function public.my_activity(uuid, date) to authenticated;

-- ---------- every movement, with its best and its trend ----------
drop function if exists public.my_movements(uuid) cascade;

create function public.my_movements(p_user uuid)
returns table (
  movement    text,
  best_e1rm   numeric,
  best_kg     numeric,
  last_date   date,
  points      numeric[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    h.movement::text,
    max(h.e1rm)::numeric   as best_e1rm,
    max(h.top_kg)::numeric as best_kg,
    max(h.on_date)::date   as last_date,
    array_agg(h.e1rm order by h.on_date)::numeric[] as points
  from public.movement_history h
  where h.user_id = p_user
  group by h.movement
  order by max(h.on_date) desc;
$$;

grant execute on function public.my_movements(uuid) to authenticated;


-- ============================================================
--  17_session_video.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — a coach explaining the session
--
--  A written coach's note tells you the standard. A coach
--  saying it tells you the intent, and it's the closest thing
--  to them being in the room at six in the morning.
--
--  Also adds a focus — the one movement the session is really
--  about — because "Lower A" doesn't say what today is for.
--
--  Run after 16_progress.sql. Safe to re-run.
-- ============================================================

alter table public.sessions add column if not exists video_url text;
alter table public.sessions add column if not exists focus text;
alter table public.sessions add column if not exists coach_id uuid
  references public.coaches on delete set null;

-- Coaches need a photo to appear next to their video.
alter table public.coaches add column if not exists photo_url text;

-- ---------- how many people have done this session ----------
-- Not vanity: seeing that forty others have done today's session is
-- the closest a solo 6am member gets to training with the room.
drop view if exists public.session_completions cascade;

create view public.session_completions
with (security_invoker = on) as
select
  s.id as session_id,
  count(distinct w.user_id) as people,
  count(*) as completions
from public.sessions s
join public.workout_logs w on w.session_id = s.id and w.ended_at is not null
group by s.id;

grant select on public.session_completions to authenticated;


-- ============================================================
--  18_community.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the community feed
--
--  A solo member at six in the morning is training alone. The
--  one thing an app can give them that a printed plan can't is
--  the knowledge that eleven other people did the same session
--  this week.
--
--  Opt-in throughout, on the same flag as the leaderboard. A
--  member who hasn't shared appears nowhere, and nothing here
--  exposes a weight, a time or a score — only that somebody
--  trained.
--
--  Run after 17_session_video.sql. Safe to re-run.
-- ============================================================

drop view if exists public.community_feed cascade;

create view public.community_feed
with (security_invoker = on) as
select
  w.id,
  p.name,
  p.id            as user_id,
  s.title         as session_title,
  s.kind,
  wk.idx          as week_idx,
  pr.name         as programme,
  w.ended_at,
  w.effort
from public.workout_logs w
join public.profiles p        on p.id = w.user_id
left join public.sessions s   on s.id = w.session_id
left join public.weeks wk     on wk.id = s.week_id
left join public.programmes pr on pr.id = wk.programme_id
where w.ended_at is not null
  and p.share_on_leaderboard = true
  and p.name is not null
  and w.ended_at > now() - interval '14 days'
order by w.ended_at desc;

grant select on public.community_feed to authenticated;

-- ---------- who's on the same session as you ----------
drop function if exists public.session_company(uuid) cascade;

create function public.session_company(p_session uuid)
returns table (name text, ended_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name::text, max(w.ended_at)::timestamptz
  from public.workout_logs w
  join public.profiles p on p.id = w.user_id
  where w.session_id = p_session
    and w.ended_at is not null
    and p.share_on_leaderboard = true
    and p.name is not null
  group by p.name
  order by max(w.ended_at) desc
  limit 12;
$$;

grant execute on function public.session_company(uuid) to authenticated;

-- ---------- how the club is doing this week ----------
drop function if exists public.club_week() cascade;

create function public.club_week()
returns table (
  sessions  bigint,
  people    bigint,
  minutes   bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint,
    count(distinct w.user_id)::bigint,
    (coalesce(sum(w.elapsed_s), 0) / 60)::bigint
  from public.workout_logs w
  where w.ended_at is not null
    and w.ended_at > date_trunc('week', now());
$$;

grant execute on function public.club_week() to authenticated;


-- ============================================================
--  19_race_image.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the race gets a face
--
--  A countdown to a number is abstract. A countdown over a
--  photograph of the thing you're counting down to isn't —
--  and on a Tuesday in October that difference is most of
--  what gets someone out of the door.
--
--  Lives on the programme, because each block counts down to
--  its own thing: ExCeL for Road to HYROX, a parkrun for the
--  5K block, nothing at all for Reformer.
--
--  Run after 18_community.sql. Safe to re-run.
-- ============================================================

alter table public.programmes add column if not exists race_image text;
alter table public.programmes add column if not exists race_location text;

update public.programmes
   set race_location = 'ExCeL, London'
 where slug = 'road-to-hyrox' and race_location is null;


-- ============================================================
--  20_running.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — running
--
--  HYROX is 8km of running with eight stations in the way, and
--  the app has been treating runs as text. This gives them the
--  same logging strength has.
--
--  Two kinds:
--    straight       — a 5km, a long run, intervals
--    compromised    — run, station, run, station. The whole
--                     point of the race, and the thing nobody
--                     trains until it's too late.
--
--  Not syncing from Strava, deliberately. Their 2026 terms cap
--  storage at a seven-day transient cache and forbid showing a
--  member's data to anyone but themselves — which rules out both
--  eight-week progress and the community feed. Apple Health has
--  neither restriction and arrives free with the native wrapper.
--
--  Run after 19_race_image.sql. Safe to re-run.
-- ============================================================

create table if not exists public.run_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  session_id   uuid references public.sessions on delete set null,
  kind         text default 'straight',   -- straight | compromised | race
  distance_m   integer,
  seconds      integer,
  effort       integer,
  surface      text,                      -- road | treadmill | track | trail
  note         text,
  ran_at       timestamptz default now(),
  created_at   timestamptz default now()
);

alter table public.run_logs enable row level security;

drop policy if exists "own runs read"   on public.run_logs;
drop policy if exists "own runs write"  on public.run_logs;
drop policy if exists "own runs update" on public.run_logs;
drop policy if exists "own runs delete" on public.run_logs;

create policy "own runs read"   on public.run_logs
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own runs write"  on public.run_logs
  for insert with check (auth.uid() = user_id);
create policy "own runs update" on public.run_logs
  for update using (auth.uid() = user_id);
create policy "own runs delete" on public.run_logs
  for delete using (auth.uid() = user_id);

-- ---------- each rep of an interval or compromised session ----------
create table if not exists public.run_splits (
  id          uuid primary key default gen_random_uuid(),
  run_log_id  uuid references public.run_logs on delete cascade not null,
  idx         integer not null,
  distance_m  integer,
  seconds     integer,
  is_station  boolean default false,   -- the work between the runs
  label       text,
  unique (run_log_id, idx)
);

alter table public.run_splits enable row level security;

drop policy if exists "own splits read"  on public.run_splits;
drop policy if exists "own splits write" on public.run_splits;

create policy "own splits read" on public.run_splits
  for select using (exists (
    select 1 from public.run_logs r
    where r.id = run_splits.run_log_id
      and (r.user_id = auth.uid() or public.is_admin())));
create policy "own splits write" on public.run_splits
  for all using (exists (
    select 1 from public.run_logs r
    where r.id = run_splits.run_log_id and r.user_id = auth.uid()));

-- ---------- the sessions table needs running fields ----------
alter table public.sessions add column if not exists run_distance_m integer;
alter table public.sessions add column if not exists run_reps integer;
alter table public.sessions add column if not exists run_pace_pct numeric;
--   run_pace_pct: 1.00 = 5km race pace, 1.10 = 10% slower, 0.95 = faster.
--   Held as a fraction of the member's own tested 5km, so a target pace
--   means the same effort to everyone rather than the same number.

-- ---------- target paces, from their own 5km ----------
--
-- The declared columns and the returned columns have to line up
-- exactly, in order and in type. The previous version listed four
-- columns and returned three, which Postgres reports as a return
-- type mismatch at whichever column first disagrees.
drop function if exists public.my_paces(uuid) cascade;

create function public.my_paces(p_user uuid)
returns table (
  label      text,
  pct        numeric,
  sec_per_km integer,
  note       text
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select (b.value_s / 5.0) as five_k_pace
    from public.benchmarks b
    where b.user_id = p_user and b.key = 'fivek' and b.week = 1
    limit 1
  ),
  bands (label, pct, note) as (
    values
      ('Easy'::text,      1.28::numeric,
       'Conversational. Most of your running should be here.'::text),
      ('Steady',          1.14,
       'Comfortably hard. The pace of a long compromised session.'),
      ('Race pace',       1.06,
       'What 8km inside a HYROX actually feels like.'),
      ('5km',             1.00,
       'Your tested pace, fresh.'),
      ('Interval',        0.94,
       'Faster than 5km. For 400s and 800s.')
  )
  select
    bands.label,
    bands.pct,
    round(base.five_k_pace * bands.pct)::integer,
    bands.note
  from bands
  cross join base
  where base.five_k_pace is not null
  order by bands.pct desc;
$$;

grant execute on function public.my_paces(uuid) to authenticated;

-- ---------- a member's running, for Progress ----------
drop view if exists public.run_history cascade;

create view public.run_history
with (security_invoker = on) as
select
  r.user_id,
  r.ran_at::date            as on_date,
  r.kind,
  r.distance_m,
  r.seconds,
  case when r.distance_m > 0
       then round(r.seconds::numeric / (r.distance_m / 1000.0))
  end                        as sec_per_km
from public.run_logs r
where r.seconds > 0;

grant select on public.run_history to authenticated;


-- ============================================================
--  21_posts.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — posts and kudos
--
--  The feed currently reports that someone trained. This lets
--  them say something about it, and lets everyone else say
--  something back.
--
--  Kept deliberately small: a note, one photo, and kudos. No
--  comments thread, no follows, no notifications. Forty people
--  who see each other in the room don't need a social network —
--  they need a way to acknowledge each other on the days they
--  don't overlap.
--
--  Run after 20_running.sql. Safe to re-run.
-- ============================================================

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  workout_id  uuid references public.workout_logs on delete set null,
  run_id      uuid references public.run_logs on delete set null,
  body        text,
  photo_url   text,
  created_at  timestamptz default now()
);

alter table public.posts enable row level security;

drop policy if exists "read posts"   on public.posts;
drop policy if exists "own posts"    on public.posts;
drop policy if exists "edit posts"   on public.posts;
drop policy if exists "delete posts" on public.posts;

-- Anyone signed in can read; posting is opt-in by being on the feed.
create policy "read posts" on public.posts
  for select to authenticated using (true);
create policy "own posts" on public.posts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "edit posts" on public.posts
  for update to authenticated using (auth.uid() = user_id);
create policy "delete posts" on public.posts
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

-- ---------- kudos ----------
create table if not exists public.kudos (
  post_id   uuid references public.posts on delete cascade not null,
  user_id   uuid references auth.users on delete cascade not null,
  given_at  timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.kudos enable row level security;

drop policy if exists "read kudos"  on public.kudos;
drop policy if exists "give kudos"  on public.kudos;
drop policy if exists "take kudos"  on public.kudos;

create policy "read kudos" on public.kudos
  for select to authenticated using (true);
create policy "give kudos" on public.kudos
  for insert to authenticated with check (auth.uid() = user_id);
create policy "take kudos" on public.kudos
  for delete to authenticated using (auth.uid() = user_id);

-- ---------- the feed, with everything attached ----------
drop view if exists public.post_feed cascade;

create view public.post_feed
with (security_invoker = on) as
select
  p.id,
  p.user_id,
  pr.name,
  p.body,
  p.photo_url,
  p.created_at,
  s.title            as session_title,
  s.kind             as session_kind,
  w.elapsed_s,
  w.effort,
  r.distance_m,
  r.seconds          as run_seconds,
  (select count(*) from public.kudos k where k.post_id = p.id)         as kudos,
  (select count(*) from public.kudos k
     where k.post_id = p.id and k.user_id = auth.uid()) > 0            as mine
from public.posts p
join public.profiles pr           on pr.id = p.user_id
left join public.workout_logs w   on w.id = p.workout_id
left join public.sessions s       on s.id = w.session_id
left join public.run_logs r       on r.id = p.run_id
order by p.created_at desc;

grant select on public.post_feed to authenticated;


-- ============================================================
--  22_prediction.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — predicting a finish before the half
--
--  The projection currently needs a Salus Half. Most members
--  will have done the five tests weeks before they run one,
--  and get nothing in the meantime.
--
--  This predicts from the tests, using the model built for
--  this app and validated against a real HYROX result — 80:01
--  predicted against 80:51 actual, fifty seconds out.
--
--  The half stays the better number. When a member has done
--  one, that's what's shown. This fills the gap before it.
--
--  Run after 21_posts.sql. Safe to re-run.
-- ============================================================

drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k     integer;
  v_ski    integer;
  v_row    integer;
  v_squat  numeric;
  v_bw     numeric;
  v_sex    text;
  v_have   integer := 0;

  -- Riegel, extending a 5km to the 8km run inside a race.
  c_riegel  constant numeric := 1.028;
  -- Erg times inside a race, against fresh.
  c_erg     constant numeric := 1.10;
  -- The eight stations, less the two ergs, as a flat cost. Sled push,
  -- sled pull, burpees, farmers, lunges and wall balls are technique
  -- and grit far more than they are aerobic fitness, and deriving them
  -- from an erg score made the model worse, not better.
  c_rox     constant integer := 330;
  -- Roxzone: the walking between stations. Real, and always underestimated.
  c_zone    constant integer := 330;

  v_run_pace numeric;
  v_run      integer;
  v_stations integer;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_s into v_5k from public.benchmarks b
    where b.user_id = p_user and b.key = 'fivek' and b.week = 1;
  select b.value_s into v_ski from public.benchmarks b
    where b.user_id = p_user and b.key = 'ski' and b.week = 1;
  select b.value_s into v_row from public.benchmarks b
    where b.user_id = p_user and b.key = 'row' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b
    where b.user_id = p_user and b.key = 'squat' and b.week = 1;
  select b.value_num into v_bw from public.benchmarks b
    where b.user_id = p_user and b.key = 'bw' and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int;

  -- The running. Riegel out to 8km, then a penalty for doing it in
  -- eight pieces with a station in between each.
  v_run_pace := (v_5k / 5.0) * c_riegel;
  v_run := round(v_run_pace * 8 * 1.06);

  -- The two ergs, slowed for being done mid-race.
  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- Everything else. A stronger squat helps the sleds a little, but
  -- much less than people expect — Jamie squats 1.5× bodyweight and
  -- his sled push was still bottom third, because it's a technique
  -- problem, not a strength one.
  v_stations := v_stations + c_rox * 6
              - case when v_squat is not null and v_bw > 0
                     then least(90, greatest(-60,
                          round(((v_squat / v_bw) - 1.2) * 110)))
                     else 0 end;

  return query select
    (v_run + v_stations + c_zone)::integer,
    -- Cast explicitly. An untyped literal in a CASE is inferred, and
    -- the inference is what a return-type mismatch reports on.
    (case when v_have >= 4 then 'good'
          when v_have = 3  then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have = 3  then 'from three tests'
          else 'from your 5km alone' end)::text,
    v_run::integer,
    v_stations::integer,
    c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;


-- ============================================================
--  23_programme_race.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the club's race, as a suggestion
--
--  The tile was showing the programme's race name to members
--  who hadn't entered anything, which reads as though they're
--  down for a race they never signed up to.
--
--  Rather than just hiding it, the programme's race becomes a
--  suggested default. Most of the block will be doing HYROX
--  London on the same day, so that's one tap instead of a date
--  picker — and the ones doing Manchester can still say no.
--
--  Run after 22_prediction.sql. Safe to re-run.
-- ============================================================

alter table public.programmes add column if not exists race_date date;

update public.programmes
   set race_date = '2026-12-03'
 where slug = 'road-to-hyrox' and race_date is null;

-- my_programme carries it, so the app can offer it.
drop view if exists public.my_programme cascade;

create view public.my_programme
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
  pr.race_location,
  pr.race_date
from public.profiles p
join public.programmes pr on pr.id = p.programme_id
where p.id = auth.uid();

grant select on public.my_programme to authenticated;


-- ============================================================
--  24_navigation.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the four tabs, and the sections as they are
--
--  The back office was still editing a Today screen that has
--  since become Train, with notices and programmes moved out
--  to Community. This brings the rows in line with what the
--  app actually renders, and adds the tabs themselves.
--
--  Run after 23_programme_race.sql. Safe to re-run.
-- ============================================================

-- ---------- the tabs ----------
create table if not exists public.app_tabs (
  id      uuid primary key default gen_random_uuid(),
  key     text unique not null,     -- what the app routes on; never edited
  label   text not null,            -- what members read
  note    text,
  ord     integer not null,
  visible boolean default true
);

alter table public.app_tabs enable row level security;

drop policy if exists "read app_tabs" on public.app_tabs;
create policy "read app_tabs" on public.app_tabs
  for select to authenticated using (true);

drop policy if exists "admin writes app_tabs" on public.app_tabs;
create policy "admin writes app_tabs" on public.app_tabs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.app_tabs (key, label, note, ord, visible) values
  ('today',       'Train',
   'Today''s session, the week, and where the block is going.', 1, true),
  ('community',   'Community',
   'The board, who''s been in, and the coaches.', 2, true),
  ('leaderboard', 'Leaderboard',
   'The Salus Leaderboard and any other boards you switch on.', 3, true),
  ('me',          'Me',
   'Benchmarks, paces, the Salus Score, and settings.', 4, true)
on conflict (key) do nothing;

-- ---------- the sections, as the app actually renders them ----------
-- The old rows described a screen that no longer exists. Rather than
-- edit them in place, replace the set: a stale row that still toggles
-- something is worse than one that's gone.
delete from public.home_sections
 where key in ('countdown', 'notices', 'programmes');

update public.home_sections
   set label = 'Greeting',
       note  = 'Morning/Afternoon plus their first name.',
       ord   = 1
 where key = 'greeting';

update public.home_sections
   set label = 'The week',
       note  = 'Mon to Sun with dates, and a mark on the days with something on.',
       ord   = 2
 where key = 'daystrip';

update public.home_sections
   set label = 'Today''s session',
       note  = 'The card with every block on it and Start at the bottom.',
       ord   = 4
 where key = 'session';

insert into public.home_sections (key, label, note, ord, visible, heading) values
  ('chips',  'Quick actions',
   'The block, Move my week, Progress, Ask a coach.', 3, true, null),
  ('race',   'The race card',
   'Countdown, the eight-week bar, and the projected finish.', 5, true, null),
  ('streak', 'Streak',
   'Sessions logged in a row, top right.', 6, true, null)
on conflict (key) do update
  set label = excluded.label, note = excluded.note, ord = excluded.ord;

-- ---------- what Community shows ----------
create table if not exists public.community_sections (
  id      uuid primary key default gen_random_uuid(),
  key     text unique not null,
  label   text not null,
  note    text,
  heading text,
  ord     integer not null,
  visible boolean default true
);

alter table public.community_sections enable row level security;

drop policy if exists "read community_sections" on public.community_sections;
create policy "read community_sections" on public.community_sections
  for select to authenticated using (true);

drop policy if exists "admin writes community_sections" on public.community_sections;
create policy "admin writes community_sections" on public.community_sections
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.community_sections (key, label, note, heading, ord, visible) values
  ('week',    'The club this week',
   'Sessions, people and hours across everyone.', null, 1, true),
  ('board',   'The notice board',
   'What you pin from the Notices page.', 'WHAT''S ON AT SALUS', 2, true),
  ('feed',    'Who''s been in',
   'Posts and finished sessions. Opt-in — nobody appears unless they share.',
   'WHO''S BEEN IN', 3, true),
  ('coaches', 'The coaches',
   'A row of faces, tappable to message.', 'THE COACHES', 4, true)
on conflict (key) do nothing;


-- ============================================================
--  25_races.sql
-- ============================================================

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


-- ============================================================
--  26_race_catalog.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — a catalogue of real races
--
--  Members were typing race names and dates by hand, which
--  means five spellings of the same event and at least one
--  wrong date. This gives them a list to pick from.
--
--  Sources and dates:
--    ATHX  — athxgames.com, read 31 August 2026. Official.
--    HYROX — hyroxlab.com, an independent tracker that states
--            it verifies against hyrox.com; last verified there
--            6 July 2026. HYROX publishes the second half of a
--            season a few months late, so spring 2027 dates are
--            not out yet and aren't guessed at here.
--
--  Multi-day events are stored as their first day. A member
--  racing the Saturday of a Wednesday-to-Sunday event can
--  adjust their own copy — this table is the fixture list, not
--  their entry.
--
--  Run after 25_races.sql. Safe to re-run.
-- ============================================================

create table if not exists public.race_catalog (
  id         uuid primary key default gen_random_uuid(),
  series     text not null,              -- HYROX | ATHX
  name       text not null,
  race_date  date not null,
  end_date   date,
  venue      text,
  city       text,
  country    text,
  region     text,                       -- Europe, UK, North America…
  url        text,
  active     boolean default true,
  unique (series, name, race_date)
);

create index if not exists race_catalog_date on public.race_catalog (race_date);

alter table public.race_catalog enable row level security;

drop policy if exists "read race_catalog" on public.race_catalog;
create policy "read race_catalog" on public.race_catalog
  for select to authenticated using (true);

drop policy if exists "admin writes race_catalog" on public.race_catalog;
create policy "admin writes race_catalog" on public.race_catalog
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  HYROX 2026/27
-- ============================================================
insert into public.race_catalog
  (series, name, race_date, end_date, venue, city, country, region) values
  -- August 2026
  ('HYROX','HYROX Istanbul','2026-08-01','2026-08-02',null,'Istanbul','Turkey','Europe'),
  ('HYROX','HYROX Chengdu','2026-08-01','2026-08-02',null,'Chengdu','China','Asia-Pacific'),
  ('HYROX','HYROX Chiba','2026-08-06','2026-08-09',null,'Chiba','Japan','Asia-Pacific'),
  ('HYROX','HYROX Shenzhen','2026-08-15','2026-08-16',null,'Shenzhen','China','Asia-Pacific'),
  ('HYROX','AirAsia HYROX Perth','2026-08-21','2026-08-23',null,'Perth','Australia','Asia-Pacific'),
  -- September 2026
  ('HYROX','Amazfit HYROX Washington D.C.','2026-09-03','2026-09-07',null,'Washington, D.C.','USA','North America'),
  ('HYROX','HYROX Tenerife','2026-09-04','2026-09-06',null,'Tenerife','Spain','Europe'),
  ('HYROX','HYROX Beijing','2026-09-12','2026-09-13',null,'Beijing','China','Asia-Pacific'),
  ('HYROX','HYROX Maastricht','2026-09-17','2026-09-20','MECC Maastricht','Maastricht','Netherlands','Europe'),
  ('HYROX','HYROX Salt Lake City','2026-09-18','2026-09-20',null,'Salt Lake City','USA','North America'),
  ('HYROX','HYROX Rome','2026-09-23','2026-09-27',null,'Rome','Italy','Europe'),
  ('HYROX','HYROX Oslo','2026-09-25','2026-09-27',null,'Oslo','Norway','Europe'),
  ('HYROX','HYROX Bordeaux','2026-09-30','2026-10-04',null,'Bordeaux','France','Europe'),
  -- October 2026
  ('HYROX','HYROX Toronto','2026-10-01','2026-10-04',null,'Toronto','Canada','North America'),
  ('HYROX','HYROX Karlsruhe','2026-10-01','2026-10-04','Messe Karlsruhe','Karlsruhe','Germany','Europe'),
  ('HYROX','HYROX Boston','2026-10-08','2026-10-11',null,'Boston','USA','North America'),
  ('HYROX','Let''s Go Fitness HYROX Geneva','2026-10-09','2026-10-11',null,'Geneva','Switzerland','Europe'),
  ('HYROX','HYROX Gdansk','2026-10-10','2026-10-11',null,'Gdansk','Poland','Europe'),
  ('HYROX','HYROX Valencia','2026-10-15','2026-10-18',null,'Valencia','Spain','Europe'),
  ('HYROX','HYROX Sao Paulo','2026-10-17',null,null,'Sao Paulo','Brazil','South America'),
  ('HYROX','HYROX Tampa','2026-10-23','2026-10-25',null,'Tampa','USA','North America'),
  ('HYROX','HYROX Birmingham','2026-10-27','2026-11-01',null,'Birmingham','UK','UK'),
  ('HYROX','HYROX Nice','2026-10-29','2026-11-01',null,'Nice','France','Europe'),
  ('HYROX','HYROX Shanghai','2026-10-31','2026-11-01',null,'Shanghai','China','Asia-Pacific'),
  -- November 2026
  ('HYROX','HYROX Dusseldorf','2026-11-11','2026-11-15','Merkur Spiel-Arena','Dusseldorf','Germany','Europe'),
  ('HYROX','HYROX Barcelona','2026-11-11','2026-11-15',null,'Barcelona','Spain','Europe'),
  ('HYROX','HYROX Denver','2026-11-12','2026-11-15',null,'Denver','USA','North America'),
  ('HYROX','HYROX Seoul','2026-11-14','2026-11-15',null,'Seoul','South Korea','Asia-Pacific'),
  ('HYROX','HYROX Dallas','2026-11-18','2026-11-22',null,'Dallas','USA','North America'),
  ('HYROX','HYROX Poznan','2026-11-20','2026-11-22',null,'Poznan','Poland','Europe'),
  ('HYROX','HYROX Guangzhou','2026-11-21','2026-11-22',null,'Guangzhou','China','Asia-Pacific'),
  ('HYROX','HYROX Utrecht','2026-11-26','2026-11-30','Jaarbeurs Utrecht','Utrecht','Netherlands','Europe'),
  -- December 2026
  ('HYROX','HYROX London','2026-12-02','2026-12-06','ExCeL London','London','UK','UK'),
  ('HYROX','HYROX Anaheim','2026-12-03','2026-12-06',null,'Anaheim','USA','North America'),
  ('HYROX','HYROX Milan','2026-12-05','2026-12-06','Rho Fiera Milano','Milan','Italy','Europe'),
  ('HYROX','HYROX Frankfurt','2026-12-10','2026-12-13',null,'Frankfurt','Germany','Europe'),
  ('HYROX','HYROX Nashville','2026-12-10','2026-12-13',null,'Nashville','USA','North America'),
  ('HYROX','HYROX Paris','2026-12-12','2026-12-20',null,'Paris','France','Europe'),
  ('HYROX','HYROX Gent','2026-12-17','2026-12-20',null,'Gent','Belgium','Europe'),
  ('HYROX','HYROX Helsinki','2026-12-18','2026-12-20',null,'Helsinki','Finland','Europe'),
  ('HYROX','HYROX Vancouver','2026-12-18','2026-12-20',null,'Vancouver','Canada','North America')
on conflict (series, name, race_date) do nothing;

-- ============================================================
--  ATHX — the rest of 2026, and all of 2027
-- ============================================================
insert into public.race_catalog
  (series, name, race_date, end_date, venue, city, country, region) values
  -- 2026
  ('ATHX','ATHX Barcelona 2026','2026-09-05',null,'Fira Barcelona','Barcelona','Spain','Europe'),
  ('ATHX','ATHX Marseille 2026','2026-09-19',null,'Marseille Chanot','Marseille','France','Europe'),
  ('ATHX','ATHX Liverpool 2026','2026-10-03','2026-10-04','Exhibition Centre Liverpool','Liverpool','UK','UK'),
  ('ATHX','ATHX Miami 2026','2026-10-10',null,'Miami Beach Convention Center','Miami','USA','North America'),
  ('ATHX','ATHX Houston 2026','2026-10-17',null,'Reliant Park','Houston','USA','North America'),
  ('ATHX','ATHX Amsterdam 2026','2026-11-07',null,'RAI Amsterdam','Amsterdam','Netherlands','Europe'),
  ('ATHX','ATHX Los Angeles 2026','2026-11-07',null,'Long Beach Convention Center','Los Angeles','USA','North America'),
  ('ATHX','ATHX Finals 2026','2026-11-27','2026-11-29','Lisbon Exhibition & Congress Centre','Lisbon','Portugal','Europe'),
  -- 2027
  ('ATHX','ATHX London 2027','2027-01-23','2027-01-24','ExCeL London','London','UK','UK'),
  ('ATHX','ATHX Paris 2027','2027-02-13','2027-02-14','Paris Event Centre','Paris','France','Europe'),
  ('ATHX','ATHX Valencia 2027','2027-02-20',null,'Feria Valencia','Valencia','Spain','Europe'),
  ('ATHX','ATHX Milan 2027','2027-03-06','2027-03-07','Fiera Milano','Milan','Italy','Europe'),
  ('ATHX','ATHX Brussels 2027','2027-03-20',null,'Brussels Expo','Brussels','Belgium','Europe'),
  ('ATHX','ATHX St Gallen 2027','2027-04-10',null,'Olma Messen St. Gallen','St Gallen','Switzerland','Europe'),
  ('ATHX','ATHX Stuttgart 2027','2027-04-17',null,'Messe Stuttgart','Stuttgart','Germany','Europe'),
  ('ATHX','ATHX Vienna 2027','2027-04-24',null,'Marx Halle','Vienna','Austria','Europe'),
  ('ATHX','ATHX Madrid 2027','2027-05-08','2027-05-09','IFEMA Madrid','Madrid','Spain','Europe'),
  ('ATHX','ATHX Frankfurt 2027','2027-05-22',null,'Messe Frankfurt','Frankfurt','Germany','Europe'),
  ('ATHX','ATHX Montpellier 2027','2027-05-28','2027-05-29','Montpellier Exhibition Centre','Montpellier','France','Europe'),
  ('ATHX','ATHX Glasgow 2027','2027-06-05','2027-06-06','The Scottish Event Campus','Glasgow','UK','UK'),
  ('ATHX','ATHX Dublin 2027','2027-06-12','2027-06-13','RDS Dublin','Dublin','Ireland','Europe'),
  ('ATHX','ATHX Lisbon 2027','2027-06-26','2027-06-27','Feira Internacional de Lisboa','Lisbon','Portugal','Europe'),
  ('ATHX','ATHX Copenhagen 2027','2027-07-31','2027-08-01','Bella Centre','Copenhagen','Denmark','Europe'),
  ('ATHX','ATHX Berlin 2027','2027-08-14','2027-08-15','Arena Halle Berlin','Berlin','Germany','Europe'),
  ('ATHX','ATHX Birmingham 2027','2027-08-20','2027-08-22','NEC Birmingham','Birmingham','UK','UK'),
  ('ATHX','ATHX Hamburg 2027','2027-08-28',null,'Hamburg Messe','Hamburg','Germany','Europe'),
  ('ATHX','ATHX Marseille 2027','2027-09-10','2027-09-11','Marseille Chanot','Marseille','France','Europe'),
  ('ATHX','ATHX Turin 2027','2027-09-25',null,'Lingotto Fiere','Turin','Italy','Europe'),
  ('ATHX','ATHX Amsterdam 2027','2027-10-02','2027-10-03','RAI Amsterdam','Amsterdam','Netherlands','Europe'),
  ('ATHX','ATHX Liverpool 2027','2027-10-09','2027-10-10','ACC Liverpool','Liverpool','UK','UK'),
  ('ATHX','ATHX Bilbao 2027','2027-11-06',null,'Bilbao Exhibition Centre','Bilbao','Spain','Spain')
on conflict (series, name, race_date) do nothing;

-- Bilbao's region was mistyped above; fix rather than leave it wrong.
update public.race_catalog set region = 'Europe' where region = 'Spain';

-- ---------- what's still to come ----------
drop view if exists public.upcoming_races cascade;

create view public.upcoming_races
with (security_invoker = on) as
select
  c.*,
  (c.race_date - current_date) as days_away
from public.race_catalog c
where c.active and c.race_date >= current_date
order by c.race_date;

grant select on public.upcoming_races to authenticated;


-- ============================================================
--  27_chat.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the club chat
--
--  Community was a feed: things that had happened, reported.
--  A club is a conversation. This is one room everyone is in,
--  which is what the WhatsApp group already is — except this
--  one sits next to the training rather than beside it.
--
--  Notices stay, pinned to the top and small. They're the
--  things that need to be true tomorrow; the chat is the rest.
--
--  Run after 26_race_catalog.sql. Safe to re-run.
-- ============================================================

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  body        text,
  photo_url   text,
  reply_to    uuid references public.chat_messages on delete set null,
  workout_id  uuid references public.workout_logs on delete set null,
  deleted     boolean default false,
  created_at  timestamptz default now()
);

create index if not exists chat_created on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "read chat"    on public.chat_messages;
drop policy if exists "write chat"   on public.chat_messages;
drop policy if exists "edit own"     on public.chat_messages;
drop policy if exists "delete own"   on public.chat_messages;

-- One room, everyone in it.
create policy "read chat" on public.chat_messages
  for select to authenticated using (true);
create policy "write chat" on public.chat_messages
  for insert to authenticated with check (auth.uid() = user_id);
create policy "edit own" on public.chat_messages
  for update to authenticated using (auth.uid() = user_id);
-- A coach can remove anything; a member only their own.
create policy "delete own" on public.chat_messages
  for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ---------- with the sender attached ----------
drop view if exists public.chat_feed cascade;

create view public.chat_feed
with (security_invoker = on) as
select
  m.id,
  m.user_id,
  p.name,
  (p.role = 'admin')                       as is_coach,
  m.body,
  m.photo_url,
  m.reply_to,
  m.deleted,
  m.created_at,
  (m.user_id = auth.uid())                 as mine,
  s.title                                  as session_title
from public.chat_messages m
join public.profiles p           on p.id = m.user_id
left join public.workout_logs w  on w.id = m.workout_id
left join public.sessions s      on s.id = w.session_id
order by m.created_at;

grant select on public.chat_feed to authenticated;

-- Realtime, so a message lands without anyone pulling to refresh.
--
-- Wrapped, because adding a table that's already in the publication
-- raises — and an error here would abort the whole migration, leaving
-- the table created but the view missing. That failure looks like
-- "can't send a message" and gives no clue why.
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;


-- ============================================================
--  28_session_names.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — sessions get names, not specs
--
--  "Back Squat 5RM" is what a coach writes on a whiteboard. It
--  isn't what a member calls their Monday, and a title nobody
--  would say out loud is a title doing the wrong job.
--
--  The protocol hasn't gone anywhere — it's in the blocks, in
--  the focus pill, and on the session itself. The title is now
--  just a name.
--
--  Run after 27_chat.sql. Safe to re-run.
-- ============================================================

-- ---------- the tests ----------
update public.sessions set title = 'The Baseline'
 where title ilike '%back squat 5rm%' or title ilike '%squat test%';

update public.sessions set title = 'The Engine'
 where title ilike '%ski%test%' or title ilike '%erg test%'
    or title ilike '%1000m ski%';

update public.sessions set title = 'Off the Line'
 where title ilike '%5k%test%' or title ilike '%5km time trial%';

update public.sessions set title = 'The Salus Half'
 where kind = 'half';

-- ---------- the ordinary weeks ----------
-- Names that repeat across the block, so a member can compare Lower A
-- in week six against Lower A in week one without thinking about it.
-- A session called something different every week hides its own
-- progress.
update public.sessions set title = 'Lower A'
 where title ilike '%lower%a%' and kind = 'strength';

update public.sessions set title = 'Upper A'
 where title ilike '%upper%a%' and kind = 'strength';

update public.sessions set title = 'The Engine Room'
 where title ilike '%engine room%' or title ilike '%erg%session%';

update public.sessions set title = 'Compromised'
 where title ilike '%compromised%';

-- ---------- a session knows it's a test ----------
-- is_test already exists; make sure the renamed ones carry it, since
-- the app tags them off this rather than off the title.
update public.sessions set is_test = true
 where title in ('The Baseline', 'The Engine', 'Off the Line',
                 'The Salus Half');


-- ============================================================
--  29_block_formats.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — blocks that the app understands
--
--  The scheme was free text: a coach typed "Circuit · 2 rounds"
--  and the app printed it back. That's a PDF with a login.
--
--  This makes the format structured, so the app can actually run
--  the session — a countdown for an AMRAP, a minute beeper for an
--  EMOM, a cap that turns red, a target weight worked out from
--  what the member tested.
--
--  The chip members see is generated from these fields rather
--  than typed, which also ends "Straight set" and "Straight sets"
--  both existing.
--
--  Run after 28_session_names.sql. Safe to re-run.
-- ============================================================

alter table public.blocks add column if not exists format text default 'sets';
--   sets      straight sets, the default
--   superset  two or more movements back to back
--   circuit   a lap of everything, for rounds
--   amrap     as many rounds as possible in a window
--   emom      every minute on the minute
--   intervals work / rest, repeated
--   fortime   finish it, clock running
--   ladder    reps climb or fall each round

alter table public.blocks add column if not exists rounds integer;
alter table public.blocks add column if not exists window_s integer;   -- AMRAP / EMOM length
alter table public.blocks add column if not exists work_s integer;     -- interval work
alter table public.blocks add column if not exists rest_s integer;     -- interval or set rest
alter table public.blocks add column if not exists cap_s integer;      -- hard stop
alter table public.blocks add column if not exists ladder text;        -- '21-15-9'

-- ---------- how hard ----------
alter table public.blocks add column if not exists target_pct numeric;
--   Of the member's tested max for the movement. 0.75 = 75% of their
--   5RM-derived 1RM. Held as a fraction so one number means the same
--   effort to everyone rather than the same weight.

alter table public.blocks add column if not exists target_rpe numeric;
--   Where there's no test to work from — an RPE is the honest answer
--   for a movement nobody has a number for.

alter table public.blocks add column if not exists pace_pct numeric;
--   For running blocks. 1.00 = their tested 5km pace.

-- ---------- the chip, generated ----------
drop function if exists public.block_scheme(public.blocks) cascade;

create function public.block_scheme(b public.blocks)
returns text
language sql
immutable
as $$
  select case b.format
    when 'amrap'     then 'AMRAP ' || coalesce((b.window_s / 60)::text, '?') || ' min'
    when 'emom'      then 'EMOM ' || coalesce((b.window_s / 60)::text, '?') || ' min'
    when 'fortime'   then 'For time'
      || case when b.cap_s is not null
              then ' · ' || (b.cap_s / 60) || ' min cap' else '' end
    when 'intervals' then coalesce(b.rounds::text || ' × ', '')
      || coalesce(b.work_s::text || 's', '')
      || case when b.rest_s is not null then ' / ' || b.rest_s || 's' else '' end
    when 'circuit'   then 'Circuit'
      || case when b.rounds is not null then ' · ' || b.rounds || ' rounds' else '' end
    when 'superset'  then 'Superset'
      || case when b.rounds is not null then ' · ' || b.rounds || ' sets' else '' end
    when 'ladder'    then coalesce(b.ladder, 'Ladder')
    else                  'Straight sets'
      || case when b.rounds is not null then ' · ' || b.rounds || ' sets' else '' end
  end;
$$;

-- Backfill the new fields from what coaches have already typed, so
-- nothing has to be re-entered by hand.
update public.blocks set format = 'circuit'
 where scheme ilike '%circuit%' and format = 'sets';
update public.blocks set format = 'superset'
 where scheme ilike '%superset%' and format = 'sets';
update public.blocks set format = 'amrap'
 where scheme ilike '%amrap%' and format = 'sets';
update public.blocks set format = 'emom'
 where scheme ilike '%emom%' and format = 'sets';
update public.blocks set format = 'fortime'
 where scheme ilike '%for time%' and format = 'sets';
update public.blocks set format = 'intervals'
 where (scheme ilike '%interval%' or scheme ~ '\d+\s*[×x]\s*\d+') and format = 'sets';

-- Pull a round count out of things like "2 rounds" or "5 sets".
update public.blocks
   set rounds = nullif(substring(scheme from '(\d+)\s*(rounds?|sets?)'), '')::integer
 where rounds is null
   and scheme ~ '\d+\s*(rounds?|sets?)';

-- ---------- what a member is aiming at ----------
-- Turns a block's target into an actual number for one member, using
-- whatever they've tested. Returns null rather than guessing when
-- there's nothing to work from — a made-up target weight is worse
-- than none.
drop function if exists public.block_target(uuid, uuid) cascade;

create function public.block_target(p_user uuid, p_block uuid)
returns table (kind text, value numeric, label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pct   numeric;
  v_rpe   numeric;
  v_pace  numeric;
  v_squat numeric;
  v_5k    integer;
begin
  select b.target_pct, b.target_rpe, b.pace_pct
    into v_pct, v_rpe, v_pace
    from public.blocks b where b.id = p_block;

  if v_pace is not null then
    select bm.value_s into v_5k from public.benchmarks bm
     where bm.user_id = p_user and bm.key = 'fivek' and bm.week = 1;
    if v_5k is not null then
      return query select 'pace'::text,
        round((v_5k / 5.0) * v_pace)::numeric,
        'per km'::text;
      return;
    end if;
  end if;

  if v_pct is not null then
    select bm.value_num into v_squat from public.benchmarks bm
     where bm.user_id = p_user and bm.key = 'squat' and bm.week = 1;
    if v_squat is not null then
      -- Epley from a 5RM, then the percentage. Rounded to 2.5kg
      -- because that's what the plates do.
      return query select 'weight'::text,
        (round((v_squat * 1.1667) * v_pct / 2.5) * 2.5)::numeric,
        'kg'::text;
      return;
    end if;
  end if;

  if v_rpe is not null then
    return query select 'rpe'::text, v_rpe, 'RPE'::text;
    return;
  end if;
end;
$$;

grant execute on function public.block_target(uuid, uuid) to authenticated;


-- ============================================================
--  30_block_overview.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the whole block, at a glance
--
--  A member can see this week and nothing else. Eight weeks is
--  the thing they signed up to, and not being able to see the
--  shape of it is why a plan feels like a series of unrelated
--  Mondays.
--
--  Run after 29_block_formats.sql. Safe to re-run.
-- ============================================================

alter table public.weeks add column if not exists phase text;
alter table public.weeks add column if not exists note text;

-- A sensible default phase, where a coach hasn't set one. Eight weeks
-- divides as three building, three loading, one peak, one taper —
-- which is roughly what everyone does anyway.
update public.weeks w
   set phase = case
     when w.idx <= 3 then 'Foundation'
     when w.idx <= 6 then 'Build'
     when w.idx = 7  then 'Peak'
     else                 'Taper'
   end
 where w.phase is null;

-- ---------- every week, with what's in it and what I've done ----------
drop view if exists public.my_block cascade;

create view public.my_block
with (security_invoker = on) as
select
  w.id,
  w.idx,
  w.phase,
  w.note,
  w.published,
  pr.id                                     as programme_id,
  pr.name                                   as programme,
  pr.weeks                                  as total_weeks,

  count(s.id) filter (where s.kind <> 'rest')                as sessions,
  count(s.id) filter (where s.is_test)                       as tests,

  count(distinct l.session_id) filter (where l.ended_at is not null
                                         and l.user_id = auth.uid())
                                                             as done,

  -- Minutes actually spent, not minutes prescribed.
  coalesce(sum(l.elapsed_s) filter (where l.user_id = auth.uid()), 0) / 60
                                                             as minutes,

  -- The kinds of session in the week, so the overview can say
  -- "two strength, two runs" rather than just a number.
  array_agg(distinct s.kind) filter (where s.kind is not null
                                       and s.kind <> 'rest') as kinds

from public.weeks w
join public.programmes pr        on pr.id = w.programme_id
left join public.sessions s      on s.week_id = w.id
left join public.workout_logs l  on l.session_id = s.id
where pr.id = (select p.programme_id from public.profiles p
               where p.id = auth.uid())
group by w.id, w.idx, w.phase, w.note, w.published,
         pr.id, pr.name, pr.weeks
order by w.idx;

grant select on public.my_block to authenticated;

-- ---------- the sessions in one week ----------
drop function if exists public.week_sessions(uuid) cascade;

create function public.week_sessions(p_week uuid)
returns table (
  id        uuid,
  day       integer,
  slot      integer,
  title     text,
  kind      text,
  is_test   boolean,
  est_min   integer,
  focus     text,
  done      boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, s.day, coalesce(s.slot, 1)::integer, s.title::text, s.kind::text,
    s.is_test, s.est_min,
    s.focus::text,
    exists (select 1 from public.workout_logs l
            where l.session_id = s.id and l.user_id = auth.uid()
              and l.ended_at is not null)
  from public.sessions s
  where s.week_id = p_week
  order by s.day, coalesce(s.slot, 1);
$$;

grant execute on function public.week_sessions(uuid) to authenticated;


-- ============================================================
--  31_elite_block.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — The Salus Elite Block
--
--  Eight weeks, nine to eleven sessions a week, four of them
--  doubles. Built on the published methods of Hunter McIntyre
--  (HAOS) and Jake Dearden, at the ATHX strength standard, with
--  a metcon on the end of every hard session.
--
--  This is not the general-population plan. It assumes 40–50km
--  a week already comfortable, a 1.4× bodyweight squat, and at
--  least one HYROX finished.
--
--  Run after 30_block_overview.sql. Safe to re-run.
-- ============================================================

-- ---------- the movements it needs ----------
insert into public.movements (name, default_rest_s, has_time, pct_of, pct) values
  ('Front-Rack Reverse Lunge', 120, false, 'squat', 0.45),
  ('Romanian Deadlift',        120, false, 'squat', 0.70),
  ('Deadlift',                 180, false, 'squat', 1.15),
  ('Weighted Pull-Up',         150, false, null,    null),
  ('Barbell Row',              120, false, 'squat', 0.55),
  ('Push Press',               120, false, 'squat', 0.50),
  ('Farmers Carry',            120, true,  null,    null),
  ('Sled Push',                120, true,  null,    null),
  ('Sled Pull',                120, true,  null,    null),
  ('Wall Balls',                90, false, null,    null),
  ('Burpee Broad Jumps',        90, false, null,    null),
  ('Sandbag Lunges',            90, true,  null,    null),
  ('Thrusters',                 90, false, 'squat', 0.42),
  ('Kettlebell Swings',         60, false, null,    null),
  ('Box Step-Overs',            60, false, null,    null),
  ('Single-Arm DB Row',         90, false, null,    null),
  ('Step-Ups',                  90, false, null,    null)
on conflict (name) do nothing;

-- ---------- the programme ----------
-- Loaded under a working slug; 33_one_programme renames it to
-- road-to-hyrox and archives the original seed block. Kept separate so
-- the merge is a decision you can read rather than a side effect of
-- loading content.
insert into public.programmes
  (slug, name, blurb, weeks, race_name, race_location, race_date,
   uses_half, sessions_per_week)
values
  ('salus-elite', 'Road to HYROX',
   'Eight weeks to a HYROX. Six to eleven sessions a week depending on how deep you want to go, built on how the best in the sport actually train.',
   8, 'HYROX London ExCeL', 'ExCeL, London', '2026-12-03', true, 11)
on conflict (slug) do update
  set name = excluded.name, blurb = excluded.blurb, weeks = excluded.weeks;

-- ---------- eight weeks ----------
insert into public.weeks (programme_id, idx, phase, note, published)
select pr.id, x.idx, x.phase, x.note, true
from public.programmes pr
cross join (values
  (1, 'Build',  'Volume climbs. Nothing here should leave you destroyed.'),
  (2, 'Build',  'The wall balls are the point — they are what falls apart in a race.'),
  (3, 'Build',  'Biggest week of the block. Tired by Thursday is correct.'),
  (4, 'Absorb', 'Volume down 45%, intensity held. Skipping this is what breaks week 6.'),
  (5, 'Sharpen','Race-specific. Saturday is a rehearsal, not a run.'),
  (6, 'Sharpen','Wednesday repeats week 1. Compare the totals.'),
  (7, 'Peak',   'The biggest week. Everything after this gets easier.'),
  (8, 'Taper',  'Volume falls off a cliff. Everything stays fast.')
) as x(idx, phase, note)
where pr.slug = 'salus-elite'
on conflict do nothing;

-- ============================================================
--  SESSIONS
--  day 1 = Monday. The PM halves are separate sessions on the
--  same day, so a member can log them apart — which matters,
--  because the whole point of the second session is that it is
--  easy, and pairing it with the morning hides whether it was.
-- ============================================================

insert into public.sessions
  (week_id, day, slot, title, tag, kind, est_min, is_test, focus, body)
select w.id, x.day, case when x.tag = 'PM' then 2 else 1 end,
       x.title, x.tag, x.kind, x.mins, x.test, x.focus, x.body
from public.weeks w
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  -- ============ WEEK 1 ============
  (1, 1, 'Lower A',        'AM', 'strength', 75, false, 'Back squat',
   'Five by five at 75%. The metcon on the end is short on purpose.'),
  (1, 1, 'Evening Easy',   'PM', 'run',      30, false, 'Z1',
   'Conversational the whole way. If it is hard you are doing it wrong.'),
  (1, 2, 'Threshold 800s', 'AM', 'run',      60, false, 'Running',
   'Eight by 800 at threshold. Or run a 5km if yours is over six weeks old.'),
  (1, 2, 'Prehab',         'PM', 'rest',     30, false, null,
   'Ankle mobility, single-leg calf raises, hip airplanes, banded external rotation.'),
  (1, 3, 'Compromised',    null, 'run',      70, true,  'Running on tired legs',
   'The benchmark. Log the total — you repeat this exact session in week 6.'),
  (1, 4, 'Upper A',        'AM', 'strength', 70, false, 'Weighted pull-up',
   'Pull, press, carry. Grip is the limiter nobody trains enough.'),
  (1, 4, 'Evening Easy',   'PM', 'run',      30, false, 'Z1', null),
  (1, 5, 'Easy & Core',    null, 'run',      55, false, 'Z1', null),
  (1, 6, 'Long Mixed',     null, 'run',      90, false, 'Aerobic base',
   'Ninety minutes. Conversational throughout the running.'),
  (1, 7, 'Rest',           null, 'rest',      0, false, null,
   'A full day off. Not active recovery.')
) as x(widx, day, title, tag, kind, mins, test, focus, body)
where pr.slug = 'salus-elite' and w.idx = x.widx
  and not exists (select 1 from public.sessions s
                  where s.week_id = w.id and s.day = x.day
                    and s.slot = case when x.tag = 'PM' then 2 else 1 end);


-- ---------- weeks 2 to 8 ----------
insert into public.sessions
  (week_id, day, slot, title, tag, kind, est_min, is_test, focus, body)
select w.id, x.day, case when x.tag = 'PM' then 2 else 1 end,
       x.title, x.tag, x.kind, x.mins, x.test, x.focus, x.body
from public.weeks w
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (2, 1, 'Lower A', 'AM', 'strength', 75, false, 'Back squat', 'Five by four at 80%. The Chipper on the end.'),
  (2, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (2, 2, 'Threshold Kilometres', 'AM', 'run', 60, false, 'Running', 'Five by 1km at threshold, two minutes jog.'),
  (2, 2, 'Prehab', 'PM', 'rest', 30, false, null, 'Thirty minutes before you train, not after.'),
  (2, 3, 'Compromised', null, 'run', 70, true, 'Running on tired legs', 'Fifty wall balls a round now. That is what falls apart in a race.'),
  (2, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Death by Ski on the end. It ends when it ends.'),
  (2, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (2, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (2, 6, 'Long Mixed', null, 'run', 100, false, 'Aerobic base', 'A hundred walking lunges in the middle of it.'),
  (2, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (3, 1, 'Lower A', 'AM', 'strength', 75, false, 'Back squat', 'Four by three at 85%, then Fran’s Cousin.'),
  (3, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (3, 2, '5k Pace 600s', 'AM', 'run', 60, false, 'Running', 'Ten by 600 at 5km pace.'),
  (3, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (3, 3, 'Compromised', null, 'run', 80, true, 'Running on tired legs', 'Six rounds. Longest compromised session of the block.'),
  (3, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Cindy’s Angry Sister. Twelve minutes.'),
  (3, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (3, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (3, 6, 'Long Mixed', null, 'run', 120, false, 'Aerobic base', 'Two hours. Biggest of block one.'),
  (3, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (4, 1, 'Lower A', 'AM', 'strength', 45, false, 'Back squat', 'Light. No sled, no metcon. Resist the urge.'),
  (4, 2, 'Short Sharp', 'AM', 'run', 45, false, 'Running', 'Five by 400 hard, full recovery.'),
  (4, 3, 'Compromised', null, 'run', 45, false, 'Running on tired legs', 'Three rounds only.'),
  (4, 4, 'Upper A', 'AM', 'strength', 45, false, 'Pull-up', 'Bodyweight. Pretty Easy on the end, and it should be.'),
  (4, 5, 'Easy & Mobility', null, 'run', 50, false, 'Z1', null),
  (4, 6, 'Long Easy', null, 'run', 60, false, 'Z1', 'Sixty minutes flat. No stations.'),
  (4, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (5, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Five by three at 85%. Sled at race weight.'),
  (5, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (5, 2, 'Race Pace Kilometres', 'AM', 'run', 60, false, 'Running', 'Five by 1km at race pace, sixty seconds standing rest. The short rest is the race.'),
  (5, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (5, 3, 'Compromised', null, 'run', 70, true, 'Transitions', 'Practise the handovers. Walk them properly.'),
  (5, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Diane’s Day Out on the end.'),
  (5, 4, 'Evening Ski', 'PM', 'erg', 20, false, 'Z2', null),
  (5, 5, 'Easy & Core', null, 'run', 55, false, 'Z1', null),
  (5, 6, 'The Salus Half', null, 'half', 60, true, 'Race rehearsal', 'Four rounds, race pace, no rest between run and station. This feeds your projection.'),
  (5, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (6, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Five by three at 87.5%. Then a hundred wall balls for time.'),
  (6, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (6, 2, 'Fast 800s', 'AM', 'run', 60, false, 'Running', 'Eight by 800 faster than race pace, sixty seconds rest.'),
  (6, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (6, 3, 'Benchmark Repeat', null, 'run', 70, true, 'Running on tired legs', 'The exact week one session. Same rest. Compare the totals.'),
  (6, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'The Grinder. Fifteen minutes.'),
  (6, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (6, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (6, 6, 'Long Mixed', null, 'run', 135, false, 'Aerobic base', 'Peak volume. Two hours fifteen.'),
  (6, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (7, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Four by two at 90%. Heaviest sled of the block.'),
  (7, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (7, 2, '400 Repeats', 'AM', 'run', 60, false, 'Running', 'Twelve by 400 hard, sixty seconds rest.'),
  (7, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (7, 3, 'Full Rehearsal', null, 'run', 80, true, 'Race day', 'Kit, fuelling, transitions. Everything as it will be.'),
  (7, 4, 'Upper A', 'AM', 'strength', 55, false, 'Weighted pull-up', 'Reduced. No sled, core only.'),
  (7, 5, 'Easy & Mobility', null, 'run', 45, false, 'Z1', null),
  (7, 6, 'Long Mixed', null, 'run', 150, false, 'Aerobic base', 'Two and a half hours. Last big one.'),
  (7, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (8, 1, 'Primer', 'AM', 'strength', 40, false, 'Back squat', 'Three by three at 75%. Nothing heavy.'),
  (8, 2, 'Strides', 'AM', 'run', 45, false, 'Running', 'Eight by 200 hard, full recovery.'),
  (8, 3, 'Sharpener', null, 'run', 35, false, 'Race pace', 'Should feel fast and finish early. If it feels hard, cut Thursday.'),
  (8, 4, 'Movement Only', 'AM', 'strength', 40, false, null, 'Everything light. Full mobility.'),
  (8, 5, 'Shakeout', null, 'run', 20, false, 'Z1', 'Fifteen minutes very easy, four strides. Nothing else.'),
  (8, 6, 'RACE DAY', null, 'half', 75, true, 'Everything', 'Eight kilometres, eight stations. Go.'),
  (8, 7, 'Rest', null, 'rest', 0, false, null, 'Rest, and eat properly.')
) as x(widx, day, title, tag, kind, mins, test, focus, body)
where pr.slug = 'salus-elite' and w.idx = x.widx
  and not exists (select 1 from public.sessions s
                  where s.week_id = w.id and s.day = x.day
                    and s.slot = case when x.tag = 'PM' then 2 else 1 end);


-- ============================================================
--  THE WORK
--  Blocks carry the structured format fields, so the app runs
--  the metcons rather than just printing them — an AMRAP gets a
--  countdown, a capped piece turns over at the cap.
-- ============================================================

insert into public.blocks
  (session_id, ord, letter, label, scheme, format, rounds, window_s,
   cap_s, rest_s, target_pct, rest_note)
select s.id, x.ord, x.letter, x.label, null,
       x.format, x.rounds, x.window_s, x.cap_s, x.rest_s, x.target_pct, x.note
from public.sessions s
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (1, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.75, null),
  (1, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (1, 1, 'Lower A', 4, 'C', 'Romanian Deadlift', 'sets', 4, null, null, 120, null, null),
  (1, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 6, null, null, 120, null, null),
  (1, 1, 'Lower A', 6, 'E', 'Tin Man', 'fortime', 3, null, 540, null, null, 'The fun bit. Go.'),
  (2, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.8, null),
  (2, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (2, 1, 'Lower A', 4, 'C', 'Romanian Deadlift', 'sets', 4, null, null, 120, null, null),
  (2, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (2, 1, 'Lower A', 6, 'E', 'The Chipper', 'fortime', 1, null, 720, null, null, 'The fun bit. Go.'),
  (3, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 4, null, null, 150, 0.85, null),
  (3, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (3, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (3, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (3, 1, 'Lower A', 6, 'E', 'Fran’s Cousin', 'fortime', 1, null, 480, null, null, 'The fun bit. Go.'),
  (5, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.85, null),
  (5, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (5, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (5, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 6, null, null, 120, null, null),
  (5, 1, 'Lower A', 6, 'E', 'Sled Hell', 'fortime', 4, null, 600, null, null, 'The fun bit. Go.'),
  (6, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.875, null),
  (6, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (6, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (6, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (6, 1, 'Lower A', 6, 'E', 'Karen’s Revenge', 'fortime', 1, null, 480, null, null, 'The fun bit. Go.'),
  (7, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (7, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 4, null, null, 150, 0.9, null),
  (7, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 3, null, null, 120, null, null),
  (7, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 3, null, null, 120, null, null),
  (7, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (7, 1, 'Lower A', 6, 'E', 'Short and Rude', 'fortime', 3, null, 360, null, null, 'The fun bit. Go.'),
  (1, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (1, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 5, null, null, 120, null, null),
  (1, 4, 'Upper A', 7, 'F', 'Grip Tax', 'emom', null, 720, null, null, null, 'The fun bit.'),
  (2, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (2, 4, 'Upper A', 3, 'B', 'Single-Arm DB Row', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (2, 4, 'Upper A', 7, 'F', 'Death by Ski', 'emom', null, null, null, null, null, 'The fun bit.'),
  (3, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (3, 4, 'Upper A', 7, 'F', 'Cindy’s Angry Sister', 'amrap', null, 720, null, null, null, 'The fun bit.'),
  (5, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (5, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (5, 4, 'Upper A', 7, 'F', 'Diane’s Day Out', 'fortime', null, 540, null, null, null, 'The fun bit.'),
  (6, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (6, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (6, 4, 'Upper A', 7, 'F', 'The Grinder', 'amrap', null, 900, null, null, null, 'The fun bit.'),
  (7, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (7, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 3, null, null, 120, null, null),
  (1, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (2, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (3, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 6, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (5, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 4, null, null, 120, null, '120 seconds between rounds. Hold the same km split every round.'),
  (6, 3, 'Benchmark Repeat', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 3, 'Benchmark Repeat', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.')
) as x(widx, day, stitle, ord, letter, label, format, rounds, window_s,
       cap_s, rest_s, target_pct, note)
where pr.slug = 'salus-elite'
  and w.idx = x.widx and s.day = x.day and s.title = x.stitle
  and s.slot = 1
  and not exists (select 1 from public.blocks b
                  where b.session_id = s.id and b.letter = x.letter);

insert into public.block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from public.blocks b
join public.sessions s    on s.id = b.session_id
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (1, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (1, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (1, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (1, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (1, 1, 'Lower A', 'A', 1, '5 × 5', 'Barbell Back Squat', '75%'),
  (1, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', null),
  (1, 1, 'Lower A', 'C', 1, '4 × 8', 'Romanian Deadlift', 'RPE 7'),
  (1, 1, 'Lower A', 'D', 1, '6 × 25m', 'Sled Push', 'heavy, walk back'),
  (1, 1, 'Lower A', 'E', 1, 'For time', '15 wall balls, 12 cal ski, 9 burpee broad jumps', null),
  (2, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (2, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (2, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (2, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (2, 1, 'Lower A', 'A', 1, '5 × 4', 'Barbell Back Squat', '80%'),
  (2, 1, 'Lower A', 'B', 1, '4 × 10 each', 'Front-Rack Reverse Lunge', null),
  (2, 1, 'Lower A', 'C', 1, '4 × 8', 'Romanian Deadlift', 'RPE 7.5'),
  (2, 1, 'Lower A', 'D', 1, '8 × 25m', 'Sled Push', 'heavy'),
  (2, 1, 'Lower A', 'E', 1, 'For time', '50 wall balls, 40 cal row, 30 burpee broad jumps, 20 sandbag lunges', null),
  (3, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (3, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (3, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (3, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (3, 1, 'Lower A', 'A', 1, '4 × 3', 'Barbell Back Squat', '85%'),
  (3, 1, 'Lower A', 'B', 1, '4 × 10 each', 'Front-Rack Reverse Lunge', 'loaded'),
  (3, 1, 'Lower A', 'C', 1, '4 × 5', 'Deadlift', 'RPE 8'),
  (3, 1, 'Lower A', 'D', 1, '8 × 25m', 'Sled Push', 'heaviest of the block'),
  (3, 1, 'Lower A', 'E', 1, 'For time', '21-15-9 thrusters (43/30kg) and chest-to-bar pull-ups', null),
  (5, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (5, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (5, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (5, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (5, 1, 'Lower A', 'A', 1, '5 × 3', 'Barbell Back Squat', '85%'),
  (5, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', 'heavy'),
  (5, 1, 'Lower A', 'C', 1, '4 × 4', 'Deadlift', 'RPE 8'),
  (5, 1, 'Lower A', 'D', 1, '6 × 50m', 'Sled Push', 'race weight'),
  (5, 1, 'Lower A', 'E', 1, 'For time', '25m sled push, 25m sled pull, 10 burpee broad jumps', null),
  (6, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (6, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (6, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (6, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (6, 1, 'Lower A', 'A', 1, '5 × 3', 'Barbell Back Squat', '87.5%'),
  (6, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', null),
  (6, 1, 'Lower A', 'C', 1, '4 × 4', 'Deadlift', 'RPE 8.5'),
  (6, 1, 'Lower A', 'D', 1, '8 × 50m', 'Sled Push', 'race weight'),
  (6, 1, 'Lower A', 'E', 1, 'For time', '100 wall balls. That is the whole workout.', null),
  (7, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (7, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (7, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (7, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (7, 1, 'Lower A', 'A', 1, '4 × 2', 'Barbell Back Squat', '90%'),
  (7, 1, 'Lower A', 'B', 1, '3 × 8 each', 'Front-Rack Reverse Lunge', null),
  (7, 1, 'Lower A', 'C', 1, '3 × 3', 'Deadlift', 'RPE 8.5'),
  (7, 1, 'Lower A', 'D', 1, '8 × 50m', 'Sled Push', 'heaviest'),
  (7, 1, 'Lower A', 'E', 1, 'For time', '10 thrusters, 10 burpees over the bar', null),
  (1, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (1, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (1, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (1, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (1, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (1, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (1, 4, 'Upper A', 'C', 1, '4 × 6', 'Push Press', null),
  (1, 4, 'Upper A', 'D', 1, '4 × 50m', 'Farmers Carry', null),
  (1, 4, 'Upper A', 'E', 1, '5 × 25m', 'Sled Pull', null),
  (1, 4, 'Upper A', 'F', 1, '', 'Odd: 10 kettlebell swings + 5 burpees. Even: 40m farmers carry.', null),
  (2, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (2, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (2, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (2, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (2, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (2, 4, 'Upper A', 'B', 1, '4 × 10 each', 'Single-Arm DB Row', null),
  (2, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (2, 4, 'Upper A', 'D', 1, '4 × 75m', 'Farmers Carry', null),
  (2, 4, 'Upper A', 'E', 1, '6 × 25m', 'Sled Pull', null),
  (2, 4, 'Upper A', 'F', 1, '', 'Minute 1: 5 cal. Add one calorie every minute until you cannot finish inside it.', null),
  (3, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (3, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (3, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (3, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (3, 4, 'Upper A', 'A', 1, '5 × 4', 'Weighted Pull-Up', null),
  (3, 4, 'Upper A', 'B', 1, '5 × 8', 'Barbell Row', null),
  (3, 4, 'Upper A', 'C', 1, '5 × 4', 'Push Press', null),
  (3, 4, 'Upper A', 'D', 1, '5 × 100m', 'Farmers Carry', null),
  (3, 4, 'Upper A', 'E', 1, '6 × 30m', 'Sled Pull', null),
  (3, 4, 'Upper A', 'F', 1, '', '5 pull-ups, 10 press-ups, 15 air squats, 200m run', null),
  (5, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (5, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (5, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (5, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (5, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (5, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (5, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (5, 4, 'Upper A', 'D', 1, '4 × 100m', 'Farmers Carry', null),
  (5, 4, 'Upper A', 'E', 1, '6 × 30m', 'Sled Pull', null),
  (5, 4, 'Upper A', 'F', 1, '', '21-15-9 deadlift (102/70kg) and handstand press-ups', null),
  (6, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (6, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (6, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (6, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (6, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (6, 4, 'Upper A', 'B', 1, '5 × 8', 'Barbell Row', null),
  (6, 4, 'Upper A', 'C', 1, '5 × 5', 'Push Press', null),
  (6, 4, 'Upper A', 'D', 1, '4 × 100m', 'Farmers Carry', null),
  (6, 4, 'Upper A', 'E', 1, '6 × 40m', 'Sled Pull', null),
  (6, 4, 'Upper A', 'F', 1, '', '10 cal row, 10 kettlebell swings, 10 box step-overs', null),
  (7, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (7, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (7, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (7, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (7, 4, 'Upper A', 'A', 1, '4 × 5', 'Weighted Pull-Up', null),
  (7, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (7, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (7, 4, 'Upper A', 'D', 1, '3 × 100m', 'Farmers Carry', null),
  (1, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (1, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (1, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (1, 3, 'Compromised', 'A', 2, '', '40 wall balls', null),
  (1, 3, 'Compromised', 'A', 3, '', '25 cal row', null),
  (2, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (2, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (2, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (2, 3, 'Compromised', 'A', 2, '', '50 wall balls', null),
  (2, 3, 'Compromised', 'A', 3, '', '30 cal row', null),
  (3, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (3, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (3, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (3, 3, 'Compromised', 'A', 2, '', '50 wall balls', null),
  (3, 3, 'Compromised', 'A', 3, '', '30 cal row', null),
  (5, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (5, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (5, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (5, 3, 'Compromised', 'A', 2, '', '20 burpee broad jumps', null),
  (5, 3, 'Compromised', 'A', 3, '', '50m sled push + 50m sled pull', null),
  (6, 3, 'Benchmark Repeat', 'W', 1, '10 min', 'Easy running', null),
  (6, 3, 'Benchmark Repeat', 'W', 2, '6 × 100m', 'Strides, building', null),
  (6, 3, 'Benchmark Repeat', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (6, 3, 'Benchmark Repeat', 'A', 2, '', '40 wall balls', null),
  (6, 3, 'Benchmark Repeat', 'A', 3, '', '25 cal row', null)
) as x(widx, day, stitle, letter, ord, pres, mv, sub)
where pr.slug = 'salus-elite'
  and w.idx = x.widx and s.day = x.day and s.title = x.stitle
  and s.slot = 1 and b.letter = x.letter
  and not exists (select 1 from public.block_lines bl
                  where bl.block_id = b.id and bl.ord = x.ord);


-- ---------- the chips, from the structured fields ----------
-- Set after insert rather than during, so the generator is the single
-- source of the wording and nothing here can drift from what the back
-- office writes.
update public.blocks b
   set scheme = public.block_scheme(b)
  from public.sessions s
  join public.weeks w       on w.id = s.week_id
  join public.programmes pr on pr.id = w.programme_id
 where b.session_id = s.id
   and pr.slug = 'salus-elite'
   and (b.scheme is null or b.scheme = '');

-- ---------- loggable items, so sets can be ticked off ----------
insert into public.block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, coalesce(b.rounds, 3),
       coalesce(nullif(substring(bl.prescription from '× *(\d+)'), '')::integer, 5),
       coalesce(b.rest_s, 120)
from public.blocks b
join public.block_lines bl on bl.block_id = b.id and bl.ord = 1
join public.movements m    on m.name = bl.movement
join public.sessions s     on s.id = b.session_id
join public.weeks w        on w.id = s.week_id
join public.programmes pr  on pr.id = w.programme_id
where pr.slug = 'salus-elite'
  and b.format = 'sets'
  and not exists (select 1 from public.block_items bi where bi.block_id = b.id);

-- ---------- put the standards on the score ----------
-- The elite block is scored against the same fixed standards as
-- everything else. A member switching programmes keeps their number.


-- ============================================================
--  32_current_week.sql
-- ============================================================

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


-- ============================================================
--  33_one_programme.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the elite block becomes Road to HYROX
--
--  Two programmes was a hedge. The elite block is the one that
--  got written properly, and the original seed was three weeks
--  of placeholder sessions. Running both means half the members
--  are on the worse one.
--
--  Idempotent, which the first version was not: 03_seed recreates
--  road-to-hyrox on every run, so this has to cope with finding a
--  fresh empty one sitting next to an archive from last time.
--
--  An empty placeholder is deleted rather than archived —
--  archiving one on every run just accumulates junk. A programme
--  with logged sessions against it is always kept, under the
--  first free archive slug.
--
--  Run after 32_current_week.sql. Safe to re-run.
-- ============================================================

do $$
declare
  v_old     uuid;
  v_new     uuid;
  v_logs    integer;
  v_weeks   integer;
  v_slug    text;
  v_n       integer := 1;
begin
  select id into v_new from public.programmes where slug = 'salus-elite';

  -- Already merged: the elite content is under road-to-hyrox and
  -- there's no salus-elite left to move. Nothing to do.
  if v_new is null then
    raise notice 'salus-elite not present — already merged, or never loaded';
  else
    select id into v_old from public.programmes
     where slug = 'road-to-hyrox' and id <> v_new;

    if v_old is not null then
      -- Does anything actually depend on the old one?
      select count(*) into v_logs
        from public.workout_logs l
        join public.sessions s on s.id = l.session_id
        join public.weeks w    on w.id = s.week_id
       where w.programme_id = v_old;

      select count(*) into v_weeks
        from public.weeks w where w.programme_id = v_old;

      -- Members move across first, either way. week_idx carries over:
      -- someone on week three stays on week three, which beats
      -- resetting them.
      update public.profiles
         set programme_id = v_new
       where programme_id = v_old;

      if v_logs = 0 and v_weeks <= 3 then
        -- A freshly seeded placeholder with nothing in it. Remove it
        -- rather than keeping a copy of nothing.
        delete from public.programmes where id = v_old;
        raise notice 'removed the empty seed programme';
      else
        -- Somebody trained on it. Keep it, under the first free slug.
        loop
          v_slug := 'road-to-hyrox-v' || v_n;
          exit when not exists (
            select 1 from public.programmes where slug = v_slug);
          v_n := v_n + 1;
        end loop;

        update public.programmes
           set slug     = v_slug,
               name     = 'Road to HYROX (archive ' || v_n || ')',
               blurb    = 'An earlier version of the block. Kept so anyone who trained on it still has their history.',
               archived = true
         where id = v_old;
        raise notice 'archived the old programme as %', v_slug;
      end if;
    end if;

    update public.programmes
       set slug     = 'road-to-hyrox',
           name     = 'Road to HYROX',
           blurb    = 'Eight weeks to a HYROX. Six to eleven sessions a week depending on how deep you want to go, built on how the best in the sport actually train.',
           archived = false
     where id = v_new;
  end if;
end $$;

-- ---------- anyone without a programme lands on it ----------
update public.profiles p
   set programme_id = pr.id
  from public.programmes pr
 where pr.slug = 'road-to-hyrox'
   and p.programme_id is null;

-- ---------- and nobody sits past the end of it ----------
update public.profiles p
   set week_idx = least(p.week_idx, pr.weeks)
  from public.programmes pr
 where pr.id = p.programme_id
   and p.week_idx > pr.weeks;


-- ============================================================
--  34_coach_floor.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — what a coach needs to know this morning
--
--  The back office could tell you what the programme says. It
--  couldn't tell you who is actually doing it, which is the only
--  question a coach has before opening the doors.
--
--  Three things, in the order they matter: who trained today,
--  who has gone quiet, and who never finished testing. The last
--  one is the quiet killer — an untested member is training on
--  default weights and nobody finds out until week six.
--
--  Run after 33_one_programme.sql. Safe to re-run.
-- ============================================================

drop view if exists public.coach_floor cascade;

create view public.coach_floor
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.programme_id,
  pr.name                                      as programme,
  coalesce(p.week_idx, 1)                      as week_idx,
  pr.weeks                                     as total_weeks,
  p.share_on_leaderboard,

  -- what they have done in the week they are on
  (select count(distinct l.session_id)
     from public.workout_logs l
     join public.sessions s on s.id = l.session_id
     join public.weeks w    on w.id = s.week_id
    where l.user_id = p.id and l.ended_at is not null
      and w.programme_id = p.programme_id
      and w.idx = coalesce(p.week_idx, 1))     as done_this_week,

  (select count(*)
     from public.sessions s
     join public.weeks w on w.id = s.week_id
    where w.programme_id = p.programme_id
      and w.idx = coalesce(p.week_idx, 1)
      and s.kind <> 'rest')                    as sessions_this_week,

  -- when they were last in
  (select max(l.ended_at) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)
                                               as last_trained,

  (select count(*) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null
      and l.ended_at::date = current_date)     as sessions_today,

  -- testing
  (select count(*) from public.benchmarks b
    where b.user_id = p.id and b.week = 1)     as tests_done,

  (select count(*) from public.half_sims h
    where h.user_id = p.id and h.total_s is not null)
                                               as halves_done,

  -- how long since they were in, in days
  (select current_date - max(l.ended_at)::date
     from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)
                                               as days_since

from public.profiles p
left join public.programmes pr on pr.id = p.programme_id
where public.is_admin()
  and p.role is distinct from 'admin'
  and p.name is not null;

grant select on public.coach_floor to authenticated;

-- ---------- the club, today ----------
drop function if exists public.floor_today() cascade;

create function public.floor_today()
returns table (
  trained_today   bigint,
  members         bigint,
  sessions_today  bigint,
  minutes_today   bigint,
  behind          bigint,
  untested        bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct l.user_id) from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select count(*) from public.profiles p
      where p.role is distinct from 'admin' and p.name is not null)::bigint,
    (select count(*) from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select coalesce(sum(l.elapsed_s), 0) / 60 from public.workout_logs l
      where l.ended_at::date = current_date)::bigint,
    (select count(*) from public.coach_floor f
      where f.days_since >= 5 or f.days_since is null)::bigint,
    (select count(*) from public.coach_floor f
      where f.tests_done < 5)::bigint;
$$;

grant execute on function public.floor_today() to authenticated;


-- ============================================================
--  35_multiplier.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — a multiplier that learns, and a duplicate fix
--
--  2.08 said the back half of a race is 4% slower than the
--  front. Published HYROX split data has age-groupers losing
--  more like 8–15%, so the projection has been flattering
--  everyone. 2.12 is a better prior.
--
--  But a prior is all it is. The right number is the one your
--  members actually produce, so this computes it from real
--  half-to-race pairs once there are enough of them, and says
--  how many it is standing on.
--
--  Run after 34_coach_floor.sql. Safe to re-run.
-- ============================================================

-- ---------- the duplicate notices ----------
--  03_seed inserts notices with no unique key, so every run added
--  another copy. Six pins of the same thing is what that looks like.
delete from public.notices a
 using public.notices b
 where a.id > b.id
   and a.title = b.title
   and a.tag is not distinct from b.tag;

-- And stop it happening again.
create unique index if not exists notices_title_key
  on public.notices (title);

-- ---------- a better prior ----------
update public.config
   set value = '2.12'
 where key = 'half_multiplier' and value = '2.08';

insert into public.config (key, value)
values ('half_multiplier', '2.12')
on conflict (key) do nothing;

-- ---------- what the club's races actually say ----------
--  For anyone who ran a Salus Half and then a real race, the true
--  multiplier is race time over half time. That is the only number
--  here that isn't a guess.
drop view if exists public.multiplier_evidence cascade;

create view public.multiplier_evidence
with (security_invoker = on) as
select
  r.id,
  p.name,
  r.name                                as race,
  r.race_date,
  h.total_s                             as half_s,
  r.result_s,
  round((r.result_s::numeric / nullif(h.total_s, 0)), 3)  as ratio
from public.races r
join public.profiles p  on p.id = r.user_id
join lateral (
  -- their most recent half before the race
  select hs.total_s
    from public.half_sims hs
   where hs.user_id = r.user_id
     and hs.total_s is not null
     and hs.created_at::date <= r.race_date
   order by hs.created_at desc
   limit 1
) h on true
where r.result_s is not null
order by r.race_date desc;

grant select on public.multiplier_evidence to authenticated;

-- ---------- the number, and how much it's standing on ----------
drop function if exists public.club_multiplier() cascade;

create function public.club_multiplier()
returns table (
  in_use     numeric,
  measured   numeric,
  samples    bigint,
  spread     numeric,
  source     text
)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (select ratio from public.multiplier_evidence where ratio is not null),
  s as (
    select
      count(*)                                                      as n,
      -- percentile_cont returns double precision, and there is no
      -- round(double, int) in Postgres — only round(numeric, int).
      -- Cast at the source rather than at each use.
      (percentile_cont(0.5) within group (order by ratio))::numeric   as med,
      ((percentile_cont(0.9) within group (order by ratio))
       - (percentile_cont(0.1) within group (order by ratio)))::numeric as sp
    from e
  )
  select
    (select value::numeric from public.config where key = 'half_multiplier'),
    round(s.med, 3),
    s.n,
    round(s.sp, 3),
    case
      when s.n = 0 then 'No races finished yet — 2.12 is a starting assumption from published HYROX splits, not your data.'
      when s.n < 5 then 'From ' || s.n || ' race' || case when s.n = 1 then '' else 's' end ||
                        '. Too few to switch to yet, but worth watching.'
      else            'From ' || s.n || ' races. Enough to use.'
    end
  from s;
$$;

grant execute on function public.club_multiplier() to authenticated;

-- ---------- adopt it, when you decide to ----------
drop function if exists public.adopt_measured_multiplier() cascade;

create function public.adopt_measured_multiplier()
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare v_med numeric; v_n bigint;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select measured, samples into v_med, v_n from public.club_multiplier();

  if v_n < 5 then
    raise exception 'only % races on record — not enough to set the number by', v_n;
  end if;

  update public.config set value = v_med::text where key = 'half_multiplier';
  return v_med;
end;
$$;

grant execute on function public.adopt_measured_multiplier() to authenticated;


-- ============================================================
--  36_wotw.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the board, cut back to two things
--
--  The leaderboard had every configured board on it, which meant
--  five tabs nobody read. Two boards, both of which people
--  actually care about:
--
--    Salus Test — placing across the five tests, ranks summed,
--    lowest wins. Standing, slow-moving, earned over a block.
--
--    WOD — one session, everybody's score on it, resets every
--    Monday. Fast, disposable, and the reason anyone opens the
--    tab twice in a week.
--
--  Run after 35_multiplier.sql. Safe to re-run.
-- ============================================================

-- ---------- which session is this week's ----------
alter table public.sessions add column if not exists wotw boolean default false;
alter table public.sessions add column if not exists wotw_metric text;
--   time     fastest wins — a for-time piece
--   rounds   most wins — an AMRAP
--   weight   heaviest wins — a lift

create index if not exists sessions_wotw on public.sessions (wotw)
  where wotw;

-- Only one at a time.
drop function if exists public.set_wotw(uuid) cascade;

create function public.set_wotw(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  update public.sessions set wotw = false where wotw;
  update public.sessions set wotw = true where id = p_session;
end;
$$;

grant execute on function public.set_wotw(uuid) to authenticated;

-- ---------- the board ----------
--  Opt-in like everything else: a member who hasn't shared doesn't
--  appear. Ranked by whichever metric the session is scored on.
drop view if exists public.wotw_board cascade;

create view public.wotw_board
with (security_invoker = on) as
with the_one as (
  select s.id, s.title, coalesce(s.wotw_metric, 'time') as metric, s.est_min
    from public.sessions s where s.wotw limit 1
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

-- ---------- pick one to start with ----------
--  Whatever this week's most-logged session is, if nothing is set.
update public.sessions
   set wotw = true, wotw_metric = 'time'
 where id = (
   select s.id from public.sessions s
    join public.weeks w on w.id = s.week_id
   where s.kind <> 'rest'
     and not exists (select 1 from public.sessions x where x.wotw)
   order by (select count(*) from public.workout_logs l
              where l.session_id = s.id) desc,
            w.idx, s.day
   limit 1
 );


-- ============================================================
--  37_carry_media.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the images came back empty
--
--  33_one_programme moved everyone onto the new block, which had
--  never had a race photo or a cover set. The old programme's
--  images were still on the archived row, so members saw a card
--  with nothing behind it.
--
--  Carries the media across, and does the same for session covers
--  where a new session has none and an old one by the same name
--  did.
--
--  Run after 36_wotw.sql. Safe to re-run.
-- ============================================================

-- ---------- programme media ----------
update public.programmes new
   set race_image    = coalesce(new.race_image,    old.race_image),
       cover_url     = coalesce(new.cover_url,     old.cover_url),
       race_location = coalesce(new.race_location, old.race_location),
       race_name     = coalesce(new.race_name,     old.race_name),
       race_date     = coalesce(new.race_date,     old.race_date)
  from public.programmes old
 where new.slug = 'road-to-hyrox'
   and old.slug like 'road-to-hyrox-v%'
   and (new.race_image is null or new.cover_url is null);

-- ---------- session covers, matched by name ----------
--  A session called Lower A in the new block inherits the cover from
--  a session called Lower A in the old one. Names repeat across the
--  block on purpose, so this is safe.
update public.sessions s
   set cover_url = old.cover_url,
       video_url = coalesce(s.video_url, old.video_url),
       coach_id  = coalesce(s.coach_id,  old.coach_id)
  from (
    select distinct on (o.title) o.title, o.cover_url, o.video_url, o.coach_id
      from public.sessions o
      join public.weeks ow    on ow.id = o.week_id
      join public.programmes op on op.id = ow.programme_id
     where op.slug like 'road-to-hyrox-v%'
       and o.cover_url is not null
     order by o.title, o.id
  ) old
  join public.weeks w    on true
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id
   and pr.slug = 'road-to-hyrox'
   and s.title = old.title
   and s.cover_url is null;

-- ---------- and tell you what's still missing ----------
--  Rather than leaving you to find out on a member's phone.
drop view if exists public.missing_media cascade;

create view public.missing_media
with (security_invoker = on) as
select 'programme'::text as kind, pr.name as what,
       'No race photo — Programmes & words'::text as fix
  from public.programmes pr
 where not pr.archived and pr.race_image is null
union all
select 'session', s.title,
       'No cover image — open the session in the week editor'
  from public.sessions s
  join public.weeks w       on w.id = s.week_id
  join public.programmes pr on pr.id = w.programme_id
 where not pr.archived and s.cover_url is null and s.kind <> 'rest'
union all
select 'coach', c.name, 'No photo — Photos'
  from public.coaches c
 where c.photo_url is null;

grant select on public.missing_media to authenticated;


-- ============================================================
--  38_presence.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — faces, and who's here
--
--  The room was a wall of initials with no sense of how many
--  people were in it. Two things fix that: a picture, and
--  knowing who is actually reading right now.
--
--  Presence itself is not stored — it runs over Supabase
--  Realtime and lives only while someone has the app open.
--  Writing "last seen" to a table would mean a database write
--  every thirty seconds per member for something nobody needs
--  a history of.
--
--  Run after 37_carry_media.sql. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists photo_url text;

-- ---------- who's in the room, and what they look like ----------
--  Names and faces only. No numbers, no scores — this answers "who
--  else trains here", which is a different question from the
--  leaderboard and shouldn't leak the same data.
drop view if exists public.room_members cascade;

create view public.room_members
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.photo_url,
  (p.role = 'admin')                                     as is_coach,
  (select max(l.ended_at) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)    as last_trained
from public.profiles p
where p.name is not null
order by (p.role = 'admin') desc, p.name;

grant select on public.room_members to authenticated;


-- ============================================================
--  39_race_images.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — a set of race photos, not one
--
--  One image behind the countdown is the same image every
--  morning for eight weeks, which stops being a photograph and
--  becomes furniture. Fifteen of them and the card is worth
--  looking at again.
--
--  Rotation is by day, not random on every render — a picture
--  that changes while you are reading is a distraction, and a
--  member should be able to say "that shot of the sled" and
--  have someone else know which one.
--
--  Run after 38_presence.sql. Safe to re-run.
-- ============================================================

create table if not exists public.programme_images (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes on delete cascade not null,
  url          text not null,
  caption      text,
  ord          integer,
  created_at   timestamptz default now(),
  unique (programme_id, url)
);

alter table public.programme_images enable row level security;

drop policy if exists "read programme_images"  on public.programme_images;
drop policy if exists "admin programme_images" on public.programme_images;

create policy "read programme_images" on public.programme_images
  for select to authenticated using (true);

create policy "admin programme_images" on public.programme_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Carry across whatever single image is already set, so nothing is
-- lost and the set starts with one in it.
insert into public.programme_images (programme_id, url, ord)
select pr.id, pr.race_image, 1
  from public.programmes pr
 where pr.race_image is not null
on conflict (programme_id, url) do nothing;

-- ---------- today's picture ----------
--  Indexed on the date so it holds all day and everybody sees the
--  same one. Falls back to the single race_image when the set is
--  empty, so nothing breaks before any are uploaded.
drop function if exists public.todays_race_image(uuid) cascade;

create function public.todays_race_image(p_programme uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select i.url
       from public.programme_images i
      where i.programme_id = p_programme
      order by i.ord nulls last, i.id
      offset (
        -- days since epoch, wrapped by however many there are
        (current_date - date '2000-01-01') %
        greatest((select count(*) from public.programme_images
                   where programme_id = p_programme), 1)
      )
      limit 1),
    (select pr.race_image from public.programmes pr where pr.id = p_programme)
  );
$$;

grant execute on function public.todays_race_image(uuid) to authenticated;

-- ---------- and hand it to the app with the rest ----------
drop view if exists public.my_programme cascade;

create view public.my_programme
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
  public.todays_race_image(pr.id)         as race_image,
  pr.race_location,
  pr.race_date,
  (select count(*) from public.programme_images i
    where i.programme_id = pr.id)         as image_count
from public.profiles p
join public.programmes pr on pr.id = p.programme_id
where p.id = auth.uid();

grant select on public.my_programme to authenticated;


-- ============================================================
--  40_running_plan.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the running, properly
--
--  Three runs a week that each do a different job, from the
--  club's own coaching notes:
--
--    Easy      Zone 2 by Maffetone. Time in zone, not pace.
--    Intervals Six-minute blocks stepping up to race pace.
--    Speed     A rotating ladder of short reps.
--
--  All three progress by rule rather than by a number typed into
--  a session, so week six is derived from week one and a coach
--  changing the start changes the whole block.
--
--  Run after 39_race_images.sql. Safe to re-run.
-- ============================================================

-- ---------- what the zone needs ----------
--  A year, not a date of birth. Maffetone only needs the age, and
--  storing less is the right default.
alter table public.profiles add column if not exists birth_year integer;

-- ---------- the zone ----------
--  180 minus age. Five beats either side, ten in the heat — the app
--  doesn't know the weather, so it gives the band and says the rest.
--
--  Returns nothing rather than guessing when there's no birth year:
--  a made-up heart rate ceiling is worse than none.
drop function if exists public.my_aerobic_zone(uuid) cascade;

create function public.my_aerobic_zone(p_user uuid)
returns table (age integer, centre integer, low integer, high integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (extract(year from current_date)::integer - p.birth_year)          as age,
    (180 - (extract(year from current_date)::integer - p.birth_year))  as centre,
    (175 - (extract(year from current_date)::integer - p.birth_year))  as low,
    (185 - (extract(year from current_date)::integer - p.birth_year))  as high
  from public.profiles p
  where p.id = p_user and p.birth_year is not null;
$$;

grant execute on function public.my_aerobic_zone(uuid) to authenticated;

-- ---------- how a run session is shaped ----------
alter table public.sessions add column if not exists run_kind text;
--   easy       time in zone 2
--   intervals  six-minute blocks
--   speed      a rep ladder
--   long       the weekend one

alter table public.sessions add column if not exists run_minutes integer;
alter table public.sessions add column if not exists run_blocks integer;
alter table public.sessions add column if not exists run_ladder text;

-- ============================================================
--  THE PROGRESSION
--
--  Easy      20 min in week one, plus five a week. Past 40 the
--            instruction changes: hold the heart rate and let the
--            pace come up on its own.
--
--  Intervals 24 min in week one, plus six a week to 48. Then 60,
--            run as six ten-minute blocks instead of four sixes.
--
--  Speed     A five-session ladder that rotates. Reps get longer
--            and fewer, so the body meets a different demand each
--            week rather than the same one louder.
-- ============================================================

drop function if exists public.easy_minutes(integer) cascade;
create function public.easy_minutes(p_week integer)
returns integer language sql immutable as $$
  select least(20 + (p_week - 1) * 5, 60);
$$;

drop function if exists public.interval_minutes(integer) cascade;
create function public.interval_minutes(p_week integer)
returns integer language sql immutable as $$
  select case when p_week >= 6 then 60
              else least(24 + (p_week - 1) * 6, 48) end;
$$;

drop function if exists public.speed_ladder(integer) cascade;
create function public.speed_ladder(p_week integer)
returns text language sql immutable as $$
  select (array[
    '10 × 200m',
    '6 × 300m, 4 × 200m',
    '5 × 400m, 3 × 300m, 2 × 200m',
    '3 × 500m, 3 × 400m, 2 × 300m, 1 × 200m',
    '2 × 800m, 4 × 400m, 2 × 200m'
  ])[((p_week - 1) % 5) + 1];
$$;

-- ---------- write it into the block ----------
--  Tuesday is intervals, Friday is easy, Saturday keeps the long
--  run, and a second easy run goes on Thursday evening where the
--  double already sits.
do $$
declare
  w record;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    -- Tuesday morning: intervals
    update public.sessions
       set run_kind    = 'intervals',
           run_minutes = public.interval_minutes(w.idx),
           run_blocks  = case when w.idx >= 6 then 6 else
                           public.interval_minutes(w.idx) / 6 end,
           est_min     = public.interval_minutes(w.idx) + 16,
           focus       = 'Running',
           body        = 'Six minutes of warm-up, stepping up to race pace. '
                      || 'Then ' || (case when w.idx >= 6 then 6 else
                           public.interval_minutes(w.idx) / 6 end)
                      || ' blocks. The point is learning what recovery pace '
                      || 'feels like next to race pace, not the total.'
     where week_id = w.id and day = 2 and coalesce(slot, 1) = 1;

    -- Friday: easy
    update public.sessions
       set run_kind    = 'easy',
           run_minutes = public.easy_minutes(w.idx),
           est_min     = public.easy_minutes(w.idx) + 15,
           focus       = 'Zone 2',
           body        = 'Time in zone, not pace. If the heart rate climbs '
                      || 'above the band, slow down or walk until it comes '
                      || 'back — that is the session working, not failing.'
     where week_id = w.id and day = 5;

    -- Thursday evening: the second easy run
    update public.sessions
       set run_kind    = 'easy',
           run_minutes = greatest(public.easy_minutes(w.idx) - 10, 20),
           focus       = 'Zone 2'
     where week_id = w.id and day = 4 and coalesce(slot, 1) = 2;

    -- Monday evening becomes the speed session, which the block was
    -- missing entirely — it had two easy runs and no strides.
    update public.sessions
       set run_kind    = 'speed',
           run_ladder  = public.speed_ladder(w.idx),
           est_min     = 40,
           title       = 'Speed',
           tag         = 'PM',
           focus       = 'Running fast',
           body        = public.speed_ladder(w.idx)
                      || '. Above race pace, 60 seconds walking or jogging '
                      || 'between. Every rep should feel the same — if the '
                      || 'last one is slower than the first, the recovery '
                      || 'was too short.'
     where week_id = w.id and day = 1 and coalesce(slot, 1) = 2;

    -- Saturday stays long, but with a target
    update public.sessions
       set run_kind    = 'long',
           run_minutes = least(60 + (w.idx - 1) * 10, 120),
           focus       = 'Aerobic base'
     where week_id = w.id and day = 6 and kind = 'run';
  end loop;
end $$;

-- ---------- what this week's running asks of me ----------
drop view if exists public.my_running_week cascade;

create view public.my_running_week
with (security_invoker = on) as
select
  s.id,
  s.day,
  coalesce(s.slot, 1)                       as slot,
  s.title,
  s.run_kind,
  s.run_minutes,
  s.run_blocks,
  s.run_ladder,
  w.idx                                     as week_idx,
  z.centre                                  as hr_centre,
  z.low                                     as hr_low,
  z.high                                    as hr_high
from public.sessions s
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
join public.profiles p    on p.id = auth.uid()
left join lateral public.my_aerobic_zone(auth.uid()) z on true
where pr.id = p.programme_id
  and w.idx = coalesce(p.week_idx, 1)
  and s.run_kind is not null
order by s.day, coalesce(s.slot, 1);

grant select on public.my_running_week to authenticated;


-- ============================================================
--  41_ten_tests.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — ten tests
--
--  Five became ten. Three lifts instead of one, and two station
--  tests that the model was previously guessing at.
--
--  The sled and the wall balls are the additions that earn their
--  place: six of the eight stations are currently a flat 330
--  seconds each in predict_finish, which is a constant rather
--  than a measurement. Those two vary most between members and
--  can't be derived from a squat or an erg.
--
--  Run after 40_running_plan.sql. Safe to re-run.
-- ============================================================

create table if not exists public.test_defs (
  key        text primary key,
  label      text not null,
  unit       text not null,          -- kg | time | reps
  hint       text,
  ord        integer not null,
  scored     boolean default true,   -- counts toward the Salus Score
  feeds      text                    -- what it sets in the programme
);

alter table public.test_defs enable row level security;

drop policy if exists "read test_defs"  on public.test_defs;
drop policy if exists "admin test_defs" on public.test_defs;

create policy "read test_defs" on public.test_defs
  for select to authenticated using (true);
create policy "admin test_defs" on public.test_defs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds) values
  ('bw',      'Bodyweight',        'kg',   'Everything relative is worked out from it.',                    1, false,
   'The squat and deadlift percentages, and how the sleds are scaled.'),
  ('squat',   'Back squat 3RM',    'kg',   'Three reps, as heavy as form holds.',                           2, true,
   'Every squat, lunge and step-up weight in the block.'),
  ('deadlift','Deadlift 5RM',      'kg',   'Five reps. Stop the set when the back rounds, not when it fails.', 3, true,
   'Deadlift and Romanian deadlift loads.'),
  ('press',   'Shoulder press 1RM','kg',   'Strict, from the rack or the floor.',                           4, true,
   'Push press and overhead work.'),
  ('fivek',   '5km',               'time', 'Flat, fresh, honest.',                                          5, true,
   'Every running pace in the block, and half the projection.'),
  ('ski',     '1,000m SkiErg',     'time', 'Station one, and a read on your engine.',                        6, true,
   'The ski leg of the projection.'),
  ('row',     '1,000m Row',        'time', 'Station five, fresh.',                                          7, true,
   'The row leg of the projection.'),
  ('sled',    'Sled push 50m',     'time', 'At race weight. Technique more than strength — most people are slower here than they expect.', 8, true,
   'The sled legs of the projection, which were a flat guess before.'),
  ('wallball','Wall balls',        'reps', 'Max unbroken, 6kg to a 9ft target. Stop when you break, not when you fail.', 9, true,
   'The last station, and the one that decides how a race ends.'),
  ('half',    'The Salus Half',    'time', 'Four runs, four stations. The one that turns an estimate into a projection.', 10, true,
   'The whole projection.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

-- ---------- the standards the score is measured against ----------
--  Matches the shape test_standards already has: a floor that scores
--  zero and a target that scores a hundred, with lower_wins for times
--  and per_kg for lifts. Not the five-band shape used by
--  pillar_standards — two different jobs, two different tables.
insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('deadlift', 'm', 'Deadlift 5RM',       1.10, 2.30, false, true,  'ratio',  6),
  ('deadlift', 'f', 'Deadlift 5RM',       0.85, 1.85, false, true,  'ratio',  6),
  ('press',    'm', 'Shoulder press 1RM', 0.45, 0.95, false, true,  'ratio',  7),
  ('press',    'f', 'Shoulder press 1RM', 0.30, 0.72, false, true,  'ratio',  7),
  ('sled',     'm', 'Sled push 50m',      80,   38,   true,  false, 'time',   8),
  ('sled',     'f', 'Sled push 50m',      95,   45,   true,  false, 'time',   8),
  ('wallball', 'm', 'Wall balls',         20,   120,  false, false, 'reps',   9),
  ('wallball', 'f', 'Wall balls',         16,   100,  false, false, 'reps',   9)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

-- ---------- how many are in ----------
drop view if exists public.my_tests cascade;

create view public.my_tests
with (security_invoker = on) as
select
  d.key, d.label, d.unit, d.hint, d.ord, d.scored, d.feeds,
  case d.key
    when 'half' then (select h.total_s::numeric from public.half_sims h
                       where h.user_id = auth.uid()
                         and h.total_s is not null
                       order by h.created_at desc limit 1)
    else coalesce(
      (select b.value_num from public.benchmarks b
        where b.user_id = auth.uid() and b.key = d.key and b.week = 1),
      (select b.value_s::numeric from public.benchmarks b
        where b.user_id = auth.uid() and b.key = d.key and b.week = 1))
  end                                                        as value
from public.test_defs d
order by d.ord;

grant select on public.my_tests to authenticated;

-- ---------- the prediction, with the sleds measured ----------
--  Replaces the flat 330-per-station constant for the two stations
--  we now have real numbers for. The rest stay constant, honestly
--  labelled as such.
drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k    integer; v_ski integer; v_row integer;
  v_sled  integer; v_wb  numeric;
  v_squat numeric; v_bw  numeric;
  v_have  integer := 0;

  c_riegel constant numeric := 1.028;   -- 5km to 8km, Riegel at 1.06
  c_erg    constant numeric := 1.10;    -- ergs mid-race vs fresh
  c_rox    constant integer := 330;     -- a station we haven't measured
  c_zone   constant integer := 330;     -- walking between stations

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_s   into v_sled  from public.benchmarks b where b.user_id = p_user and b.key = 'sled'     and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int
          + (v_sled is not null)::int + (v_wb is not null)::int;

  -- Running: Riegel out to 8km, then a penalty for doing it in eight
  -- pieces with a station between each.
  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  -- The ergs, slowed for being done mid-race.
  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- The sleds. Two of them, and the race weight is heavier than a
  -- fresh 50m test feels — 1.25 for the push, 1.35 for the pull,
  -- which is harder for most people.
  v_stations := v_stations
              + round(coalesce(v_sled, 55) * 1.25)
              + round(coalesce(v_sled, 55) * 1.35);

  -- Wall balls. 100 reps at the end of a race, off a max-unbroken
  -- set: someone who can hold 100 unbroken does them in about two
  -- and a half minutes, someone who breaks at 20 takes twice that.
  v_stations := v_stations
              + case when v_wb is null then 300
                     else greatest(150, round(150 + (100 - least(v_wb, 100)) * 3.2))
                end;

  -- The four we still have no measurement for: burpee broad jump,
  -- farmers carry, lunges, and the run-out. Flat, and honest about it.
  v_stations := v_stations + c_rox * 4;

  -- A stronger squat helps the sleds a little, but much less than
  -- people expect — it's a technique problem far more than a
  -- strength one.
  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(70, greatest(-50, round(((v_squat / v_bw) - 1.2) * 80)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 5 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 5 then 'from ' || v_have || ' tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;


-- ============================================================
--  42_pillars.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — strength, engine, stations
--
--  One Salus Score says where you rank. It doesn't say what to
--  do on Monday. Three do:
--
--    Strength  the three lifts, relative to bodyweight
--    Engine    5km, ski, row
--    Stations  sled and wall balls
--
--  Relative to bodyweight throughout, because HYROX is carrying
--  yourself for eight kilometres. An 80kg member pressing 60 is
--  in better shape for it than a 110kg member pressing 70, and
--  an absolute number says the opposite.
--
--  Run after 41_ten_tests.sql. Safe to re-run.
-- ============================================================

-- ---------- what good looks like, as multiples of bodyweight ----------
create table if not exists public.pillar_standards (
  key    text not null,
  sex    text not null,
  poor   numeric, ok numeric, good numeric, great numeric, elite numeric,
  primary key (key, sex)
);

alter table public.pillar_standards enable row level security;

drop policy if exists "read pillar_standards"  on public.pillar_standards;
drop policy if exists "admin pillar_standards" on public.pillar_standards;

create policy "read pillar_standards" on public.pillar_standards
  for select to authenticated using (true);
create policy "admin pillar_standards" on public.pillar_standards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

--  Lifts as a multiple of bodyweight. Times in seconds, lower better.
--  Wall balls in reps, higher better.
insert into public.pillar_standards (key, sex, poor, ok, good, great, elite) values
  ('squat_bw',    'm', 0.90, 1.20, 1.50, 1.80, 2.20),
  ('squat_bw',    'f', 0.70, 0.95, 1.20, 1.45, 1.80),
  ('deadlift_bw', 'm', 1.10, 1.45, 1.80, 2.15, 2.60),
  ('deadlift_bw', 'f', 0.85, 1.15, 1.45, 1.75, 2.10),
  ('press_bw',    'm', 0.45, 0.60, 0.75, 0.90, 1.10),
  ('press_bw',    'f', 0.30, 0.42, 0.55, 0.68, 0.85),
  ('fivek',       'm', 1800, 1620, 1440, 1290, 1140),
  ('fivek',       'f', 2010, 1800, 1620, 1440, 1290),
  ('ski',         'm',  300,  270,  245,  225,  205),
  ('ski',         'f',  345,  310,  280,  255,  232),
  ('row',         'm',  290,  262,  238,  218,  198),
  ('row',         'f',  335,  300,  272,  248,  225),
  ('sled',        'm',   80,   64,   52,   43,   35),
  ('sled',        'f',   95,   76,   62,   51,   41),
  ('wallball',    'm',   25,   45,   70,  100,  140),
  ('wallball',    'f',   20,   38,   60,   85,  120)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

-- ---------- one test, scored 0 to 100 ----------
--  Piecewise between the five anchors, so the curve is flat where
--  progress is easy and steep where it isn't. Clamped: nobody scores
--  120 for a freak lift, and nobody scores below zero for a bad day.
drop function if exists public.score_one(text, text, numeric) cascade;

create function public.score_one(p_key text, p_sex text, p_value numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.pillar_standards%rowtype;
  lower_better boolean;
  bands numeric[];
  marks numeric[] := array[20, 40, 60, 80, 100];
  i integer;
begin
  select * into s from public.pillar_standards
   where key = p_key and sex = coalesce(p_sex, 'm');
  if not found or p_value is null then return null; end if;

  lower_better := p_key in ('fivek', 'ski', 'row', 'sled');
  bands := array[s.poor, s.ok, s.good, s.great, s.elite];

  if lower_better then
    if p_value >= bands[1] then return 20 * (bands[1] / p_value); end if;
    if p_value <= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value > bands[i + 1] then
        return marks[i] + 20 *
          ((bands[i] - p_value) / nullif(bands[i] - bands[i + 1], 0));
      end if;
    end loop;
  else
    if p_value <= bands[1] then return 20 * (p_value / nullif(bands[1], 0)); end if;
    if p_value >= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value < bands[i + 1] then
        return marks[i] + 20 *
          ((p_value - bands[i]) / nullif(bands[i + 1] - bands[i], 0));
      end if;
    end loop;
  end if;
  return 100;
end;
$$;

grant execute on function public.score_one(text, text, numeric) to authenticated;

-- ---------- the three pillars ----------
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar   text,
  score    numeric,
  tests    integer,
  weakest  text,
  detail   jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
  v_squat numeric; v_dead numeric; v_press numeric;
  v_5k numeric; v_ski numeric; v_row numeric;
  v_sled numeric; v_wb numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric;
  s_sled numeric; s_wb numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift' and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'    and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_s   into v_sled  from public.benchmarks b where b.user_id = p_user and b.key = 'sled'     and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;

  -- Lifts only score with a bodyweight to divide by. Without one the
  -- pillar is honestly empty rather than quietly absolute.
  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k   := public.score_one('fivek',    v_sex, v_5k);
  s_ski  := public.score_one('ski',      v_sex, v_ski);
  s_row  := public.score_one('row',      v_sex, v_row);
  s_sled := public.score_one('sled',     v_sex, v_sled);
  s_wb   := public.score_one('wallball', v_sex, v_wb);

  return query
  select * from (values
    ('Strength'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead), ('Shoulder press', s_press)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead), 'Shoulder press', round(s_press))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('SkiErg', s_ski), ('Row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski), 'Row', round(s_row))),

    ('Stations',
     (select round(avg(x), 0) from unnest(array[s_sled, s_wb]) x where x is not null),
     (select count(*)::integer from unnest(array[s_sled, s_wb]) x where x is not null),
     (select k from (values ('Sled push', s_sled), ('Wall balls', s_wb)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Sled push', round(s_sled), 'Wall balls', round(s_wb)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;


-- ============================================================
--  43_eight_tests.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — back to eight
--
--  The sled and the wall balls come out. Reasonable call: both
--  need equipment set to race weight and a consistent target
--  height to mean anything, and a test nobody can repeat the
--  same way twice is worse than no test.
--
--  So the model goes back to treating the six unmeasured
--  stations as a constant. That is honest — it was never
--  pretending otherwise.
--
--  Run after 42_pillars.sql. Safe to re-run.
-- ============================================================

delete from public.test_defs      where key in ('sled', 'wallball');
delete from public.test_standards where key in ('sled', 'wallball');
delete from public.pillar_standards where key in ('sled', 'wallball');

-- Anything already recorded stays. Removing a member's number because
-- the test was retired is not the app's decision to make.

-- ---------- two pillars, not three ----------
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar   text,
  score    numeric,
  tests    integer,
  weakest  text,
  detail   jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
  v_squat numeric; v_dead numeric; v_press numeric;
  v_5k numeric; v_ski numeric; v_row numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift' and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'    and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k  := public.score_one('fivek', v_sex, v_5k);
  s_ski := public.score_one('ski',   v_sex, v_ski);
  s_row := public.score_one('row',   v_sex, v_row);

  return query
  select * from (values
    ('Strength'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead), ('Shoulder press', s_press)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead), 'Shoulder press', round(s_press))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_ski, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('SkiErg', s_ski), ('Row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski), 'Row', round(s_row)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- the prediction, without them ----------
drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k integer; v_ski integer; v_row integer;
  v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;   -- 5km to 8km, Riegel at 1.06
  c_erg    constant numeric := 1.10;    -- ergs mid-race vs fresh
  c_rox    constant integer := 330;     -- a station we don't measure
  c_zone   constant integer := 330;     -- walking between stations

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek' and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'   and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'   and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat' and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'    and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg)
              + c_rox * 6;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 4 then 'good'
          when v_have = 3  then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have = 3  then 'from three tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;


-- ============================================================
--  44_wallballs.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — wall balls back in, sled stays out
--
--  The two were removed together, but they aren't the same
--  test. Wall balls are standard everywhere: a 6kg or 9kg ball
--  to a fixed target height. A member can do the test at Salus,
--  at a HYROX, or anywhere else and the number means the same
--  thing.
--
--  The sled doesn't travel. Surface, sled type and what "race
--  weight" means all vary by floor, so the number is about the
--  gym as much as the athlete.
--
--  Nine tests, and one more measured station in the model.
--
--  Run after 43_eight_tests.sql. Safe to re-run.
-- ============================================================

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds)
values
  ('wallball', 'Wall balls unbroken', 'reps',
   'How many before you put the ball down. 6kg to a 9ft target, or 9kg to 10ft. Stop when you break the set, not when you fail a rep.',
   9, true,
   'The last station, and how much of it you can do without putting the ball down.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('wallball', 'm', 'Wall balls unbroken', 20, 120, false, false, 'reps', 9),
  ('wallball', 'f', 'Wall balls unbroken', 16, 100, false, false, 'reps', 9)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

insert into public.pillar_standards (key, sex, poor, ok, good, great, elite)
values
  ('wallball', 'm', 25, 45, 70, 100, 140),
  ('wallball', 'f', 20, 38, 60,  85, 120)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

-- ---------- it joins the engine ----------
--  Not a third pillar on its own. One test doesn't make a category,
--  and a hundred wall balls at the end of a race is an aerobic
--  problem far more than a strength one — which is why people who
--  can squat break at thirty.
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar   text,
  score    numeric,
  tests    integer,
  weakest  text,
  detail   jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
  v_squat numeric; v_dead numeric; v_press numeric;
  v_5k numeric; v_ski numeric; v_row numeric; v_wb numeric;
  s_squat numeric; s_dead numeric; s_press numeric;
  s_5k numeric; s_ski numeric; s_row numeric; s_wb numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift' and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'    and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
  end if;

  s_5k  := public.score_one('fivek',    v_sex, v_5k);
  s_ski := public.score_one('ski',      v_sex, v_ski);
  s_row := public.score_one('row',      v_sex, v_row);
  s_wb  := public.score_one('wallball', v_sex, v_wb);

  return query
  select * from (values
    ('Strength'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead, s_press]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead), ('Shoulder press', s_press)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead), 'Shoulder press', round(s_press))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_ski, s_row, s_wb]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_ski, s_row, s_wb]) x where x is not null),
     (select k from (values ('5km', s_5k), ('SkiErg', s_ski), ('Row', s_row), ('Wall balls', s_wb)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), 'SkiErg', round(s_ski),
                        'Row', round(s_row), 'Wall balls', round(s_wb)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- and into the prediction ----------
drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k integer; v_ski integer; v_row integer;
  v_wb numeric; v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;
  c_erg    constant numeric := 1.10;
  c_rox    constant integer := 330;   -- a station we don't measure
  c_zone   constant integer := 330;

  v_run integer; v_stations integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'    and b.week = 1;
  select b.value_s   into v_ski   from public.benchmarks b where b.user_id = p_user and b.key = 'ski'      and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'      and b.week = 1;
  select b.value_num into v_wb    from public.benchmarks b where b.user_id = p_user and b.key = 'wallball' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'    and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'       and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int
          + (v_wb is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- A hundred wall balls at the end of a race. Someone holding a
  -- hundred unbroken gets through in about two and a half minutes;
  -- someone breaking at twenty takes closer to seven, because every
  -- break costs the pick-up as well as the rest.
  v_stations := v_stations
              + case when v_wb is null then 300
                     else greatest(150, round(150 + (100 - least(v_wb, 100)) * 3.2))
                end;

  -- The seven we still don't measure.
  v_stations := v_stations + c_rox * 5;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 5 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 5 then 'from all five tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;


-- ============================================================
--  45_preferences.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the settings a training app needs
--
--  Two of these matter more than they look:
--
--  Screen lock. A phone that sleeps between sets means unlocking
--  it with chalk on your hands, every set, for an hour.
--
--  Timer sounds. A beep is right in an empty garage and wrong in
--  a class at seven in the morning, and the app can't know which
--  one you're in.
--
--  Run after 44_wallballs.sql. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists units text default 'metric';
alter table public.profiles add column if not exists keep_awake boolean default true;
alter table public.profiles add column if not exists timer_sounds boolean default false;

update public.profiles set units        = 'metric' where units is null;
update public.profiles set keep_awake   = true     where keep_awake is null;
update public.profiles set timer_sounds = false    where timer_sounds is null;


-- ============================================================
--  46_running_in_the_block.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the running IS the block's running
--
--  40_running_plan wrote the progression onto the HYROX block's
--  sessions but left the seeded titles alone, so Tuesday said
--  "Threshold 800s" while the plan underneath said 30 minutes in
--  five blocks. Two descriptions of one session.
--
--  This makes them one thing: the title, the body and the
--  structure all come from the same rule, so changing the
--  progression changes what a member reads.
--
--  Wednesday is deliberately untouched. Compromised running is
--  the HYROX-specific session and it isn't part of a general
--  running plan — it's the thing the running plan exists to
--  support.
--
--  Run after 45_preferences.sql. Safe to re-run.
-- ============================================================

do $$
declare
  w record;
  v_int_min integer;
  v_blocks  integer;
  v_easy    integer;
  v_ladder  text;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    v_int_min := public.interval_minutes(w.idx);
    v_blocks  := case when w.idx >= 6 then 6 else v_int_min / 6 end;
    v_easy    := public.easy_minutes(w.idx);
    v_ladder  := public.speed_ladder(w.idx);

    -- ---------- Monday evening: speed ----------
    update public.sessions
       set title       = 'Speed',
           tag         = 'PM',
           kind        = 'run',
           run_kind    = 'speed',
           run_ladder  = v_ladder,
           est_min     = 40,
           focus       = 'Running fast',
           body        = v_ladder || ', above race pace. Sixty seconds '
                      || 'walking or jogging between. Every rep should feel '
                      || 'the same — if the last is slower than the first, '
                      || 'the recovery was too short.'
     where week_id = w.id and day = 1 and coalesce(slot, 1) = 2;

    -- ---------- Tuesday: intervals ----------
    update public.sessions
       set title       = 'Intervals',
           kind        = 'run',
           run_kind    = 'intervals',
           run_minutes = v_int_min,
           run_blocks  = v_blocks,
           est_min     = v_int_min + 16,
           focus       = 'Race pace',
           body        = v_int_min || ' minutes of work in ' || v_blocks
                      || case when w.idx >= 6
                              then ' ten-minute blocks — three easy, three '
                                || 'moderate, four at or above race pace.'
                              else ' six-minute blocks. Two minutes two '
                                || 'kilometres an hour under race pace, two '
                                || 'minutes one under, two minutes at it.'
                         end
                      || ' Six minutes of warm-up first, building to race '
                      || 'pace. The point is learning what recovery feels '
                      || 'like next to race pace, not the total.'
     where week_id = w.id and day = 2 and coalesce(slot, 1) = 1;

    -- ---------- Thursday evening: the second easy run ----------
    update public.sessions
       set title       = 'Easy',
           tag         = 'PM',
           kind        = 'run',
           run_kind    = 'easy',
           run_minutes = greatest(v_easy - 10, 20),
           est_min     = greatest(v_easy - 10, 20) + 5,
           focus       = 'Zone 2',
           body        = 'Conversational the whole way. If the heart rate '
                      || 'climbs above the band, slow down or walk until it '
                      || 'comes back.'
     where week_id = w.id and day = 4 and coalesce(slot, 1) = 2;

    -- ---------- Friday: the main easy run ----------
    update public.sessions
       set title       = 'Easy',
           kind        = 'run',
           run_kind    = 'easy',
           run_minutes = v_easy,
           est_min     = v_easy + 15,
           focus       = 'Zone 2',
           body        = v_easy || ' minutes in zone two, then core. Time '
                      || 'in zone is the whole session — pace is a '
                      || 'by-product.'
                      || case when v_easy >= 40
                              then ' You are past forty minutes now, so hold '
                                || 'the heart rate and let the pace come up '
                                || 'on its own.'
                              else '' end
     where week_id = w.id and day = 5;

    -- ---------- Saturday: the long one ----------
    --  Stays mixed on the HYROX block — a long run with stations in
    --  it is closer to the race than a pure long run, and the plan's
    --  long-run progression still governs the running part.
    update public.sessions
       set run_kind    = 'long',
           run_minutes = least(60 + (w.idx - 1) * 10, 120),
           focus       = 'Aerobic base'
     where week_id = w.id and day = 6 and kind = 'run';
  end loop;
end $$;

-- ---------- what this week's running looks like, in one line ----------
--  For the Train screen, so a member can see the shape of the week
--  without opening five sessions.
drop view if exists public.my_running_week cascade;

create view public.my_running_week
with (security_invoker = on) as
select
  s.id,
  s.day,
  coalesce(s.slot, 1)                       as slot,
  s.title,
  s.run_kind,
  s.run_minutes,
  s.run_blocks,
  s.run_ladder,
  w.idx                                     as week_idx,
  z.centre                                  as hr_centre,
  z.low                                     as hr_low,
  z.high                                    as hr_high,
  case s.run_kind
    when 'easy'      then s.run_minutes || ' min in zone 2'
    when 'long'      then s.run_minutes || ' min, long'
    when 'intervals' then s.run_minutes || ' min · ' || s.run_blocks || ' blocks'
    when 'speed'     then s.run_ladder
  end                                       as summary
from public.sessions s
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
join public.profiles p    on p.id = auth.uid()
left join lateral public.my_aerobic_zone(auth.uid()) z on true
where pr.id = p.programme_id
  and w.idx = coalesce(p.week_idx, 1)
  and s.run_kind is not null
order by s.day, coalesce(s.slot, 1);

grant select on public.my_running_week to authenticated;


-- ============================================================
--  47_targets.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — what you'd have to lift
--
--  "Your strength is 62" is a grade, not an instruction. The
--  useful version is the number that would move it: a squat of
--  132kg puts you in the next band.
--
--  Run after 46_running_in_the_block.sql. Safe to re-run.
-- ============================================================

drop function if exists public.my_targets(uuid) cascade;

create function public.my_targets(p_user uuid)
returns table (
  key       text,
  label     text,
  unit      text,
  now_value numeric,
  band      text,
  next_band text,
  next_value numeric,
  elite_value numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;
  select b.value_num into v_bw
    from public.benchmarks b
   where b.user_id = p_user and b.key = 'bw' and b.week = 1;

  return query
  with mine as (
    select
      d.key,
      case d.key
        when 'squat_bw'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'squat' and b.week = 1)
        when 'deadlift_bw' then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'deadlift' and b.week = 1)
        when 'press_bw'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'press' and b.week = 1)
        when 'wallball'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'wallball' and b.week = 1)
        else                    (select b.value_s::numeric from public.benchmarks b
                                  where b.user_id = p_user and b.key = d.key and b.week = 1)
      end                                                  as raw,
      d.poor, d.ok, d.good, d.great, d.elite,
      (d.key like '%\_bw')                                  as per_kg,
      (d.key in ('fivek','ski','row'))                     as lower_better
    from public.pillar_standards d
    where d.sex = v_sex
  ),
  named as (
    select m.*,
      case m.key
        when 'squat_bw'    then 'Back squat'
        when 'deadlift_bw' then 'Deadlift'
        when 'press_bw'    then 'Shoulder press'
        when 'fivek'       then '5km'
        when 'ski'         then 'SkiErg'
        when 'row'         then 'Row'
        when 'wallball'    then 'Wall balls'
      end                                                  as nice,
      case
        when m.per_kg and v_bw > 0 then m.raw / v_bw
        else m.raw
      end                                                  as value
    from mine m
  )
  select
    n.key,
    n.nice,
    case when n.per_kg then 'kg' when n.lower_better then 'time' else 'reps' end,
    n.raw,
    -- which band they're in
    case
      when n.value is null then null
      when n.lower_better then
        case when n.value <= n.elite then 'elite'
             when n.value <= n.great then 'great'
             when n.value <= n.good  then 'good'
             when n.value <= n.ok    then 'ok'
             else 'building' end
      else
        case when n.value >= n.elite then 'elite'
             when n.value >= n.great then 'great'
             when n.value >= n.good  then 'good'
             when n.value >= n.ok    then 'ok'
             else 'building' end
    end,
    -- and the one above it
    case
      when n.value is null then 'ok'
      when n.lower_better then
        case when n.value <= n.elite then null
             when n.value <= n.great then 'elite'
             when n.value <= n.good  then 'great'
             when n.value <= n.ok    then 'good'
             else 'ok' end
      else
        case when n.value >= n.elite then null
             when n.value >= n.great then 'elite'
             when n.value >= n.good  then 'great'
             when n.value >= n.ok    then 'good'
             else 'ok' end
    end,
    -- what it would take, in the unit they actually use
    round(
      case
        when n.value is null then (case when n.per_kg then n.ok * coalesce(v_bw, 0) else n.ok end)
        when n.lower_better then
          case when n.value <= n.elite then n.elite
               when n.value <= n.great then n.elite
               when n.value <= n.good  then n.great
               when n.value <= n.ok    then n.good
               else n.ok end
        else
          (case when n.value >= n.elite then n.elite
                when n.value >= n.great then n.elite
                when n.value >= n.good  then n.great
                when n.value >= n.ok    then n.good
                else n.ok end)
          * (case when n.per_kg then coalesce(v_bw, 0) else 1 end)
      end
    , case when n.lower_better then 0 else 0 end),
    round(n.elite * (case when n.per_kg then coalesce(v_bw, 0) else 1 end), 0)
  from named n
  where n.nice is not null
  order by n.nice;
end;
$$;

grant execute on function public.my_targets(uuid) to authenticated;


-- ============================================================
--  48_badges.sql
-- ============================================================

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


-- ============================================================
--  49_hybrid_tests.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — nine tests for a hybrid athlete
--
--  What changed and why:
--
--  Both ergs became one 2km row. A 1k ski and a 1k row are two
--  tests measuring nearly the same thing — three or four minutes
--  of the same engine. The 2km is the standard hybrid benchmark,
--  long enough to be a threshold test rather than a sprint, and
--  everybody already knows what a good one is.
--
--  Wall balls became a 400m. Wall balls tell you about one
--  event's last five minutes; speed is the thing hybrid
--  programmes neglect and the marker that separates a fit person
--  from a fast one. It also feeds the pace work directly.
--
--  A pull-up went in. Squat, deadlift and press cover legs and
--  push and left the pulling side entirely unmeasured, which for
--  a hybrid athlete is a real hole.
--
--  All three barbell lifts moved to 3RM. One conversion, clean
--  comparisons when somebody retests, and safer than a 1RM for
--  members who aren't competitive lifters.
--
--  Nothing already recorded is deleted. A retired test's number
--  stays on the row — that was the member's work.
--
--  Run after 48_badges.sql. Safe to re-run.
-- ============================================================

delete from public.test_defs        where key in ('ski', 'wallball');
delete from public.test_standards   where key in ('ski', 'wallball');
delete from public.pillar_standards where key in ('ski', 'wallball');

insert into public.test_defs (key, label, unit, hint, ord, scored, feeds) values
  ('bw',       'Bodyweight',       'kg',   'Everything relative is worked out from it.', 1, false,
   'Every lift target, and how the sleds get scaled.'),

  ('squat',    'Back squat 3RM',   'kg',   'Three reps, as heavy as form holds. Stop the set when the depth goes.', 2, true,
   'Squats, lunges, step-ups and anything else on your legs.'),

  ('deadlift', 'Deadlift 3RM',     'kg',   'Three reps. Stop when the back rounds, not when it fails.', 3, true,
   'Deadlifts, Romanian deadlifts, and the sled pull.'),

  ('press',    'Strict press 3RM', 'kg',   'Strict — no dip, no drive. Three reps.', 4, true,
   'Push press and everything overhead.'),

  ('pullup',   'Weighted pull-up 3RM', 'kg', 'Total load: your bodyweight plus anything added. Three strict reps. Bodyweight only is a valid answer.', 5, true,
   'Pull-ups, rows, and how well you hold a farmers carry.'),

  ('fivek',    '5km',              'time', 'Flat, fresh, honest.', 6, true,
   'Every running pace in the block, and half the projection.'),

  ('row',      '2,000m Row',       'time', 'The hybrid benchmark. Threshold, not a sprint — go out too hard and the last 500 will tell you.', 7, true,
   'Your erg pacing, and the row leg of the projection.'),

  ('fourhundred','400m',           'time', 'Flat out, from a standing start. One rep, fully rested.', 8, true,
   'Speed work targets, and a read on what you have got at the end of a race.'),

  ('half',     'The Salus Half',   'time', 'Four runs, four stations. Turns an estimate into a projection.', 9, true,
   'The whole projection.')
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, hint = excluded.hint,
      ord = excluded.ord, scored = excluded.scored, feeds = excluded.feeds;

-- ---------- what good looks like ----------
--
--  Lifts as a multiple of bodyweight. The pull-up is total load over
--  bodyweight, so a strict bodyweight-only triple is exactly 1.00 and
--  everybody sits on one scale — no branching between "can you do a
--  pull-up" and "how much can you add".
insert into public.pillar_standards (key, sex, poor, ok, good, great, elite) values
  ('squat_bw',     'm', 0.90, 1.20, 1.50, 1.80, 2.20),
  ('squat_bw',     'f', 0.70, 0.95, 1.20, 1.45, 1.80),
  ('deadlift_bw',  'm', 1.10, 1.45, 1.80, 2.15, 2.60),
  ('deadlift_bw',  'f', 0.85, 1.15, 1.45, 1.75, 2.10),
  ('press_bw',     'm', 0.42, 0.55, 0.70, 0.85, 1.00),
  ('press_bw',     'f', 0.28, 0.38, 0.50, 0.62, 0.78),
  ('pullup_bw',    'm', 0.85, 1.00, 1.15, 1.30, 1.50),
  ('pullup_bw',    'f', 0.80, 1.00, 1.12, 1.25, 1.42),
  ('fivek',        'm', 1800, 1620, 1440, 1290, 1140),
  ('fivek',        'f', 2010, 1800, 1620, 1440, 1290),
  ('row',          'm',  510,  465,  428,  400,  375),
  ('row',          'f',  580,  528,  485,  452,  420),
  ('fourhundred',  'm',   90,   80,   72,   65,   58),
  ('fourhundred',  'f',  105,   93,   84,   76,   68)
on conflict (key, sex) do update
  set poor = excluded.poor, ok = excluded.ok, good = excluded.good,
      great = excluded.great, elite = excluded.elite;

insert into public.test_standards
  (key, sex, label, floor_v, target_v, lower_wins, per_kg, unit, ord)
values
  ('pullup',      'm', 'Weighted pull-up 3RM', 0.85, 1.55, false, true,  'ratio', 5),
  ('pullup',      'f', 'Weighted pull-up 3RM', 0.80, 1.45, false, true,  'ratio', 5),
  ('row',         'm', '2,000m Row',            510,  370, true,  false, 'time',  7),
  ('row',         'f', '2,000m Row',            580,  415, true,  false, 'time',  7),
  ('fourhundred', 'm', '400m',                   92,   57, true,  false, 'time',  8),
  ('fourhundred', 'f', '400m',                  107,   67, true,  false, 'time',  8)
on conflict (key, sex) do update
  set label = excluded.label, floor_v = excluded.floor_v,
      target_v = excluded.target_v, lower_wins = excluded.lower_wins,
      per_kg = excluded.per_kg, unit = excluded.unit, ord = excluded.ord;

-- ============================================================
--  FOUR PILLARS
--
--  Lower, Upper, Engine, Speed. Better than Strength and Engine
--  because "your upper body is behind" is an instruction and
--  "your strength is behind" is a shrug.
-- ============================================================
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar   text,
  score    numeric,
  tests    integer,
  weakest  text,
  detail   jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
  v_squat numeric; v_dead numeric; v_press numeric; v_pull numeric;
  v_5k numeric; v_row numeric; v_400 numeric;
  s_squat numeric; s_dead numeric; s_press numeric; s_pull numeric;
  s_5k numeric; s_row numeric; s_400 numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'          and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'       and b.week = 1;
  select b.value_num into v_dead  from public.benchmarks b where b.user_id = p_user and b.key = 'deadlift'    and b.week = 1;
  select b.value_num into v_press from public.benchmarks b where b.user_id = p_user and b.key = 'press'       and b.week = 1;
  select b.value_num into v_pull  from public.benchmarks b where b.user_id = p_user and b.key = 'pullup'      and b.week = 1;
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'       and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'         and b.week = 1;
  select b.value_s   into v_400   from public.benchmarks b where b.user_id = p_user and b.key = 'fourhundred' and b.week = 1;

  if v_bw > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
    s_pull  := public.score_one('pullup_bw',   v_sex, v_pull  / v_bw);
  end if;

  s_5k  := public.score_one('fivek',       v_sex, v_5k);
  s_row := public.score_one('row',         v_sex, v_row);
  s_400 := public.score_one('fourhundred', v_sex, v_400);

  return query
  select * from (values
    ('Lower'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead))),

    ('Upper',
     (select round(avg(x), 0) from unnest(array[s_press, s_pull]) x where x is not null),
     (select count(*)::integer from unnest(array[s_press, s_pull]) x where x is not null),
     (select k from (values ('Strict press', s_press), ('Pull-up', s_pull)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Strict press', round(s_press), 'Pull-up', round(s_pull))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('2k row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), '2k row', round(s_row))),

    ('Speed',
     round(s_400, 0),
     (case when s_400 is null then 0 else 1 end),
     (case when s_400 is null then null else '400m' end),
     jsonb_build_object('400m', round(s_400)))
  ) as p(pillar, score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;

-- ---------- the projection, on the new tests ----------
--  The 2km row extends to the race's 1km leg; the 400 gives a read on
--  what's left at the end. The ski becomes a constant, which is honest
--  — we no longer measure it.
drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k integer; v_row integer; v_400 integer;
  v_squat numeric; v_bw numeric;
  v_have integer := 0;

  c_riegel constant numeric := 1.028;
  c_erg    constant numeric := 1.10;
  c_rox    constant integer := 330;
  c_zone   constant integer := 330;

  v_run integer; v_stations integer; v_1k integer;
begin
  select b.value_s   into v_5k    from public.benchmarks b where b.user_id = p_user and b.key = 'fivek'       and b.week = 1;
  select b.value_s   into v_row   from public.benchmarks b where b.user_id = p_user and b.key = 'row'         and b.week = 1;
  select b.value_s   into v_400   from public.benchmarks b where b.user_id = p_user and b.key = 'fourhundred' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b where b.user_id = p_user and b.key = 'squat'       and b.week = 1;
  select b.value_num into v_bw    from public.benchmarks b where b.user_id = p_user and b.key = 'bw'          and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_row is not null)::int
          + (v_400 is not null)::int + (v_squat is not null)::int;

  v_run := round((v_5k / 5.0) * c_riegel * 8 * 1.06);

  -- A 1km row from a 2km, using the same Riegel exponent. Halving the
  -- distance is worth roughly 4% a metre.
  v_1k := case when v_row is null then 250
               else round(v_row * power(0.5, 1.06)) end;

  -- The ski is no longer tested, so it's a constant like the rest.
  v_stations := round(v_1k * c_erg) + round(260 * c_erg) + c_rox * 6;

  if v_squat is not null and v_bw > 0 then
    v_stations := v_stations
      - least(90, greatest(-60, round(((v_squat / v_bw) - 1.2) * 110)));
  end if;

  return query select
    (v_run + v_stations + c_zone)::integer,
    (case when v_have >= 4 then 'good'
          when v_have >= 3 then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have >= 3 then 'from ' || v_have || ' tests'
          else 'from your 5km alone' end)::text,
    v_run::integer, v_stations::integer, c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;


-- ============================================================
--  50_notifications.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — notifications, and turning them off
--
--  The discipline here is having few. Four on by default, three
--  optional, and nothing at all for "you haven't trained in five
--  days" — that's the one every fitness app sends and the one
--  that makes people delete it. Someone who has fallen off knows
--  they have. A coach messaging them is worth ten of those, and
--  the floor screen already says who to message.
--
--  This is the plumbing plus the in-app side. Push itself needs
--  the app installed to a home screen on iOS, so the subscription
--  table is here ready for it.
--
--  Run after 49_hybrid_tests.sql. Safe to re-run.
-- ============================================================

-- ---------- what a member wants to hear about ----------
create table if not exists public.notify_prefs (
  user_id     uuid primary key references auth.users on delete cascade,
  coach_reply boolean default true,    -- they asked a question
  week_live   boolean default true,    -- the one that makes Monday happen
  race_soon   boolean default true,    -- logistics, waves, what to bring
  notices     boolean default true,    -- pinned, so rare by design
  room        boolean default true,    -- the club chat
  wod         boolean default false,   -- somebody beat your time
  kudos       boolean default false,
  weekly      boolean default false,   -- the Sunday summary
  updated_at  timestamptz default now()
);

alter table public.notify_prefs enable row level security;

drop policy if exists "own notify_prefs" on public.notify_prefs;
create policy "own notify_prefs" on public.notify_prefs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.notify_prefs (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- ---------- where to send them ----------
--  One row per device. Somebody with a phone and a laptop gets two,
--  and a stale endpoint is deleted rather than retried forever.
create table if not exists public.push_subs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  agent       text,
  created_at  timestamptz default now(),
  last_ok     timestamptz
);

alter table public.push_subs enable row level security;

drop policy if exists "own push_subs" on public.push_subs;
create policy "own push_subs" on public.push_subs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- what's waiting, in the app ----------
--  Push is the phone buzzing; this is the badge on the tab. They're
--  different jobs and the badge works whether or not somebody has
--  installed the app or granted permission.
alter table public.profiles
  add column if not exists room_seen_at timestamptz;

drop view if exists public.my_unread cascade;

create view public.my_unread
with (security_invoker = on) as
select
  (select count(*) from public.chat_messages m
    where m.deleted = false
      and m.user_id <> auth.uid()
      and m.created_at > coalesce(
        (select p.room_seen_at from public.profiles p where p.id = auth.uid()),
        now() - interval '7 days'))                        as room,

  -- messages uses member_id and from_member, not user_id and
  -- from_coach. A coach's reply is one where from_member is false.
  (select count(*) from public.messages msg
    where msg.member_id = auth.uid()
      and msg.from_member = false
      and msg.read_at is null)                             as coach;

grant select on public.my_unread to authenticated;

drop function if exists public.mark_room_seen() cascade;

create function public.mark_room_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set room_seen_at = now() where id = auth.uid();
$$;

grant execute on function public.mark_room_seen() to authenticated;


-- ============================================================
--  51_compromised.sql
-- ============================================================

-- ============================================================
--  SALUS TRAIN — the compromised session, guided
--
--  Wednesday had no run_kind and no rounds on it, so the app had
--  nothing to build a session from and dropped straight to "type
--  in a 5km" — for the one session in the week that most needs
--  telling you what to do next.
--
--  It's also the hardest to run off a card: five rounds of a
--  kilometre, forty wall balls and twenty-five calories, and by
--  round three nobody can remember whether it was forty or fifty.
--
--  Run after 50_notifications.sql. Safe to re-run.
-- ============================================================

alter table public.sessions add column if not exists run_reps integer;
alter table public.sessions add column if not exists run_distance_m integer;
alter table public.sessions add column if not exists station_1 text;
alter table public.sessions add column if not exists station_2 text;
alter table public.sessions add column if not exists rest_s integer;

-- ---------- the block's own Wednesdays ----------
--  Taken from the programme as written, week by week, rather than a
--  formula — the shape changes at week five when it goes race-specific.
do $$
declare w record;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    update public.sessions s
       set run_kind       = 'compromised',
           run_distance_m = 1000,
           rest_s         = case when w.idx >= 5 then 120 else 90 end,
           run_reps = case w.idx
             when 1 then 5 when 2 then 5 when 3 then 6 when 4 then 3
             when 5 then 4 when 6 then 5 when 7 then 6 else 2 end,
           station_1 = case
             when w.idx >= 5 then '20 burpee broad jumps'
             else (case when w.idx = 2 or w.idx = 3
                        then '50 wall balls' else '40 wall balls' end)
           end,
           station_2 = case
             when w.idx >= 5 then '50m sled push'
             else (case when w.idx = 2 or w.idx = 3
                        then '30 cal row' else '25 cal row' end)
           end
     where s.week_id = w.id and s.day = 3;
  end loop;
end $$;

-- ---------- and the long Saturday, which has the same problem ----------
update public.sessions s
   set run_kind = coalesce(s.run_kind, 'long')
  from public.weeks w
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id and pr.slug = 'road-to-hyrox'
   and s.day = 6 and s.kind = 'run' and s.run_kind is null;

-- ---------- anything else that's a run but has no plan ----------
--  A run session with no run_kind is a session the app can't guide,
--  which means a member taps Start and gets a form. Better to default
--  it to easy than to drop them into data entry.
update public.sessions s
   set run_kind = 'easy',
       run_minutes = coalesce(s.run_minutes, s.est_min, 30)
  from public.weeks w
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id and pr.slug = 'road-to-hyrox'
   and s.kind = 'run' and s.run_kind is null;

-- ---------- so a coach can set this up themselves ----------
comment on column public.sessions.run_reps is
  'Rounds, for a compromised session.';
comment on column public.sessions.run_distance_m is
  'The run leg of each round, in metres.';
comment on column public.sessions.station_1 is
  'First station in the round — "40 wall balls".';
comment on column public.sessions.station_2 is
  'Second station, if there is one.';


-- ============================================================
--  MAKE YOURSELF AN ADMIN — uncomment and run.
-- ============================================================
-- update profiles set role = 'admin'
--   where id in (select id from auth.users
--                where email in ('luke@salus.house', 'luke.adlam98@gmail.com'));

-- ============================================================
--  52_goals.sql
-- ============================================================
-- ============================================================
--  SALUS TRAIN — what you're aiming at, and whether you've moved
--
--  Three things were wrong, and they compound.
--
--  1. Every score read week 1 and only week 1. `and b.week = 1` is
--     in every lookup in my_pillars and my_targets, so a member who
--     retested in week 6 saw the same score, the same band and the
--     same target as the day they started. The card could not show
--     improvement because it was never looking at anything that
--     could improve.
--
--  2. The 400m scored the wrong way round. score_one decides
--     lower-is-better from a hardcoded list — fivek, ski, row, sled
--     — and 'fourhundred' was never added to it. So a 75-second 400
--     was read as being 75 units above elite, and every member with
--     a 400 on file scored 100 for Speed.
--
--  3. A target was the next band boundary, whatever it happened to
--     be. Lift 160 with a boundary at 162 and the app says aim for
--     162. That is two kilos. It is arithmetically correct and it
--     is not a goal — it tells somebody who has been training for
--     six weeks that their next objective is a rounding error.
--
--  Run after 51_compromised.sql. Safe to re-run.
-- ============================================================

-- ---------- 1. the latest test, not the first ----------
--
-- One place that answers "what is this member's current number for
-- this test", so no future function has to remember the rule. Week
-- ordering rather than a timestamp, because a retest is defined by
-- which week of the block it belongs to.
drop function if exists public.latest_bm(uuid, text) cascade;

create function public.latest_bm(p_user uuid, p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(b.value_num, b.value_s::numeric)
    from public.benchmarks b
   where b.user_id = p_user and b.key = p_key
     and coalesce(b.value_num, b.value_s::numeric) is not null
   order by b.week desc
   limit 1;
$$;

drop function if exists public.first_bm(uuid, text) cascade;

create function public.first_bm(p_user uuid, p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(b.value_num, b.value_s::numeric)
    from public.benchmarks b
   where b.user_id = p_user and b.key = p_key
     and coalesce(b.value_num, b.value_s::numeric) is not null
   order by b.week asc
   limit 1;
$$;

grant execute on function public.latest_bm(uuid, text) to authenticated;
grant execute on function public.first_bm(uuid, text)  to authenticated;


-- ---------- 2. the 400 counts down, like every other clock ----------
drop function if exists public.score_one(text, text, numeric) cascade;

create function public.score_one(p_key text, p_sex text, p_value numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.pillar_standards%rowtype;
  lower_better boolean;
  bands numeric[];
  marks numeric[] := array[20, 40, 60, 80, 100];
  i integer;
begin
  select * into s from public.pillar_standards
   where key = p_key and sex = coalesce(p_sex, 'm');
  if not found or p_value is null then return null; end if;

  -- 'fourhundred' was missing here, which is the whole of the Speed
  -- pillar reading 100 for everybody.
  lower_better := p_key in ('fivek', 'ski', 'row', 'sled', 'fourhundred');
  bands := array[s.poor, s.ok, s.good, s.great, s.elite];

  if lower_better then
    if p_value >= bands[1] then return round(20 * (bands[1] / p_value), 1); end if;
    if p_value <= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value > bands[i + 1] then
        return round(marks[i] + (marks[i + 1] - marks[i]) *
          ((bands[i] - p_value) / (bands[i] - bands[i + 1])), 1);
      end if;
    end loop;
    return 100;
  else
    if p_value <= bands[1] then return round(20 * (p_value / bands[1]), 1); end if;
    if p_value >= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value < bands[i + 1] then
        return round(marks[i] + (marks[i + 1] - marks[i]) *
          ((p_value - bands[i]) / (bands[i + 1] - bands[i])), 1);
      end if;
    end loop;
    return 100;
  end if;
end;
$$;

grant execute on function public.score_one(text, text, numeric) to authenticated;


-- ---------- 3. the pillars, on current numbers, with the move ----------
--
-- Same four pillars. Two additions: every value is the member's
-- latest rather than their first, and the score they started with
-- comes back alongside so the card can say what has changed. A
-- number with no history is a grade; a number next to where it was
-- is progress.
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar      text,
  score       numeric,
  first_score numeric,
  tests       integer,
  weakest     text,
  detail      jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text;
  v_bw numeric; v_bw0 numeric;
  v_squat numeric; v_dead numeric; v_press numeric; v_pull numeric;
  v_5k numeric; v_row numeric; v_400 numeric;
  f_squat numeric; f_dead numeric; f_press numeric; f_pull numeric;
  f_5k numeric; f_row numeric; f_400 numeric;
  s_squat numeric; s_dead numeric; s_press numeric; s_pull numeric;
  s_5k numeric; s_row numeric; s_400 numeric;
  o_squat numeric; o_dead numeric; o_press numeric; o_pull numeric;
  o_5k numeric; o_row numeric; o_400 numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  v_bw    := public.latest_bm(p_user, 'bw');
  v_bw0   := public.first_bm(p_user, 'bw');
  v_squat := public.latest_bm(p_user, 'squat');
  v_dead  := public.latest_bm(p_user, 'deadlift');
  v_press := public.latest_bm(p_user, 'press');
  v_pull  := public.latest_bm(p_user, 'pullup');
  v_5k    := public.latest_bm(p_user, 'fivek');
  v_row   := public.latest_bm(p_user, 'row');
  v_400   := public.latest_bm(p_user, 'fourhundred');

  f_squat := public.first_bm(p_user, 'squat');
  f_dead  := public.first_bm(p_user, 'deadlift');
  f_press := public.first_bm(p_user, 'press');
  f_pull  := public.first_bm(p_user, 'pullup');
  f_5k    := public.first_bm(p_user, 'fivek');
  f_row   := public.first_bm(p_user, 'row');
  f_400   := public.first_bm(p_user, 'fourhundred');

  if coalesce(v_bw, 0) > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
    s_pull  := public.score_one('pullup_bw',   v_sex, v_pull  / v_bw);
  end if;

  -- The starting score uses the starting bodyweight. Somebody who
  -- has lost six kilos has improved every ratio without touching a
  -- barbell, and that is real, but it has to be measured against
  -- what they actually weighed at the time.
  if coalesce(v_bw0, 0) > 0 then
    o_squat := public.score_one('squat_bw',    v_sex, f_squat / v_bw0);
    o_dead  := public.score_one('deadlift_bw', v_sex, f_dead  / v_bw0);
    o_press := public.score_one('press_bw',    v_sex, f_press / v_bw0);
    o_pull  := public.score_one('pullup_bw',   v_sex, f_pull  / v_bw0);
  end if;

  s_5k  := public.score_one('fivek',       v_sex, v_5k);
  s_row := public.score_one('row',         v_sex, v_row);
  s_400 := public.score_one('fourhundred', v_sex, v_400);

  o_5k  := public.score_one('fivek',       v_sex, f_5k);
  o_row := public.score_one('row',         v_sex, f_row);
  o_400 := public.score_one('fourhundred', v_sex, f_400);

  return query
  select * from (values
    ('Lower'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_squat, o_dead]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead))),

    ('Upper',
     (select round(avg(x), 0) from unnest(array[s_press, s_pull]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_press, o_pull]) x where x is not null),
     (select count(*)::integer from unnest(array[s_press, s_pull]) x where x is not null),
     (select k from (values ('Strict press', s_press), ('Pull-up', s_pull)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Strict press', round(s_press), 'Pull-up', round(s_pull))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_row]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_5k, o_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('2k row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), '2k row', round(s_row))),

    ('Speed',
     round(s_400, 0),
     round(o_400, 0),
     (case when s_400 is null then 0 else 1 end),
     (case when s_400 is null then null else '400m' end),
     jsonb_build_object('400m', round(s_400)))
  ) as p(pillar, score, first_score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;


-- ---------- 4. a goal worth training for ----------
--
-- Two numbers come back, and they answer different questions.
--
--   next_value  the boundary of the band above. Where you'd tick
--               over. Sometimes that is two kilos away.
--   goal_value  something actually worth eight weeks. The first
--               band that is far enough above where you are to be
--               a training objective rather than a good day.
--
-- "Far enough" is four per cent. Below that the boundary is noise —
-- the difference between a 160 and a 162 is which day you tested,
-- not what you can lift — so the goal steps past it to the band
-- after. A member two kilos off a band still gets told so; it just
-- isn't presented as the thing to aim at for two months.
--
-- Every label here matches what my_pillars puts in its detail
-- object, and the key comes back too, because joining these two
-- results on a display string is how Pull-up and 400m ended up with
-- no target on the card at all.
drop function if exists public.my_targets(uuid) cascade;

create function public.my_targets(p_user uuid)
returns table (
  key         text,
  label       text,
  pillar      text,
  unit        text,
  lower_wins  boolean,
  now_value   numeric,
  first_value numeric,
  band        text,
  next_band   text,
  next_value  numeric,
  goal_band   text,
  goal_value  numeric,
  elite_value numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;
  v_bw := public.latest_bm(p_user, 'bw');

  return query
  with defs as (
    select * from (values
      ('squat',       'squat_bw',    'Back squat',   'Lower',  true,  false),
      ('deadlift',    'deadlift_bw', 'Deadlift',     'Lower',  true,  false),
      ('press',       'press_bw',    'Strict press', 'Upper',  true,  false),
      ('pullup',      'pullup_bw',   'Pull-up',      'Upper',  true,  false),
      ('fivek',       'fivek',       '5km',          'Engine', false, true),
      ('row',         'row',         '2k row',       'Engine', false, true),
      ('fourhundred', 'fourhundred', '400m',         'Speed',  false, true)
    ) as d(bm_key, std_key, nice, pillar_name, per_kg, lower_wins)
  ),
  mine as (
    select
      d.bm_key, d.std_key, d.nice, d.pillar_name, d.per_kg, d.lower_wins,
      public.latest_bm(p_user, d.bm_key) as raw,
      public.first_bm(p_user, d.bm_key)  as raw0,
      s.poor, s.ok, s.good, s.great, s.elite
    from defs d
    join public.pillar_standards s
      on s.key = d.std_key and s.sex = v_sex
  ),
  rel as (
    select m.*,
      -- The value the standards are written in: a ratio for the
      -- lifts, seconds for anything on a clock.
      case when m.per_kg and coalesce(v_bw, 0) > 0 then m.raw / v_bw
           when m.per_kg then null
           else m.raw end as val,
      -- What one unit of the standard is worth in the member's own
      -- unit, so a ratio target comes back as kilos.
      case when m.per_kg then coalesce(v_bw, 0) else 1 end as scale
    from mine m
  ),
  banded as (
    select r.*,
      case
        when r.val is null then null
        when r.lower_wins then
          case when r.val <= r.elite then 'elite'
               when r.val <= r.great then 'great'
               when r.val <= r.good  then 'good'
               when r.val <= r.ok    then 'ok'
               else 'building' end
        else
          case when r.val >= r.elite then 'elite'
               when r.val >= r.great then 'great'
               when r.val >= r.good  then 'good'
               when r.val >= r.ok    then 'ok'
               else 'building' end
      end as band_now,
      -- the boundary immediately above, in standard units
      case
        when r.val is null then r.ok
        when r.lower_wins then
          case when r.val <= r.elite then null
               when r.val <= r.great then r.elite
               when r.val <= r.good  then r.great
               when r.val <= r.ok    then r.good
               else r.ok end
        else
          case when r.val >= r.elite then null
               when r.val >= r.great then r.elite
               when r.val >= r.good  then r.great
               when r.val >= r.ok    then r.good
               else r.ok end
      end as next_raw,
      case
        when r.val is null then 'ok'
        when r.lower_wins then
          case when r.val <= r.elite then null
               when r.val <= r.great then 'elite'
               when r.val <= r.good  then 'great'
               when r.val <= r.ok    then 'good'
               else 'ok' end
        else
          case when r.val >= r.elite then null
               when r.val >= r.great then 'elite'
               when r.val >= r.good  then 'great'
               when r.val >= r.ok    then 'good'
               else 'ok' end
      end as next_name
    from rel r
  ),
  goaled as (
    select b.*,
      -- The first band that clears four per cent. Anything nearer
      -- than that is the same performance on a different day.
      case
        when b.val is null then b.ok
        when b.lower_wins then
          case when b.val * 0.96 <= b.elite then b.elite
               when b.val * 0.96 <= b.great then b.elite
               when b.val * 0.96 <= b.good  then b.great
               when b.val * 0.96 <= b.ok    then b.good
               else b.ok end
        else
          case when b.val * 1.04 >= b.elite then b.elite
               when b.val * 1.04 >= b.great then b.elite
               when b.val * 1.04 >= b.good  then b.great
               when b.val * 1.04 >= b.ok    then b.good
               else b.ok end
      end as goal_raw,
      case
        when b.val is null then 'ok'
        when b.lower_wins then
          case when b.val * 0.96 <= b.elite then 'elite'
               when b.val * 0.96 <= b.great then 'elite'
               when b.val * 0.96 <= b.good  then 'great'
               when b.val * 0.96 <= b.ok    then 'good'
               else 'ok' end
        else
          case when b.val * 1.04 >= b.elite then 'elite'
               when b.val * 1.04 >= b.great then 'elite'
               when b.val * 1.04 >= b.good  then 'great'
               when b.val * 1.04 >= b.ok    then 'good'
               else 'ok' end
      end as goal_name
    from banded b
  )
  select
    g.bm_key,
    g.nice,
    g.pillar_name,
    case when g.per_kg then 'kg' else 'time' end,
    g.lower_wins,
    g.raw,
    g.raw0,
    g.band_now,
    g.next_name,
    round(g.next_raw * g.scale, 0),
    g.goal_name,
    round(g.goal_raw * g.scale, 0),
    round(g.elite * g.scale, 0)
  from goaled g
  where g.raw is not null
  order by g.pillar_name, g.nice;
end;
$$;

grant execute on function public.my_targets(uuid) to authenticated;

-- ============================================================
--  53_push.sql
-- ============================================================
-- ============================================================
--  SALUS TRAIN — what gets sent, and when
--
--  50_notifications.sql built the preferences and the place to
--  store a device. This is the part that decides a push should
--  happen at all.
--
--  The shape is an outbox rather than a trigger that sends. A
--  trigger that calls out over the network makes every insert into
--  chat_messages depend on a push service being up — one slow
--  response and posting a message in the room hangs. Writing a row
--  and letting something else drain it means the worst case is a
--  late notification instead of a broken app.
--
--  It also makes the whole thing inspectable. Every notification
--  the app has ever decided to send is a row you can read, which is
--  the difference between "did that send?" and knowing.
--
--  Run after 52_goals.sql. Safe to re-run.
-- ============================================================

create table if not exists public.push_outbox (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  kind        text not null,          -- matches a notify_prefs column
  title       text not null,
  body        text,
  url         text default '/',
  tag         text,
  created_at  timestamptz default now(),
  claimed_at  timestamptz,
  sent_at     timestamptz
);

create index if not exists push_outbox_pending
  on public.push_outbox (created_at)
  where sent_at is null;

alter table public.push_outbox enable row level security;

-- Nobody reads this from the app. The edge function uses the service
-- role, which bypasses RLS; leaving the table with RLS on and no
-- policy means an anon or member token gets nothing, which is right.

-- ---------- quiet hours ----------
--
--  Nothing buzzes between ten at night and seven in the morning. A
--  notification at 02:00 costs you the member, not just the
--  notification — and none of what this app sends is worth waking
--  somebody for. Queued rows keep until morning rather than being
--  dropped, except the ones that would be stale by then.
create or replace function public.in_quiet_hours(p_at timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select extract(hour from (p_at at time zone 'Europe/London')) >= 22
      or extract(hour from (p_at at time zone 'Europe/London')) < 7;
$$;

grant execute on function public.in_quiet_hours(timestamptz) to authenticated;

-- ---------- the one place anything gets queued ----------
--
--  Every rule below funnels through here, so the preference check
--  and the quiet-hours check exist once rather than in each trigger.
--  A member who has turned something off never gets a row written,
--  which means turning it off is also the answer to "why is the
--  outbox full of things nobody wants".
drop function if exists public.queue_push(uuid, text, text, text, text, text) cascade;

create function public.queue_push(
  p_user uuid, p_kind text, p_title text,
  p_body text default null, p_url text default '/', p_tag text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_on boolean;
begin
  if p_user is null then return; end if;

  -- The preference columns are named for the kinds, so this reads
  -- the right one without a case statement per kind.
  execute format('select coalesce(%I, false) from public.notify_prefs where user_id = $1',
                 p_kind)
    into v_on using p_user;

  if not coalesce(v_on, false) then return; end if;

  insert into public.push_outbox (user_id, kind, title, body, url, tag)
  values (p_user, p_kind, p_title, p_body, coalesce(p_url, '/'), p_tag);
end;
$$;

-- ---------- a coach replied ----------
--
--  The one worth interrupting somebody for. A member asked a
--  question and a human answered it.
drop function if exists public.on_message_push() cascade;

create function public.on_message_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.from_member = false then
    perform public.queue_push(
      new.member_id, 'coach_reply',
      'Your coach replied',
      left(coalesce(new.body, ''), 140),
      '/me/messages', 'coach');
  end if;
  return new;
end;
$$;

drop trigger if exists messages_push on public.messages;
create trigger messages_push
  after insert on public.messages
  for each row execute function public.on_message_push();

-- ---------- somebody posted in the room ----------
--
--  Everyone except the person who posted, and only members who have
--  left it on. Tagged so three messages in a row collapse to one
--  line on the lock screen instead of three.
drop function if exists public.on_room_push() cascade;

create function public.on_room_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if coalesce(new.deleted, false) then return new; end if;

  -- profiles is one of the tables that only exists in the live
  -- database, so nothing here can check its columns. It's `name`,
  -- one field — that's what the room UI reads — and split_part
  -- takes the first word so the notification says "Jade posted"
  -- rather than the full name.
  select coalesce(nullif(split_part(p.name, ' ', 1), ''), 'Someone')
    into v_name
    from public.profiles p where p.id = new.user_id;

  perform public.queue_push(
    p.id, 'room',
    v_name || ' posted in the room',
    left(coalesce(new.body, ''), 140),
    '/community', 'room')
  from public.profiles p
  where p.id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists chat_messages_push on public.chat_messages;
create trigger chat_messages_push
  after insert on public.chat_messages
  for each row execute function public.on_room_push();

-- ---------- claiming, so nothing sends twice ----------
--
--  skip locked is the whole trick. Two overlapping cron runs each
--  take a different set of rows instead of both taking the same set
--  and sending everything twice — which is the failure people
--  actually notice.
--
--  Quiet hours are applied here rather than at queue time, so a
--  message that arrives at 23:00 goes out at 07:00 rather than
--  never. Room chatter is the exception: a notification about a
--  message nine hours ago is noise, so it expires instead.
drop function if exists public.claim_push_outbox(integer) cascade;

create function public.claim_push_outbox(p_limit integer default 200)
returns table (
  id      uuid,
  user_id uuid,
  kind    text,
  title   text,
  body    text,
  url     text,
  tag     text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Anything stale enough to be irrelevant is closed off rather than
  -- delivered late.
  update public.push_outbox o
     set sent_at = now()
   where o.sent_at is null
     and o.kind in ('room', 'wod', 'kudos')
     and o.created_at < now() - interval '3 hours';

  return query
  with claimed as (
    select o.id
      from public.push_outbox o
     where o.sent_at is null
       and (o.claimed_at is null or o.claimed_at < now() - interval '5 minutes')
       and not public.in_quiet_hours()
     order by o.created_at
     limit p_limit
     for update skip locked
  )
  update public.push_outbox o
     set claimed_at = now()
    from claimed c
   where o.id = c.id
  returning o.id, o.user_id, o.kind, o.title, o.body, o.url, o.tag;
end;
$$;

revoke execute on function public.claim_push_outbox(integer) from authenticated;

-- ---------- housekeeping ----------
--  Sent rows are worth keeping for a fortnight to answer "did that
--  send", and worth nothing after that.
drop function if exists public.prune_push_outbox() cascade;

create function public.prune_push_outbox()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.push_outbox
     where sent_at is not null and sent_at < now() - interval '14 days'
    returning 1)
  select count(*)::integer from gone;
$$;
