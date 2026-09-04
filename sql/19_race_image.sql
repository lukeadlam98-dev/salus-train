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
