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
