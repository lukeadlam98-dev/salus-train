-- ============================================================
--  SALUS TRAIN — a set of race photos, not one
--
--  One image behind the countdown is the same image every
--  morning for eight weeks, which stops being a photograph and
--  becomes furniture. Fifteen of them and the card is worth
--  looking at again.
--
--  Rotation is by day, not random on every render — a picture
--  that changes while you are reading is a distraction, and a
--  member should be able to say "that shot of the sled" and
--  have someone else know which one.
--
--  Run after 38_presence.sql. Safe to re-run.
-- ============================================================

create table if not exists public.programme_images (
  id           uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes on delete cascade not null,
  url          text not null,
  caption      text,
  ord          integer,
  created_at   timestamptz default now(),
  unique (programme_id, url)
);

alter table public.programme_images enable row level security;

drop policy if exists "read programme_images"  on public.programme_images;
drop policy if exists "admin programme_images" on public.programme_images;

create policy "read programme_images" on public.programme_images
  for select to authenticated using (true);

create policy "admin programme_images" on public.programme_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Carry across whatever single image is already set, so nothing is
-- lost and the set starts with one in it.
insert into public.programme_images (programme_id, url, ord)
select pr.id, pr.race_image, 1
  from public.programmes pr
 where pr.race_image is not null
on conflict (programme_id, url) do nothing;

-- ---------- today's picture ----------
--  Indexed on the date so it holds all day and everybody sees the
--  same one. Falls back to the single race_image when the set is
--  empty, so nothing breaks before any are uploaded.
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
    (select pr.race_image from public.programmes pr where pr.id = p_programme)
  );
$$;

grant execute on function public.todays_race_image(uuid) to authenticated;

-- ---------- and hand it to the app with the rest ----------
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
