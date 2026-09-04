-- ============================================================
--  SALUS TRAIN — a multiplier that learns, and a duplicate fix
--
--  2.08 said the back half of a race is 4% slower than the
--  front. Published HYROX split data has age-groupers losing
--  more like 8–15%, so the projection has been flattering
--  everyone. 2.12 is a better prior.
--
--  But a prior is all it is. The right number is the one your
--  members actually produce, so this computes it from real
--  half-to-race pairs once there are enough of them, and says
--  how many it is standing on.
--
--  Run after 34_coach_floor.sql. Safe to re-run.
-- ============================================================

-- ---------- the duplicate notices ----------
--  03_seed inserts notices with no unique key, so every run added
--  another copy. Six pins of the same thing is what that looks like.
delete from public.notices a
 using public.notices b
 where a.id > b.id
   and a.title = b.title
   and a.tag is not distinct from b.tag;

-- And stop it happening again.
create unique index if not exists notices_title_key
  on public.notices (title);

-- ---------- a better prior ----------
update public.config
   set value = '2.12'
 where key = 'half_multiplier' and value = '2.08';

insert into public.config (key, value)
values ('half_multiplier', '2.12')
on conflict (key) do nothing;

-- ---------- what the club's races actually say ----------
--  For anyone who ran a Salus Half and then a real race, the true
--  multiplier is race time over half time. That is the only number
--  here that isn't a guess.
drop view if exists public.multiplier_evidence cascade;

create view public.multiplier_evidence
with (security_invoker = on) as
select
  r.id,
  p.name,
  r.name                                as race,
  r.race_date,
  h.total_s                             as half_s,
  r.result_s,
  round((r.result_s::numeric / nullif(h.total_s, 0)), 3)  as ratio
from public.races r
join public.profiles p  on p.id = r.user_id
join lateral (
  -- their most recent half before the race
  select hs.total_s
    from public.half_sims hs
   where hs.user_id = r.user_id
     and hs.total_s is not null
     and hs.created_at::date <= r.race_date
   order by hs.created_at desc
   limit 1
) h on true
where r.result_s is not null
order by r.race_date desc;

grant select on public.multiplier_evidence to authenticated;

-- ---------- the number, and how much it's standing on ----------
drop function if exists public.club_multiplier() cascade;

create function public.club_multiplier()
returns table (
  in_use     numeric,
  measured   numeric,
  samples    bigint,
  spread     numeric,
  source     text
)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (select ratio from public.multiplier_evidence where ratio is not null),
  s as (
    select
      count(*)                                                      as n,
      -- percentile_cont returns double precision, and there is no
      -- round(double, int) in Postgres — only round(numeric, int).
      -- Cast at the source rather than at each use.
      (percentile_cont(0.5) within group (order by ratio))::numeric   as med,
      ((percentile_cont(0.9) within group (order by ratio))
       - (percentile_cont(0.1) within group (order by ratio)))::numeric as sp
    from e
  )
  select
    (select value::numeric from public.config where key = 'half_multiplier'),
    round(s.med, 3),
    s.n,
    round(s.sp, 3),
    case
      when s.n = 0 then 'No races finished yet — 2.12 is a starting assumption from published HYROX splits, not your data.'
      when s.n < 5 then 'From ' || s.n || ' race' || case when s.n = 1 then '' else 's' end ||
                        '. Too few to switch to yet, but worth watching.'
      else            'From ' || s.n || ' races. Enough to use.'
    end
  from s;
$$;

grant execute on function public.club_multiplier() to authenticated;

-- ---------- adopt it, when you decide to ----------
drop function if exists public.adopt_measured_multiplier() cascade;

create function public.adopt_measured_multiplier()
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare v_med numeric; v_n bigint;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select measured, samples into v_med, v_n from public.club_multiplier();

  if v_n < 5 then
    raise exception 'only % races on record — not enough to set the number by', v_n;
  end if;

  update public.config set value = v_med::text where key = 'half_multiplier';
  return v_med;
end;
$$;

grant execute on function public.adopt_measured_multiplier() to authenticated;
