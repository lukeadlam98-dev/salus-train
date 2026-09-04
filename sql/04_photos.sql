-- ============================================================
--  SALUS TRAIN — photos
--  Adds a cover image to sessions and programmes.
--  The photo belongs to the content, not the code — so a coach
--  changes it by pasting a URL into a table, with no deploy.
-- ============================================================

alter table sessions   add column if not exists cover_url text;
alter table programmes add column if not exists cover_url text;

-- Fill these in from Storage → photos → the file → Copy URL.
-- Replace YOURPROJECT with your project ref.
--
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/squat.jpg'    where day = 1;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/hero.jpg'     where day = 2;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/reformer.jpg' where day = 3;
-- update sessions   set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/plate.jpg'    where day = 6;
--
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/hero.jpg'     where slug = 'road-to-hyrox';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/squat.jpg'    where slug = 'athx';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/reformer.jpg' where slug = 'reformer';
-- update programmes set cover_url = 'https://YOURPROJECT.supabase.co/storage/v1/object/public/photos/plate.jpg'    where slug = 'five-k';
