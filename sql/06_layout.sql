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
