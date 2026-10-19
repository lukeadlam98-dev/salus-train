-- ============================================================
--  SALUS TRAIN — a photo on the top card for any block
--
--  todays_race_image picks the day's photo from the programme's set
--  and falls back to programmes.race_image. A block with no race has
--  no race_image, so Full Body got no photo at all and the card at
--  the top of the home screen was a flat panel.
--
--  cover_url is already there — it's the image on the programme row
--  in the back office — so it becomes the last fallback. One upload
--  then covers the Club list and the member's home card.
--
--  Order: the day's photo from the set, then race_image, then
--  cover_url. A set, if there is one, always wins.
--
--  Run after 59_names.sql. Safe to re-run.
-- ============================================================

set lock_timeout = '5s';

drop function if exists public.todays_race_image(uuid) cascade;

create function public.todays_race_image(p_programme uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select i.url
       from public.programme_images i
      where i.programme_id = p_programme
      order by i.ord nulls last, i.id
      offset (
        -- days since epoch, wrapped by however many there are
        (current_date - date '2000-01-01') %
        greatest((select count(*) from public.programme_images
                   where programme_id = p_programme), 1)
      )
      limit 1),
    (select pr.race_image from public.programmes pr where pr.id = p_programme),
    (select pr.cover_url  from public.programmes pr where pr.id = p_programme)
  );
$$;

grant execute on function public.todays_race_image(uuid) to authenticated;

-- my_programme reads the function, and dropping the function with
-- cascade takes the view with it. Put back exactly as it was — this
-- is lifted from the migration that defines it, not retyped.
drop view if exists public.my_programme cascade;

create view public.my_programme
with (security_invoker = on) as
select
  p.id            as user_id,
  pr.id           as programme_id,
  pr.slug,
  pr.name,
  pr.weeks        as total_weeks,
  pr.race_name,
  pr.uses_half,
  pr.starts_on,
  public.todays_race_image(pr.id)         as race_image,
  pr.race_location,
  pr.race_date,
  (select count(*) from public.programme_images i
    where i.programme_id = pr.id)         as image_count
from public.profiles p
join public.programmes pr on pr.id = p.programme_id
where p.id = auth.uid();

grant select on public.my_programme to authenticated;
