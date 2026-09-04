-- ============================================================
--  SALUS TRAIN — the splash media, from the back office
--
--  The login video and its poster were filenames in the code.
--  They become config rows, so a new film is an upload and a
--  click rather than a deploy.
--
--  Run after 09_programmes.sql. Safe to re-run.
-- ============================================================

insert into config (key, value) values
  ('splash_video',  ''),   -- empty = fall back to the photo alone
  ('splash_poster', ''),   -- the still underneath, so it never shows black
  ('logo_url',      '')    -- the mark, light on transparent
on conflict (key) do nothing;
