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
