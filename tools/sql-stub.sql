-- Just enough of Salus Train's base schema to run 54/55/56 against a
-- real Postgres. The base tables live in Supabase, not in sql/, so
-- this reproduces their shape from what the app and migrations use.
-- Supabase ships this role; the grants in every migration need it.
do $$ begin
  create role authenticated;
exception when duplicate_object then null;
end $$;

create schema if not exists auth;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

-- Stands in for the request's user. Tests set it.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  name                  text,
  role                  text default 'member',
  photo_url             text,
  programme_id          uuid,
  week_idx              integer default 1,
  week_started          date,
  share_on_leaderboard  boolean default true,
  created_at            timestamptz default now()
);

create table public.programmes (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  weeks             integer default 8,
  blurb             text,
  live              boolean default false,
  sort              integer default 0,
  uses_half         boolean default false,
  created_at        timestamptz default now()
);

create table public.weeks (
  id            uuid primary key default gen_random_uuid(),
  programme_id  uuid references public.programmes on delete cascade,
  idx           integer not null,
  phase         text,
  note          text,
  published     boolean default false,
  created_at    timestamptz default now(),
  unique (programme_id, idx)
);

create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  week_id     uuid references public.weeks on delete cascade,
  day         integer not null,
  title       text,
  tag         text,
  kind        text,
  est_min     integer,
  is_test     boolean default false,
  body        text,
  created_at  timestamptz default now()
);

create table public.blocks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions on delete cascade,
  ord         integer default 1,
  letter      text,
  label       text,
  scheme      text,
  rest_note   text,
  created_at  timestamptz default now()
);

create table public.block_lines (
  id            uuid primary key default gen_random_uuid(),
  block_id      uuid references public.blocks on delete cascade,
  ord           integer default 1,
  prescription  text,
  movement      text,
  sub           text
);

create table public.coach_notes (
  id        uuid primary key default gen_random_uuid(),
  block_id  uuid references public.blocks on delete cascade,
  ord       integer default 1,
  heading   text,
  body      text
);

create table public.movements (
  id              uuid primary key default gen_random_uuid(),
  name            text unique not null,
  default_rest_s  integer default 90,
  has_time        boolean default false,
  pct_of          text,
  pct             numeric
);

create table public.block_items (
  id           uuid primary key default gen_random_uuid(),
  block_id     uuid references public.blocks on delete cascade,
  movement_id  uuid references public.movements on delete cascade,
  ord          integer default 1,
  sets         integer default 3,
  reps         integer,
  rest_s       integer
);

create table public.workout_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  session_id  uuid references public.sessions on delete cascade,
  started_at  timestamptz default now(),
  ended_at    timestamptz,
  elapsed_s   integer
);

create table public.set_logs (
  workout_log_id  uuid references public.workout_logs on delete cascade,
  block_item_id   uuid references public.block_items on delete cascade,
  set_idx         integer default 0,
  reps            integer,
  kg              numeric,
  done            boolean default false,
  primary key (workout_log_id, block_item_id, set_idx)
);

create function public.is_admin() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false);
$$;

-- Columns the repo's own migrations added, in the order they did.
alter table public.sessions add column if not exists slot integer default 1;
alter table public.sessions add column if not exists focus text;
alter table public.sessions add column if not exists cover_url text;
alter table public.sessions add column if not exists video_url text;
alter table public.sessions add column if not exists coach_id uuid;
alter table public.sessions add column if not exists rest_s integer;
alter table public.sessions add column if not exists wotw boolean default false;
alter table public.sessions add column if not exists wotw_metric text;
alter table public.sessions add column if not exists run_kind text;
alter table public.sessions add column if not exists run_minutes integer;
alter table public.sessions add column if not exists run_distance_m integer;
alter table public.sessions add column if not exists run_reps integer;
alter table public.sessions add column if not exists run_blocks integer;
alter table public.sessions add column if not exists run_ladder text;
alter table public.sessions add column if not exists run_pace_pct numeric;
alter table public.sessions add column if not exists station_1 text;
alter table public.sessions add column if not exists station_2 text;
alter table public.sessions
  drop constraint if exists sessions_week_id_day_key;
alter table public.sessions
  add constraint sessions_week_id_day_slot_key unique (week_id, day, slot);

alter table public.blocks add column if not exists format text default 'sets';
alter table public.blocks add column if not exists rounds integer;
alter table public.blocks add column if not exists rest_s integer;
alter table public.blocks add column if not exists cap_s integer;
alter table public.blocks add column if not exists window_s integer;
alter table public.blocks add column if not exists work_s integer;
alter table public.blocks add column if not exists ladder text;
alter table public.blocks add column if not exists target_pct numeric;
alter table public.blocks add column if not exists target_rpe numeric;
alter table public.blocks add column if not exists pace_pct numeric;
alter table public.blocks add column if not exists score_s integer;

alter table public.programmes add column if not exists archived boolean default false;
alter table public.programmes add column if not exists cover_url text;
alter table public.programmes add column if not exists sessions_per_week integer;
alter table public.programmes add column if not exists starts_on date;
alter table public.programmes add column if not exists ends_on date;
alter table public.programmes add column if not exists race_name text;
alter table public.programmes add column if not exists race_location text;
alter table public.programmes add column if not exists race_date date;
alter table public.programmes add column if not exists race_image text;

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

-- The view 54 rebuilds, as it stood before.
create view public.wotw_board as select null::uuid as session_id;

-- Two members and a club programme, so the tests have somewhere to start.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'luke@salus.house'),
  ('22222222-2222-2222-2222-222222222222', 'rakhee@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'jade@example.com');

-- A second account with the same name, which is the whole reason the
-- seed matches on email.
insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'luke.adlam98@gmail.com');

insert into public.profiles (id, name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Luke Adlam', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Rakhee Patel', 'member'),
  ('33333333-3333-3333-3333-333333333333', 'Jade Smith', 'member'),
  ('44444444-4444-4444-4444-444444444444', 'Luke', 'admin');

insert into public.programmes (slug, name, weeks, live, sort, archived)
  values ('road-to-hyrox', 'Road to HYROX', 8, true, 1, false);

update public.profiles
   set programme_id = (select id from public.programmes where slug = 'road-to-hyrox'),
       week_idx = 2
 where name = 'Luke Adlam';
