-- ============================================================
--  SALUS TRAIN — predicting a finish before the half
--
--  The projection currently needs a Salus Half. Most members
--  will have done the five tests weeks before they run one,
--  and get nothing in the meantime.
--
--  This predicts from the tests, using the model built for
--  this app and validated against a real HYROX result — 80:01
--  predicted against 80:51 actual, fifty seconds out.
--
--  The half stays the better number. When a member has done
--  one, that's what's shown. This fills the gap before it.
--
--  Run after 21_posts.sql. Safe to re-run.
-- ============================================================

drop function if exists public.predict_finish(uuid) cascade;

create function public.predict_finish(p_user uuid)
returns table (
  seconds     integer,
  confidence  text,
  basis       text,
  run_s       integer,
  station_s   integer,
  rox_s       integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_5k     integer;
  v_ski    integer;
  v_row    integer;
  v_squat  numeric;
  v_bw     numeric;
  v_sex    text;
  v_have   integer := 0;

  -- Riegel, extending a 5km to the 8km run inside a race.
  c_riegel  constant numeric := 1.028;
  -- Erg times inside a race, against fresh.
  c_erg     constant numeric := 1.10;
  -- The eight stations, less the two ergs, as a flat cost. Sled push,
  -- sled pull, burpees, farmers, lunges and wall balls are technique
  -- and grit far more than they are aerobic fitness, and deriving them
  -- from an erg score made the model worse, not better.
  c_rox     constant integer := 330;
  -- Roxzone: the walking between stations. Real, and always underestimated.
  c_zone    constant integer := 330;

  v_run_pace numeric;
  v_run      integer;
  v_stations integer;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  select b.value_s into v_5k from public.benchmarks b
    where b.user_id = p_user and b.key = 'fivek' and b.week = 1;
  select b.value_s into v_ski from public.benchmarks b
    where b.user_id = p_user and b.key = 'ski' and b.week = 1;
  select b.value_s into v_row from public.benchmarks b
    where b.user_id = p_user and b.key = 'row' and b.week = 1;
  select b.value_num into v_squat from public.benchmarks b
    where b.user_id = p_user and b.key = 'squat' and b.week = 1;
  select b.value_num into v_bw from public.benchmarks b
    where b.user_id = p_user and b.key = 'bw' and b.week = 1;

  if v_5k is null then return; end if;

  v_have := (v_5k is not null)::int + (v_ski is not null)::int
          + (v_row is not null)::int + (v_squat is not null)::int;

  -- The running. Riegel out to 8km, then a penalty for doing it in
  -- eight pieces with a station in between each.
  v_run_pace := (v_5k / 5.0) * c_riegel;
  v_run := round(v_run_pace * 8 * 1.06);

  -- The two ergs, slowed for being done mid-race.
  v_stations := round(coalesce(v_ski, 260) * c_erg)
              + round(coalesce(v_row, 250) * c_erg);

  -- Everything else. A stronger squat helps the sleds a little, but
  -- much less than people expect — Jamie squats 1.5× bodyweight and
  -- his sled push was still bottom third, because it's a technique
  -- problem, not a strength one.
  v_stations := v_stations + c_rox * 6
              - case when v_squat is not null and v_bw > 0
                     then least(90, greatest(-60,
                          round(((v_squat / v_bw) - 1.2) * 110)))
                     else 0 end;

  return query select
    (v_run + v_stations + c_zone)::integer,
    -- Cast explicitly. An untyped literal in a CASE is inferred, and
    -- the inference is what a return-type mismatch reports on.
    (case when v_have >= 4 then 'good'
          when v_have = 3  then 'rough'
          else 'very rough' end)::text,
    (case when v_have >= 4 then 'from all four tests'
          when v_have = 3  then 'from three tests'
          else 'from your 5km alone' end)::text,
    v_run::integer,
    v_stations::integer,
    c_zone::integer;
end;
$$;

grant execute on function public.predict_finish(uuid) to authenticated;
