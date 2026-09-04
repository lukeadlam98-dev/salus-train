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
