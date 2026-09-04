-- ============================================================
--  SALUS TRAIN — blocks that the app understands
--
--  The scheme was free text: a coach typed "Circuit · 2 rounds"
--  and the app printed it back. That's a PDF with a login.
--
--  This makes the format structured, so the app can actually run
--  the session — a countdown for an AMRAP, a minute beeper for an
--  EMOM, a cap that turns red, a target weight worked out from
--  what the member tested.
--
--  The chip members see is generated from these fields rather
--  than typed, which also ends "Straight set" and "Straight sets"
--  both existing.
--
--  Run after 28_session_names.sql. Safe to re-run.
-- ============================================================

alter table public.blocks add column if not exists format text default 'sets';
--   sets      straight sets, the default
--   superset  two or more movements back to back
--   circuit   a lap of everything, for rounds
--   amrap     as many rounds as possible in a window
--   emom      every minute on the minute
--   intervals work / rest, repeated
--   fortime   finish it, clock running
--   ladder    reps climb or fall each round

alter table public.blocks add column if not exists rounds integer;
alter table public.blocks add column if not exists window_s integer;   -- AMRAP / EMOM length
alter table public.blocks add column if not exists work_s integer;     -- interval work
alter table public.blocks add column if not exists rest_s integer;     -- interval or set rest
alter table public.blocks add column if not exists cap_s integer;      -- hard stop
alter table public.blocks add column if not exists ladder text;        -- '21-15-9'

-- ---------- how hard ----------
alter table public.blocks add column if not exists target_pct numeric;
--   Of the member's tested max for the movement. 0.75 = 75% of their
--   5RM-derived 1RM. Held as a fraction so one number means the same
--   effort to everyone rather than the same weight.

alter table public.blocks add column if not exists target_rpe numeric;
--   Where there's no test to work from — an RPE is the honest answer
--   for a movement nobody has a number for.

alter table public.blocks add column if not exists pace_pct numeric;
--   For running blocks. 1.00 = their tested 5km pace.

-- ---------- the chip, generated ----------
drop function if exists public.block_scheme(public.blocks) cascade;

create function public.block_scheme(b public.blocks)
returns text
language sql
immutable
as $$
  select case b.format
    when 'amrap'     then 'AMRAP ' || coalesce((b.window_s / 60)::text, '?') || ' min'
    when 'emom'      then 'EMOM ' || coalesce((b.window_s / 60)::text, '?') || ' min'
    when 'fortime'   then 'For time'
      || case when b.cap_s is not null
              then ' · ' || (b.cap_s / 60) || ' min cap' else '' end
    when 'intervals' then coalesce(b.rounds::text || ' × ', '')
      || coalesce(b.work_s::text || 's', '')
      || case when b.rest_s is not null then ' / ' || b.rest_s || 's' else '' end
    when 'circuit'   then 'Circuit'
      || case when b.rounds is not null then ' · ' || b.rounds || ' rounds' else '' end
    when 'superset'  then 'Superset'
      || case when b.rounds is not null then ' · ' || b.rounds || ' sets' else '' end
    when 'ladder'    then coalesce(b.ladder, 'Ladder')
    else                  'Straight sets'
      || case when b.rounds is not null then ' · ' || b.rounds || ' sets' else '' end
  end;
$$;

-- Backfill the new fields from what coaches have already typed, so
-- nothing has to be re-entered by hand.
update public.blocks set format = 'circuit'
 where scheme ilike '%circuit%' and format = 'sets';
update public.blocks set format = 'superset'
 where scheme ilike '%superset%' and format = 'sets';
update public.blocks set format = 'amrap'
 where scheme ilike '%amrap%' and format = 'sets';
update public.blocks set format = 'emom'
 where scheme ilike '%emom%' and format = 'sets';
update public.blocks set format = 'fortime'
 where scheme ilike '%for time%' and format = 'sets';
update public.blocks set format = 'intervals'
 where (scheme ilike '%interval%' or scheme ~ '\d+\s*[×x]\s*\d+') and format = 'sets';

-- Pull a round count out of things like "2 rounds" or "5 sets".
update public.blocks
   set rounds = nullif(substring(scheme from '(\d+)\s*(rounds?|sets?)'), '')::integer
 where rounds is null
   and scheme ~ '\d+\s*(rounds?|sets?)';

-- ---------- what a member is aiming at ----------
-- Turns a block's target into an actual number for one member, using
-- whatever they've tested. Returns null rather than guessing when
-- there's nothing to work from — a made-up target weight is worse
-- than none.
drop function if exists public.block_target(uuid, uuid) cascade;

create function public.block_target(p_user uuid, p_block uuid)
returns table (kind text, value numeric, label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pct   numeric;
  v_rpe   numeric;
  v_pace  numeric;
  v_squat numeric;
  v_5k    integer;
begin
  select b.target_pct, b.target_rpe, b.pace_pct
    into v_pct, v_rpe, v_pace
    from public.blocks b where b.id = p_block;

  if v_pace is not null then
    select bm.value_s into v_5k from public.benchmarks bm
     where bm.user_id = p_user and bm.key = 'fivek' and bm.week = 1;
    if v_5k is not null then
      return query select 'pace'::text,
        round((v_5k / 5.0) * v_pace)::numeric,
        'per km'::text;
      return;
    end if;
  end if;

  if v_pct is not null then
    select bm.value_num into v_squat from public.benchmarks bm
     where bm.user_id = p_user and bm.key = 'squat' and bm.week = 1;
    if v_squat is not null then
      -- Epley from a 5RM, then the percentage. Rounded to 2.5kg
      -- because that's what the plates do.
      return query select 'weight'::text,
        (round((v_squat * 1.1667) * v_pct / 2.5) * 2.5)::numeric,
        'kg'::text;
      return;
    end if;
  end if;

  if v_rpe is not null then
    return query select 'rpe'::text, v_rpe, 'RPE'::text;
    return;
  end if;
end;
$$;

grant execute on function public.block_target(uuid, uuid) to authenticated;
