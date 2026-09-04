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
