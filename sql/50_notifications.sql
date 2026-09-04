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
