-- ============================================================
--  SALUS TRAIN — what you'd have to lift
--
--  "Your strength is 62" is a grade, not an instruction. The
--  useful version is the number that would move it: a squat of
--  132kg puts you in the next band.
--
--  Run after 46_running_in_the_block.sql. Safe to re-run.
-- ============================================================

drop function if exists public.my_targets(uuid) cascade;

create function public.my_targets(p_user uuid)
returns table (
  key       text,
  label     text,
  unit      text,
  now_value numeric,
  band      text,
  next_band text,
  next_value numeric,
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
  select b.value_num into v_bw
    from public.benchmarks b
   where b.user_id = p_user and b.key = 'bw' and b.week = 1;

  return query
  with mine as (
    select
      d.key,
      case d.key
        when 'squat_bw'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'squat' and b.week = 1)
        when 'deadlift_bw' then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'deadlift' and b.week = 1)
        when 'press_bw'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'press' and b.week = 1)
        when 'wallball'    then (select b.value_num from public.benchmarks b
                                  where b.user_id = p_user and b.key = 'wallball' and b.week = 1)
        else                    (select b.value_s::numeric from public.benchmarks b
                                  where b.user_id = p_user and b.key = d.key and b.week = 1)
      end                                                  as raw,
      d.poor, d.ok, d.good, d.great, d.elite,
      (d.key like '%\_bw')                                  as per_kg,
      (d.key in ('fivek','ski','row'))                     as lower_better
    from public.pillar_standards d
    where d.sex = v_sex
  ),
  named as (
    select m.*,
      case m.key
        when 'squat_bw'    then 'Back squat'
        when 'deadlift_bw' then 'Deadlift'
        when 'press_bw'    then 'Shoulder press'
        when 'fivek'       then '5km'
        when 'ski'         then 'SkiErg'
        when 'row'         then 'Row'
        when 'wallball'    then 'Wall balls'
      end                                                  as nice,
      case
        when m.per_kg and v_bw > 0 then m.raw / v_bw
        else m.raw
      end                                                  as value
    from mine m
  )
  select
    n.key,
    n.nice,
    case when n.per_kg then 'kg' when n.lower_better then 'time' else 'reps' end,
    n.raw,
    -- which band they're in
    case
      when n.value is null then null
      when n.lower_better then
        case when n.value <= n.elite then 'elite'
             when n.value <= n.great then 'great'
             when n.value <= n.good  then 'good'
             when n.value <= n.ok    then 'ok'
             else 'building' end
      else
        case when n.value >= n.elite then 'elite'
             when n.value >= n.great then 'great'
             when n.value >= n.good  then 'good'
             when n.value >= n.ok    then 'ok'
             else 'building' end
    end,
    -- and the one above it
    case
      when n.value is null then 'ok'
      when n.lower_better then
        case when n.value <= n.elite then null
             when n.value <= n.great then 'elite'
             when n.value <= n.good  then 'great'
             when n.value <= n.ok    then 'good'
             else 'ok' end
      else
        case when n.value >= n.elite then null
             when n.value >= n.great then 'elite'
             when n.value >= n.good  then 'great'
             when n.value >= n.ok    then 'good'
             else 'ok' end
    end,
    -- what it would take, in the unit they actually use
    round(
      case
        when n.value is null then (case when n.per_kg then n.ok * coalesce(v_bw, 0) else n.ok end)
        when n.lower_better then
          case when n.value <= n.elite then n.elite
               when n.value <= n.great then n.elite
               when n.value <= n.good  then n.great
               when n.value <= n.ok    then n.good
               else n.ok end
        else
          (case when n.value >= n.elite then n.elite
                when n.value >= n.great then n.elite
                when n.value >= n.good  then n.great
                when n.value >= n.ok    then n.good
                else n.ok end)
          * (case when n.per_kg then coalesce(v_bw, 0) else 1 end)
      end
    , case when n.lower_better then 0 else 0 end),
    round(n.elite * (case when n.per_kg then coalesce(v_bw, 0) else 1 end), 0)
  from named n
  where n.nice is not null
  order by n.nice;
end;
$$;

grant execute on function public.my_targets(uuid) to authenticated;
