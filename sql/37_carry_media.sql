-- ============================================================
--  SALUS TRAIN — the images came back empty
--
--  33_one_programme moved everyone onto the new block, which had
--  never had a race photo or a cover set. The old programme's
--  images were still on the archived row, so members saw a card
--  with nothing behind it.
--
--  Carries the media across, and does the same for session covers
--  where a new session has none and an old one by the same name
--  did.
--
--  Run after 36_wotw.sql. Safe to re-run.
-- ============================================================

-- ---------- programme media ----------
update public.programmes new
   set race_image    = coalesce(new.race_image,    old.race_image),
       cover_url     = coalesce(new.cover_url,     old.cover_url),
       race_location = coalesce(new.race_location, old.race_location),
       race_name     = coalesce(new.race_name,     old.race_name),
       race_date     = coalesce(new.race_date,     old.race_date)
  from public.programmes old
 where new.slug = 'road-to-hyrox'
   and old.slug like 'road-to-hyrox-v%'
   and (new.race_image is null or new.cover_url is null);

-- ---------- session covers, matched by name ----------
--  A session called Lower A in the new block inherits the cover from
--  a session called Lower A in the old one. Names repeat across the
--  block on purpose, so this is safe.
update public.sessions s
   set cover_url = old.cover_url,
       video_url = coalesce(s.video_url, old.video_url),
       coach_id  = coalesce(s.coach_id,  old.coach_id)
  from (
    select distinct on (o.title) o.title, o.cover_url, o.video_url, o.coach_id
      from public.sessions o
      join public.weeks ow    on ow.id = o.week_id
      join public.programmes op on op.id = ow.programme_id
     where op.slug like 'road-to-hyrox-v%'
       and o.cover_url is not null
     order by o.title, o.id
  ) old
  join public.weeks w    on true
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id
   and pr.slug = 'road-to-hyrox'
   and s.title = old.title
   and s.cover_url is null;

-- ---------- and tell you what's still missing ----------
--  Rather than leaving you to find out on a member's phone.
drop view if exists public.missing_media cascade;

create view public.missing_media
with (security_invoker = on) as
select 'programme'::text as kind, pr.name as what,
       'No race photo — Programmes & words'::text as fix
  from public.programmes pr
 where not pr.archived and pr.race_image is null
union all
select 'session', s.title,
       'No cover image — open the session in the week editor'
  from public.sessions s
  join public.weeks w       on w.id = s.week_id
  join public.programmes pr on pr.id = w.programme_id
 where not pr.archived and s.cover_url is null and s.kind <> 'rest'
union all
select 'coach', c.name, 'No photo — Photos'
  from public.coaches c
 where c.photo_url is null;

grant select on public.missing_media to authenticated;
