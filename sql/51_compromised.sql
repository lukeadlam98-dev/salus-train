-- ============================================================
--  SALUS TRAIN — the compromised session, guided
--
--  Wednesday had no run_kind and no rounds on it, so the app had
--  nothing to build a session from and dropped straight to "type
--  in a 5km" — for the one session in the week that most needs
--  telling you what to do next.
--
--  It's also the hardest to run off a card: five rounds of a
--  kilometre, forty wall balls and twenty-five calories, and by
--  round three nobody can remember whether it was forty or fifty.
--
--  Run after 50_notifications.sql. Safe to re-run.
-- ============================================================

alter table public.sessions add column if not exists run_reps integer;
alter table public.sessions add column if not exists run_distance_m integer;
alter table public.sessions add column if not exists station_1 text;
alter table public.sessions add column if not exists station_2 text;
alter table public.sessions add column if not exists rest_s integer;

-- ---------- the block's own Wednesdays ----------
--  Taken from the programme as written, week by week, rather than a
--  formula — the shape changes at week five when it goes race-specific.
do $$
declare w record;
begin
  for w in
    select wk.id, wk.idx
      from public.weeks wk
      join public.programmes pr on pr.id = wk.programme_id
     where pr.slug = 'road-to-hyrox'
     order by wk.idx
  loop
    update public.sessions s
       set run_kind       = 'compromised',
           run_distance_m = 1000,
           rest_s         = case when w.idx >= 5 then 120 else 90 end,
           run_reps = case w.idx
             when 1 then 5 when 2 then 5 when 3 then 6 when 4 then 3
             when 5 then 4 when 6 then 5 when 7 then 6 else 2 end,
           station_1 = case
             when w.idx >= 5 then '20 burpee broad jumps'
             else (case when w.idx = 2 or w.idx = 3
                        then '50 wall balls' else '40 wall balls' end)
           end,
           station_2 = case
             when w.idx >= 5 then '50m sled push'
             else (case when w.idx = 2 or w.idx = 3
                        then '30 cal row' else '25 cal row' end)
           end
     where s.week_id = w.id and s.day = 3;
  end loop;
end $$;

-- ---------- and the long Saturday, which has the same problem ----------
update public.sessions s
   set run_kind = coalesce(s.run_kind, 'long')
  from public.weeks w
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id and pr.slug = 'road-to-hyrox'
   and s.day = 6 and s.kind = 'run' and s.run_kind is null;

-- ---------- anything else that's a run but has no plan ----------
--  A run session with no run_kind is a session the app can't guide,
--  which means a member taps Start and gets a form. Better to default
--  it to easy than to drop them into data entry.
update public.sessions s
   set run_kind = 'easy',
       run_minutes = coalesce(s.run_minutes, s.est_min, 30)
  from public.weeks w
  join public.programmes pr on pr.id = w.programme_id
 where s.week_id = w.id and pr.slug = 'road-to-hyrox'
   and s.kind = 'run' and s.run_kind is null;

-- ---------- so a coach can set this up themselves ----------
comment on column public.sessions.run_reps is
  'Rounds, for a compromised session.';
comment on column public.sessions.run_distance_m is
  'The run leg of each round, in metres.';
comment on column public.sessions.station_1 is
  'First station in the round — "40 wall balls".';
comment on column public.sessions.station_2 is
  'Second station, if there is one.';
