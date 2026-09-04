-- ============================================================
--  SALUS TRAIN — the club's race, as a suggestion
--
--  The tile was showing the programme's race name to members
--  who hadn't entered anything, which reads as though they're
--  down for a race they never signed up to.
--
--  Rather than just hiding it, the programme's race becomes a
--  suggested default. Most of the block will be doing HYROX
--  London on the same day, so that's one tap instead of a date
--  picker — and the ones doing Manchester can still say no.
--
--  Run after 22_prediction.sql. Safe to re-run.
-- ============================================================

alter table public.programmes add column if not exists race_date date;

update public.programmes
   set race_date = '2026-12-03'
 where slug = 'road-to-hyrox' and race_date is null;

-- my_programme carries it, so the app can offer it.
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
  pr.race_image,
  pr.race_location,
  pr.race_date
from public.profiles p
join public.programmes pr on pr.id = p.programme_id
where p.id = auth.uid();

grant select on public.my_programme to authenticated;
