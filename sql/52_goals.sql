-- ============================================================
--  SALUS TRAIN — what you're aiming at, and whether you've moved
--
--  Three things were wrong, and they compound.
--
--  1. Every score read week 1 and only week 1. `and b.week = 1` is
--     in every lookup in my_pillars and my_targets, so a member who
--     retested in week 6 saw the same score, the same band and the
--     same target as the day they started. The card could not show
--     improvement because it was never looking at anything that
--     could improve.
--
--  2. The 400m scored the wrong way round. score_one decides
--     lower-is-better from a hardcoded list — fivek, ski, row, sled
--     — and 'fourhundred' was never added to it. So a 75-second 400
--     was read as being 75 units above elite, and every member with
--     a 400 on file scored 100 for Speed.
--
--  3. A target was the next band boundary, whatever it happened to
--     be. Lift 160 with a boundary at 162 and the app says aim for
--     162. That is two kilos. It is arithmetically correct and it
--     is not a goal — it tells somebody who has been training for
--     six weeks that their next objective is a rounding error.
--
--  Run after 51_compromised.sql. Safe to re-run.
-- ============================================================

-- ---------- 1. the latest test, not the first ----------
--
-- One place that answers "what is this member's current number for
-- this test", so no future function has to remember the rule. Week
-- ordering rather than a timestamp, because a retest is defined by
-- which week of the block it belongs to.
drop function if exists public.latest_bm(uuid, text) cascade;

