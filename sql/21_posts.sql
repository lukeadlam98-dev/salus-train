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
