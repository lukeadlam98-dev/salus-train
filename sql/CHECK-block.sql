-- ============================================================
--  SALUS TRAIN — can every session in the block be followed?
--
--  Read-only. Creates one view and selects from it. Nothing is
--  altered, so this is safe to run at any time, including with the
--  app open.
--
--  The question it answers is the one that matters before December:
--  for each of the sessions in the block, does a member tapping it
--  get something they can follow along with, or do they get a
--  paragraph and a box to type a time into?
--
--  The app tries three things, in order:
--
--    1. run_kind        an explicit kind — intervals, speed,
--                       compromised, easy, long. Best case: the
--                       session guides itself piece by piece.
--    2. blocks          what a coach wrote in the editor. Also
--                       guided, from the block lines.
--    3. the description read as a fallback, so "5 six-minute
--                       blocks" still produces five blocks.
--
--  If all three come up empty the member gets the paragraph. Those
--  are the rows to fix, and this lists them first.
--
--  Run after 53_push.sql. Safe to re-run.
-- ============================================================

drop view if exists public.block_readiness cascade;

create view public.block_readiness
with (security_invoker = on) as
with base as (
  select
    s.id,
    w.number                                   as week,
    s.day,
    s.title,
    s.tag,
    s.run_kind,
    s.est_min,
    (select count(*) from public.blocks b
      where b.session_id = s.id)               as blocks,
    (select count(*) from public.block_lines l
       join public.blocks b on b.id = l.block_id
      where b.session_id = s.id)               as lines,
    -- Everything the fallback has to read.
    coalesce(s.title, '') || ' ' ||
    coalesce(s.tag, '') || ' ' ||
    coalesce(s.focus, '') || ' ' ||
    coalesce(s.summary, '') || ' ' ||
    coalesce(s.description, '')                as text
  from public.sessions s
  join public.weeks w on w.id = s.week_id
)
select
  b.week,
  b.day,
  b.title,
  b.est_min,
  b.run_kind,
  b.blocks,
  b.lines,

  case
    when b.run_kind is not null            then 'guided'
    when b.lines > 0                       then 'blocks'
    when b.text ~* '(compromis|hyrox|station|interval|block|fartlek|speed|ladder|[0-9]+\s*[×x]\s*[0-9]+\s*m|long|easy|zone\s*2|recovery|maff)'
                                           then 'inferred'
    else                                        'nothing'
  end                                          as follows_as,

  -- What to do about it, in the order that costs least.
  case
    when b.run_kind is not null then null
    when b.lines > 0 then 'fine — guided from its blocks'
    when b.text ~* '(compromis|hyrox|station|interval|block|fartlek|speed|ladder|long|easy|zone\s*2)'
      then 'works, but set run_kind to be sure'
    when b.blocks > 0 and b.lines = 0
      then 'has blocks with no lines in them'
    else 'set run_kind, or write the blocks'
  end                                          as fix

from base b
order by
  case
    when b.run_kind is not null then 3
    when b.lines > 0            then 2
    else 1
  end,
  b.week, b.day;

grant select on public.block_readiness to authenticated;


-- ---------- the summary, first ----------
select
  follows_as,
  count(*)                        as sessions,
  string_agg(distinct 'wk' || week, ', ' order by 'wk' || week) as weeks
from public.block_readiness
group by follows_as
order by case follows_as
  when 'nothing' then 1 when 'inferred' then 2
  when 'blocks' then 3 else 4 end;


-- ---------- then every session that isn't guided ----------
select week, day, title, est_min, follows_as, blocks, lines, fix
from public.block_readiness
where follows_as <> 'guided'
order by
  case follows_as when 'nothing' then 1 when 'inferred' then 2 else 3 end,
  week, day;
