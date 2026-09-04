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
