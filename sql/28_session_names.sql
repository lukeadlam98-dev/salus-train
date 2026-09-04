-- ============================================================
--  SALUS TRAIN — sessions get names, not specs
--
--  "Back Squat 5RM" is what a coach writes on a whiteboard. It
--  isn't what a member calls their Monday, and a title nobody
--  would say out loud is a title doing the wrong job.
--
--  The protocol hasn't gone anywhere — it's in the blocks, in
--  the focus pill, and on the session itself. The title is now
--  just a name.
--
--  Run after 27_chat.sql. Safe to re-run.
-- ============================================================

-- ---------- the tests ----------
update public.sessions set title = 'The Baseline'
 where title ilike '%back squat 5rm%' or title ilike '%squat test%';

update public.sessions set title = 'The Engine'
 where title ilike '%ski%test%' or title ilike '%erg test%'
    or title ilike '%1000m ski%';

update public.sessions set title = 'Off the Line'
 where title ilike '%5k%test%' or title ilike '%5km time trial%';

update public.sessions set title = 'The Salus Half'
 where kind = 'half';

-- ---------- the ordinary weeks ----------
-- Names that repeat across the block, so a member can compare Lower A
-- in week six against Lower A in week one without thinking about it.
-- A session called something different every week hides its own
-- progress.
update public.sessions set title = 'Lower A'
 where title ilike '%lower%a%' and kind = 'strength';

update public.sessions set title = 'Upper A'
 where title ilike '%upper%a%' and kind = 'strength';

update public.sessions set title = 'The Engine Room'
 where title ilike '%engine room%' or title ilike '%erg%session%';

update public.sessions set title = 'Compromised'
 where title ilike '%compromised%';

-- ---------- a session knows it's a test ----------
-- is_test already exists; make sure the renamed ones carry it, since
-- the app tags them off this rather than off the title.
update public.sessions set is_test = true
 where title in ('The Baseline', 'The Engine', 'Off the Line',
                 'The Salus Half');