create function public.latest_bm(p_user uuid, p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(b.value_num, b.value_s::numeric)
    from public.benchmarks b
   where b.user_id = p_user and b.key = p_key
     and coalesce(b.value_num, b.value_s::numeric) is not null
   order by b.week desc
   limit 1;
$$;

drop function if exists public.first_bm(uuid, text) cascade;

create function public.first_bm(p_user uuid, p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(b.value_num, b.value_s::numeric)
    from public.benchmarks b
   where b.user_id = p_user and b.key = p_key
     and coalesce(b.value_num, b.value_s::numeric) is not null
   order by b.week asc
   limit 1;
$$;

grant execute on function public.latest_bm(uuid, text) to authenticated;
grant execute on function public.first_bm(uuid, text)  to authenticated;


-- ---------- 2. the 400 counts down, like every other clock ----------
drop function if exists public.score_one(text, text, numeric) cascade;

create function public.score_one(p_key text, p_sex text, p_value numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.pillar_standards%rowtype;
  lower_better boolean;
  bands numeric[];
  marks numeric[] := array[20, 40, 60, 80, 100];
  i integer;
begin
  select * into s from public.pillar_standards
   where key = p_key and sex = coalesce(p_sex, 'm');
  if not found or p_value is null then return null; end if;

  -- 'fourhundred' was missing here, which is the whole of the Speed
  -- pillar reading 100 for everybody.
  lower_better := p_key in ('fivek', 'ski', 'row', 'sled', 'fourhundred');
  bands := array[s.poor, s.ok, s.good, s.great, s.elite];

  if lower_better then
    if p_value >= bands[1] then return round(20 * (bands[1] / p_value), 1); end if;
    if p_value <= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value > bands[i + 1] then
        return round(marks[i] + (marks[i + 1] - marks[i]) *
          ((bands[i] - p_value) / (bands[i] - bands[i + 1])), 1);
      end if;
    end loop;
    return 100;
  else
    if p_value <= bands[1] then return round(20 * (p_value / bands[1]), 1); end if;
    if p_value >= bands[5] then return 100; end if;
    for i in 1..4 loop
      if p_value < bands[i + 1] then
        return round(marks[i] + (marks[i + 1] - marks[i]) *
          ((p_value - bands[i]) / (bands[i + 1] - bands[i])), 1);
      end if;
    end loop;
    return 100;
  end if;
end;
$$;

grant execute on function public.score_one(text, text, numeric) to authenticated;


-- ---------- 3. the pillars, on current numbers, with the move ----------
--
-- Same four pillars. Two additions: every value is the member's
-- latest rather than their first, and the score they started with
-- comes back alongside so the card can say what has changed. A
-- number with no history is a grade; a number next to where it was
-- is progress.
drop function if exists public.my_pillars(uuid) cascade;

create function public.my_pillars(p_user uuid)
returns table (
  pillar      text,
  score       numeric,
  first_score numeric,
  tests       integer,
  weakest     text,
  detail      jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text;
  v_bw numeric; v_bw0 numeric;
  v_squat numeric; v_dead numeric; v_press numeric; v_pull numeric;
  v_5k numeric; v_row numeric; v_400 numeric;
  f_squat numeric; f_dead numeric; f_press numeric; f_pull numeric;
  f_5k numeric; f_row numeric; f_400 numeric;
  s_squat numeric; s_dead numeric; s_press numeric; s_pull numeric;
  s_5k numeric; s_row numeric; s_400 numeric;
  o_squat numeric; o_dead numeric; o_press numeric; o_pull numeric;
  o_5k numeric; o_row numeric; o_400 numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;

  v_bw    := public.latest_bm(p_user, 'bw');
  v_bw0   := public.first_bm(p_user, 'bw');
  v_squat := public.latest_bm(p_user, 'squat');
  v_dead  := public.latest_bm(p_user, 'deadlift');
  v_press := public.latest_bm(p_user, 'press');
  v_pull  := public.latest_bm(p_user, 'pullup');
  v_5k    := public.latest_bm(p_user, 'fivek');
  v_row   := public.latest_bm(p_user, 'row');
  v_400   := public.latest_bm(p_user, 'fourhundred');

  f_squat := public.first_bm(p_user, 'squat');
  f_dead  := public.first_bm(p_user, 'deadlift');
  f_press := public.first_bm(p_user, 'press');
  f_pull  := public.first_bm(p_user, 'pullup');
  f_5k    := public.first_bm(p_user, 'fivek');
  f_row   := public.first_bm(p_user, 'row');
  f_400   := public.first_bm(p_user, 'fourhundred');

  if coalesce(v_bw, 0) > 0 then
    s_squat := public.score_one('squat_bw',    v_sex, v_squat / v_bw);
    s_dead  := public.score_one('deadlift_bw', v_sex, v_dead  / v_bw);
    s_press := public.score_one('press_bw',    v_sex, v_press / v_bw);
    s_pull  := public.score_one('pullup_bw',   v_sex, v_pull  / v_bw);
  end if;

  -- The starting score uses the starting bodyweight. Somebody who
  -- has lost six kilos has improved every ratio without touching a
  -- barbell, and that is real, but it has to be measured against
  -- what they actually weighed at the time.
  if coalesce(v_bw0, 0) > 0 then
    o_squat := public.score_one('squat_bw',    v_sex, f_squat / v_bw0);
    o_dead  := public.score_one('deadlift_bw', v_sex, f_dead  / v_bw0);
    o_press := public.score_one('press_bw',    v_sex, f_press / v_bw0);
    o_pull  := public.score_one('pullup_bw',   v_sex, f_pull  / v_bw0);
  end if;

  s_5k  := public.score_one('fivek',       v_sex, v_5k);
  s_row := public.score_one('row',         v_sex, v_row);
  s_400 := public.score_one('fourhundred', v_sex, v_400);

  o_5k  := public.score_one('fivek',       v_sex, f_5k);
  o_row := public.score_one('row',         v_sex, f_row);
  o_400 := public.score_one('fourhundred', v_sex, f_400);

  return query
  select * from (values
    ('Lower'::text,
     (select round(avg(x), 0) from unnest(array[s_squat, s_dead]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_squat, o_dead]) x where x is not null),
     (select count(*)::integer from unnest(array[s_squat, s_dead]) x where x is not null),
     (select k from (values ('Back squat', s_squat), ('Deadlift', s_dead)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Back squat', round(s_squat), 'Deadlift', round(s_dead))),

    ('Upper',
     (select round(avg(x), 0) from unnest(array[s_press, s_pull]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_press, o_pull]) x where x is not null),
     (select count(*)::integer from unnest(array[s_press, s_pull]) x where x is not null),
     (select k from (values ('Strict press', s_press), ('Pull-up', s_pull)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('Strict press', round(s_press), 'Pull-up', round(s_pull))),

    ('Engine',
     (select round(avg(x), 0) from unnest(array[s_5k, s_row]) x where x is not null),
     (select round(avg(x), 0) from unnest(array[o_5k, o_row]) x where x is not null),
     (select count(*)::integer from unnest(array[s_5k, s_row]) x where x is not null),
     (select k from (values ('5km', s_5k), ('2k row', s_row)) as t(k, v)
       where v is not null order by v limit 1),
     jsonb_build_object('5km', round(s_5k), '2k row', round(s_row))),

    ('Speed',
     round(s_400, 0),
     round(o_400, 0),
     (case when s_400 is null then 0 else 1 end),
     (case when s_400 is null then null else '400m' end),
     jsonb_build_object('400m', round(s_400)))
  ) as p(pillar, score, first_score, tests, weakest, detail);
end;
$$;

grant execute on function public.my_pillars(uuid) to authenticated;


-- ---------- 4. a goal worth training for ----------
--
-- Two numbers come back, and they answer different questions.
--
--   next_value  the boundary of the band above. Where you'd tick
--               over. Sometimes that is two kilos away.
--   goal_value  something actually worth eight weeks. The first
--               band that is far enough above where you are to be
--               a training objective rather than a good day.
--
-- "Far enough" is four per cent. Below that the boundary is noise —
-- the difference between a 160 and a 162 is which day you tested,
-- not what you can lift — so the goal steps past it to the band
-- after. A member two kilos off a band still gets told so; it just
-- isn't presented as the thing to aim at for two months.
--
-- Every label here matches what my_pillars puts in its detail
-- object, and the key comes back too, because joining these two
-- results on a display string is how Pull-up and 400m ended up with
-- no target on the card at all.
drop function if exists public.my_targets(uuid) cascade;

create function public.my_targets(p_user uuid)
returns table (
  key         text,
  label       text,
  pillar      text,
  unit        text,
  lower_wins  boolean,
  now_value   numeric,
  first_value numeric,
  band        text,
  next_band   text,
  next_value  numeric,
  goal_band   text,
  goal_value  numeric,
  elite_value numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sex text; v_bw numeric;
begin
  select coalesce(p.sex, 'm') into v_sex
    from public.profiles p where p.id = p_user;
  v_bw := public.latest_bm(p_user, 'bw');

  return query
  with defs as (
    select * from (values
      ('squat',       'squat_bw',    'Back squat',   'Lower',  true,  false),
      ('deadlift',    'deadlift_bw', 'Deadlift',     'Lower',  true,  false),
      ('press',       'press_bw',    'Strict press', 'Upper',  true,  false),
      ('pullup',      'pullup_bw',   'Pull-up',      'Upper',  true,  false),
      ('fivek',       'fivek',       '5km',          'Engine', false, true),
      ('row',         'row',         '2k row',       'Engine', false, true),
      ('fourhundred', 'fourhundred', '400m',         'Speed',  false, true)
    ) as d(bm_key, std_key, nice, pillar_name, per_kg, lower_wins)
  ),
  mine as (
    select
      d.bm_key, d.std_key, d.nice, d.pillar_name, d.per_kg, d.lower_wins,
      public.latest_bm(p_user, d.bm_key) as raw,
      public.first_bm(p_user, d.bm_key)  as raw0,
      s.poor, s.ok, s.good, s.great, s.elite
    from defs d
    join public.pillar_standards s
      on s.key = d.std_key and s.sex = v_sex
  ),
  rel as (
    select m.*,
      -- The value the standards are written in: a ratio for the
      -- lifts, seconds for anything on a clock.
      case when m.per_kg and coalesce(v_bw, 0) > 0 then m.raw / v_bw
           when m.per_kg then null
           else m.raw end as val,
      -- What one unit of the standard is worth in the member's own
      -- unit, so a ratio target comes back as kilos.
      case when m.per_kg then coalesce(v_bw, 0) else 1 end as scale
    from mine m
  ),
  banded as (
    select r.*,
      case
        when r.val is null then null
        when r.lower_wins then
          case when r.val <= r.elite then 'elite'
               when r.val <= r.great then 'great'
               when r.val <= r.good  then 'good'
               when r.val <= r.ok    then 'ok'
               else 'building' end
        else
          case when r.val >= r.elite then 'elite'
               when r.val >= r.great then 'great'
               when r.val >= r.good  then 'good'
               when r.val >= r.ok    then 'ok'
               else 'building' end
      end as band_now,
      -- the boundary immediately above, in standard units
      case
        when r.val is null then r.ok
        when r.lower_wins then
          case when r.val <= r.elite then null
               when r.val <= r.great then r.elite
               when r.val <= r.good  then r.great
               when r.val <= r.ok    then r.good
               else r.ok end
        else
          case when r.val >= r.elite then null
               when r.val >= r.great then r.elite
               when r.val >= r.good  then r.great
               when r.val >= r.ok    then r.good
               else r.ok end
      end as next_raw,
      case
        when r.val is null then 'ok'
        when r.lower_wins then
          case when r.val <= r.elite then null
               when r.val <= r.great then 'elite'
               when r.val <= r.good  then 'great'
               when r.val <= r.ok    then 'good'
               else 'ok' end
        else
          case when r.val >= r.elite then null
               when r.val >= r.great then 'elite'
               when r.val >= r.good  then 'great'
               when r.val >= r.ok    then 'good'
               else 'ok' end
      end as next_name
    from rel r
  ),
  goaled as (
    select b.*,
      -- The first band that clears four per cent. Anything nearer
      -- than that is the same performance on a different day.
      case
        when b.val is null then b.ok
        when b.lower_wins then
          case when b.val * 0.96 <= b.elite then b.elite
               when b.val * 0.96 <= b.great then b.elite
               when b.val * 0.96 <= b.good  then b.great
               when b.val * 0.96 <= b.ok    then b.good
               else b.ok end
        else
          case when b.val * 1.04 >= b.elite then b.elite
               when b.val * 1.04 >= b.great then b.elite
               when b.val * 1.04 >= b.good  then b.great
               when b.val * 1.04 >= b.ok    then b.good
               else b.ok end
      end as goal_raw,
      case
        when b.val is null then 'ok'
        when b.lower_wins then
          case when b.val * 0.96 <= b.elite then 'elite'
               when b.val * 0.96 <= b.great then 'elite'
               when b.val * 0.96 <= b.good  then 'great'
               when b.val * 0.96 <= b.ok    then 'good'
               else 'ok' end
        else
          case when b.val * 1.04 >= b.elite then 'elite'
               when b.val * 1.04 >= b.great then 'elite'
               when b.val * 1.04 >= b.good  then 'great'
               when b.val * 1.04 >= b.ok    then 'good'
               else 'ok' end
      end as goal_name
    from banded b
  )
  select
    g.bm_key,
    g.nice,
    g.pillar_name,
    case when g.per_kg then 'kg' else 'time' end,
    g.lower_wins,
    g.raw,
    g.raw0,
    g.band_now,
    g.next_name,
    round(g.next_raw * g.scale, 0),
    g.goal_name,
    round(g.goal_raw * g.scale, 0),
    round(g.elite * g.scale, 0)
  from goaled g
  where g.raw is not null
  order by g.pillar_name, g.nice;
end;
$$;

grant execute on function public.my_targets(uuid) to authenticated;
