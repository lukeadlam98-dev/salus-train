-- ============================================================
--  SALUS TRAIN — The Salus Elite Block
--
--  Eight weeks, nine to eleven sessions a week, four of them
--  doubles. Built on the published methods of Hunter McIntyre
--  (HAOS) and Jake Dearden, at the ATHX strength standard, with
--  a metcon on the end of every hard session.
--
--  This is not the general-population plan. It assumes 40–50km
--  a week already comfortable, a 1.4× bodyweight squat, and at
--  least one HYROX finished.
--
--  Run after 30_block_overview.sql. Safe to re-run.
-- ============================================================

-- ---------- the movements it needs ----------
insert into public.movements (name, default_rest_s, has_time, pct_of, pct) values
  ('Front-Rack Reverse Lunge', 120, false, 'squat', 0.45),
  ('Romanian Deadlift',        120, false, 'squat', 0.70),
  ('Deadlift',                 180, false, 'squat', 1.15),
  ('Weighted Pull-Up',         150, false, null,    null),
  ('Barbell Row',              120, false, 'squat', 0.55),
  ('Push Press',               120, false, 'squat', 0.50),
  ('Farmers Carry',            120, true,  null,    null),
  ('Sled Push',                120, true,  null,    null),
  ('Sled Pull',                120, true,  null,    null),
  ('Wall Balls',                90, false, null,    null),
  ('Burpee Broad Jumps',        90, false, null,    null),
  ('Sandbag Lunges',            90, true,  null,    null),
  ('Thrusters',                 90, false, 'squat', 0.42),
  ('Kettlebell Swings',         60, false, null,    null),
  ('Box Step-Overs',            60, false, null,    null),
  ('Single-Arm DB Row',         90, false, null,    null),
  ('Step-Ups',                  90, false, null,    null)
on conflict (name) do nothing;

-- ---------- the programme ----------
-- Loaded under a working slug; 33_one_programme renames it to
-- road-to-hyrox and archives the original seed block. Kept separate so
-- the merge is a decision you can read rather than a side effect of
-- loading content.
insert into public.programmes
  (slug, name, blurb, weeks, race_name, race_location, race_date,
   uses_half, sessions_per_week)
values
  ('salus-elite', 'Road to HYROX',
   'Eight weeks to a HYROX. Six to eleven sessions a week depending on how deep you want to go, built on how the best in the sport actually train.',
   8, 'HYROX London ExCeL', 'ExCeL, London', '2026-12-03', true, 11)
on conflict (slug) do update
  set name = excluded.name, blurb = excluded.blurb, weeks = excluded.weeks;

-- ---------- eight weeks ----------
insert into public.weeks (programme_id, idx, phase, note, published)
select pr.id, x.idx, x.phase, x.note, true
from public.programmes pr
cross join (values
  (1, 'Build',  'Volume climbs. Nothing here should leave you destroyed.'),
  (2, 'Build',  'The wall balls are the point — they are what falls apart in a race.'),
  (3, 'Build',  'Biggest week of the block. Tired by Thursday is correct.'),
  (4, 'Absorb', 'Volume down 45%, intensity held. Skipping this is what breaks week 6.'),
  (5, 'Sharpen','Race-specific. Saturday is a rehearsal, not a run.'),
  (6, 'Sharpen','Wednesday repeats week 1. Compare the totals.'),
  (7, 'Peak',   'The biggest week. Everything after this gets easier.'),
  (8, 'Taper',  'Volume falls off a cliff. Everything stays fast.')
) as x(idx, phase, note)
where pr.slug = 'salus-elite'
on conflict do nothing;

-- ============================================================
--  SESSIONS
--  day 1 = Monday. The PM halves are separate sessions on the
--  same day, so a member can log them apart — which matters,
--  because the whole point of the second session is that it is
--  easy, and pairing it with the morning hides whether it was.
-- ============================================================

insert into public.sessions
  (week_id, day, slot, title, tag, kind, est_min, is_test, focus, body)
select w.id, x.day, case when x.tag = 'PM' then 2 else 1 end,
       x.title, x.tag, x.kind, x.mins, x.test, x.focus, x.body
from public.weeks w
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  -- ============ WEEK 1 ============
  (1, 1, 'Lower A',        'AM', 'strength', 75, false, 'Back squat',
   'Five by five at 75%. The metcon on the end is short on purpose.'),
  (1, 1, 'Evening Easy',   'PM', 'run',      30, false, 'Z1',
   'Conversational the whole way. If it is hard you are doing it wrong.'),
  (1, 2, 'Threshold 800s', 'AM', 'run',      60, false, 'Running',
   'Eight by 800 at threshold. Or run a 5km if yours is over six weeks old.'),
  (1, 2, 'Prehab',         'PM', 'rest',     30, false, null,
   'Ankle mobility, single-leg calf raises, hip airplanes, banded external rotation.'),
  (1, 3, 'Compromised',    null, 'run',      70, true,  'Running on tired legs',
   'The benchmark. Log the total — you repeat this exact session in week 6.'),
  (1, 4, 'Upper A',        'AM', 'strength', 70, false, 'Weighted pull-up',
   'Pull, press, carry. Grip is the limiter nobody trains enough.'),
  (1, 4, 'Evening Easy',   'PM', 'run',      30, false, 'Z1', null),
  (1, 5, 'Easy & Core',    null, 'run',      55, false, 'Z1', null),
  (1, 6, 'Long Mixed',     null, 'run',      90, false, 'Aerobic base',
   'Ninety minutes. Conversational throughout the running.'),
  (1, 7, 'Rest',           null, 'rest',      0, false, null,
   'A full day off. Not active recovery.')
) as x(widx, day, title, tag, kind, mins, test, focus, body)
where pr.slug = 'salus-elite' and w.idx = x.widx
  and not exists (select 1 from public.sessions s
                  where s.week_id = w.id and s.day = x.day
                    and s.slot = case when x.tag = 'PM' then 2 else 1 end);


-- ---------- weeks 2 to 8 ----------
insert into public.sessions
  (week_id, day, slot, title, tag, kind, est_min, is_test, focus, body)
select w.id, x.day, case when x.tag = 'PM' then 2 else 1 end,
       x.title, x.tag, x.kind, x.mins, x.test, x.focus, x.body
from public.weeks w
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (2, 1, 'Lower A', 'AM', 'strength', 75, false, 'Back squat', 'Five by four at 80%. The Chipper on the end.'),
  (2, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (2, 2, 'Threshold Kilometres', 'AM', 'run', 60, false, 'Running', 'Five by 1km at threshold, two minutes jog.'),
  (2, 2, 'Prehab', 'PM', 'rest', 30, false, null, 'Thirty minutes before you train, not after.'),
  (2, 3, 'Compromised', null, 'run', 70, true, 'Running on tired legs', 'Fifty wall balls a round now. That is what falls apart in a race.'),
  (2, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Death by Ski on the end. It ends when it ends.'),
  (2, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (2, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (2, 6, 'Long Mixed', null, 'run', 100, false, 'Aerobic base', 'A hundred walking lunges in the middle of it.'),
  (2, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (3, 1, 'Lower A', 'AM', 'strength', 75, false, 'Back squat', 'Four by three at 85%, then Fran’s Cousin.'),
  (3, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (3, 2, '5k Pace 600s', 'AM', 'run', 60, false, 'Running', 'Ten by 600 at 5km pace.'),
  (3, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (3, 3, 'Compromised', null, 'run', 80, true, 'Running on tired legs', 'Six rounds. Longest compromised session of the block.'),
  (3, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Cindy’s Angry Sister. Twelve minutes.'),
  (3, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (3, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (3, 6, 'Long Mixed', null, 'run', 120, false, 'Aerobic base', 'Two hours. Biggest of block one.'),
  (3, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (4, 1, 'Lower A', 'AM', 'strength', 45, false, 'Back squat', 'Light. No sled, no metcon. Resist the urge.'),
  (4, 2, 'Short Sharp', 'AM', 'run', 45, false, 'Running', 'Five by 400 hard, full recovery.'),
  (4, 3, 'Compromised', null, 'run', 45, false, 'Running on tired legs', 'Three rounds only.'),
  (4, 4, 'Upper A', 'AM', 'strength', 45, false, 'Pull-up', 'Bodyweight. Pretty Easy on the end, and it should be.'),
  (4, 5, 'Easy & Mobility', null, 'run', 50, false, 'Z1', null),
  (4, 6, 'Long Easy', null, 'run', 60, false, 'Z1', 'Sixty minutes flat. No stations.'),
  (4, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (5, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Five by three at 85%. Sled at race weight.'),
  (5, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (5, 2, 'Race Pace Kilometres', 'AM', 'run', 60, false, 'Running', 'Five by 1km at race pace, sixty seconds standing rest. The short rest is the race.'),
  (5, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (5, 3, 'Compromised', null, 'run', 70, true, 'Transitions', 'Practise the handovers. Walk them properly.'),
  (5, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'Diane’s Day Out on the end.'),
  (5, 4, 'Evening Ski', 'PM', 'erg', 20, false, 'Z2', null),
  (5, 5, 'Easy & Core', null, 'run', 55, false, 'Z1', null),
  (5, 6, 'The Salus Half', null, 'half', 60, true, 'Race rehearsal', 'Four rounds, race pace, no rest between run and station. This feeds your projection.'),
  (5, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (6, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Five by three at 87.5%. Then a hundred wall balls for time.'),
  (6, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (6, 2, 'Fast 800s', 'AM', 'run', 60, false, 'Running', 'Eight by 800 faster than race pace, sixty seconds rest.'),
  (6, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (6, 3, 'Benchmark Repeat', null, 'run', 70, true, 'Running on tired legs', 'The exact week one session. Same rest. Compare the totals.'),
  (6, 4, 'Upper A', 'AM', 'strength', 70, false, 'Weighted pull-up', 'The Grinder. Fifteen minutes.'),
  (6, 4, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (6, 5, 'Easy & Core', null, 'run', 60, false, 'Z1', null),
  (6, 6, 'Long Mixed', null, 'run', 135, false, 'Aerobic base', 'Peak volume. Two hours fifteen.'),
  (6, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (7, 1, 'Lower A', 'AM', 'strength', 80, false, 'Back squat', 'Four by two at 90%. Heaviest sled of the block.'),
  (7, 1, 'Evening Easy', 'PM', 'run', 30, false, 'Z1', null),
  (7, 2, '400 Repeats', 'AM', 'run', 60, false, 'Running', 'Twelve by 400 hard, sixty seconds rest.'),
  (7, 2, 'Prehab', 'PM', 'rest', 30, false, null, null),
  (7, 3, 'Full Rehearsal', null, 'run', 80, true, 'Race day', 'Kit, fuelling, transitions. Everything as it will be.'),
  (7, 4, 'Upper A', 'AM', 'strength', 55, false, 'Weighted pull-up', 'Reduced. No sled, core only.'),
  (7, 5, 'Easy & Mobility', null, 'run', 45, false, 'Z1', null),
  (7, 6, 'Long Mixed', null, 'run', 150, false, 'Aerobic base', 'Two and a half hours. Last big one.'),
  (7, 7, 'Rest', null, 'rest', 0, false, null, 'Off.'),
  (8, 1, 'Primer', 'AM', 'strength', 40, false, 'Back squat', 'Three by three at 75%. Nothing heavy.'),
  (8, 2, 'Strides', 'AM', 'run', 45, false, 'Running', 'Eight by 200 hard, full recovery.'),
  (8, 3, 'Sharpener', null, 'run', 35, false, 'Race pace', 'Should feel fast and finish early. If it feels hard, cut Thursday.'),
  (8, 4, 'Movement Only', 'AM', 'strength', 40, false, null, 'Everything light. Full mobility.'),
  (8, 5, 'Shakeout', null, 'run', 20, false, 'Z1', 'Fifteen minutes very easy, four strides. Nothing else.'),
  (8, 6, 'RACE DAY', null, 'half', 75, true, 'Everything', 'Eight kilometres, eight stations. Go.'),
  (8, 7, 'Rest', null, 'rest', 0, false, null, 'Rest, and eat properly.')
) as x(widx, day, title, tag, kind, mins, test, focus, body)
where pr.slug = 'salus-elite' and w.idx = x.widx
  and not exists (select 1 from public.sessions s
                  where s.week_id = w.id and s.day = x.day
                    and s.slot = case when x.tag = 'PM' then 2 else 1 end);


-- ============================================================
--  THE WORK
--  Blocks carry the structured format fields, so the app runs
--  the metcons rather than just printing them — an AMRAP gets a
--  countdown, a capped piece turns over at the cap.
-- ============================================================

insert into public.blocks
  (session_id, ord, letter, label, scheme, format, rounds, window_s,
   cap_s, rest_s, target_pct, rest_note)
select s.id, x.ord, x.letter, x.label, null,
       x.format, x.rounds, x.window_s, x.cap_s, x.rest_s, x.target_pct, x.note
from public.sessions s
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (1, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.75, null),
  (1, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (1, 1, 'Lower A', 4, 'C', 'Romanian Deadlift', 'sets', 4, null, null, 120, null, null),
  (1, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 6, null, null, 120, null, null),
  (1, 1, 'Lower A', 6, 'E', 'Tin Man', 'fortime', 3, null, 540, null, null, 'The fun bit. Go.'),
  (2, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.8, null),
  (2, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (2, 1, 'Lower A', 4, 'C', 'Romanian Deadlift', 'sets', 4, null, null, 120, null, null),
  (2, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (2, 1, 'Lower A', 6, 'E', 'The Chipper', 'fortime', 1, null, 720, null, null, 'The fun bit. Go.'),
  (3, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 4, null, null, 150, 0.85, null),
  (3, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (3, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (3, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (3, 1, 'Lower A', 6, 'E', 'Fran’s Cousin', 'fortime', 1, null, 480, null, null, 'The fun bit. Go.'),
  (5, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.85, null),
  (5, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (5, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (5, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 6, null, null, 120, null, null),
  (5, 1, 'Lower A', 6, 'E', 'Sled Hell', 'fortime', 4, null, 600, null, null, 'The fun bit. Go.'),
  (6, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 5, null, null, 150, 0.875, null),
  (6, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 4, null, null, 120, null, null),
  (6, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 4, null, null, 120, null, null),
  (6, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (6, 1, 'Lower A', 6, 'E', 'Karen’s Revenge', 'fortime', 1, null, 480, null, null, 'The fun bit. Go.'),
  (7, 1, 'Lower A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (7, 1, 'Lower A', 2, 'A', 'Back squat', 'sets', 4, null, null, 150, 0.9, null),
  (7, 1, 'Lower A', 3, 'B', 'Front-Rack Reverse Lunge', 'sets', 3, null, null, 120, null, null),
  (7, 1, 'Lower A', 4, 'C', 'Deadlift', 'sets', 3, null, null, 120, null, null),
  (7, 1, 'Lower A', 5, 'D', 'Sled Push', 'sets', 8, null, null, 120, null, null),
  (7, 1, 'Lower A', 6, 'E', 'Short and Rude', 'fortime', 3, null, 360, null, null, 'The fun bit. Go.'),
  (1, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (1, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (1, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 5, null, null, 120, null, null),
  (1, 4, 'Upper A', 7, 'F', 'Grip Tax', 'emom', null, 720, null, null, null, 'The fun bit.'),
  (2, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (2, 4, 'Upper A', 3, 'B', 'Single-Arm DB Row', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (2, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (2, 4, 'Upper A', 7, 'F', 'Death by Ski', 'emom', null, null, null, null, null, 'The fun bit.'),
  (3, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 5, null, null, 120, null, null),
  (3, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (3, 4, 'Upper A', 7, 'F', 'Cindy’s Angry Sister', 'amrap', null, 720, null, null, null, 'The fun bit.'),
  (5, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (5, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (5, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (5, 4, 'Upper A', 7, 'F', 'Diane’s Day Out', 'fortime', null, 540, null, null, null, 'The fun bit.'),
  (6, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 5, null, null, 120, null, null),
  (6, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 4, null, null, 120, null, null),
  (6, 4, 'Upper A', 6, 'E', 'Sled Pull', 'sets', 6, null, null, 120, null, null),
  (6, 4, 'Upper A', 7, 'F', 'The Grinder', 'amrap', null, 900, null, null, null, 'The fun bit.'),
  (7, 4, 'Upper A', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (7, 4, 'Upper A', 2, 'A', 'Weighted Pull-Up', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 3, 'B', 'Barbell Row', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 4, 'C', 'Push Press', 'sets', 4, null, null, 120, null, null),
  (7, 4, 'Upper A', 5, 'D', 'Farmers Carry', 'sets', 3, null, null, 120, null, null),
  (1, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (1, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (2, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (2, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (3, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (3, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 6, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.'),
  (5, 3, 'Compromised', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (5, 3, 'Compromised', 2, 'A', 'The Work', 'circuit', 4, null, null, 120, null, '120 seconds between rounds. Hold the same km split every round.'),
  (6, 3, 'Benchmark Repeat', 1, 'W', 'Warm Up', 'circuit', 2, null, null, null, null, null),
  (6, 3, 'Benchmark Repeat', 2, 'A', 'The Work', 'circuit', 5, null, null, 90, null, '90 seconds between rounds. Hold the same km split every round.')
) as x(widx, day, stitle, ord, letter, label, format, rounds, window_s,
       cap_s, rest_s, target_pct, note)
where pr.slug = 'salus-elite'
  and w.idx = x.widx and s.day = x.day and s.title = x.stitle
  and s.slot = 1
  and not exists (select 1 from public.blocks b
                  where b.session_id = s.id and b.letter = x.letter);

insert into public.block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from public.blocks b
join public.sessions s    on s.id = b.session_id
join public.weeks w       on w.id = s.week_id
join public.programmes pr on pr.id = w.programme_id
cross join lateral (values
  (1, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (1, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (1, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (1, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (1, 1, 'Lower A', 'A', 1, '5 × 5', 'Barbell Back Squat', '75%'),
  (1, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', null),
  (1, 1, 'Lower A', 'C', 1, '4 × 8', 'Romanian Deadlift', 'RPE 7'),
  (1, 1, 'Lower A', 'D', 1, '6 × 25m', 'Sled Push', 'heavy, walk back'),
  (1, 1, 'Lower A', 'E', 1, 'For time', '15 wall balls, 12 cal ski, 9 burpee broad jumps', null),
  (2, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (2, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (2, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (2, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (2, 1, 'Lower A', 'A', 1, '5 × 4', 'Barbell Back Squat', '80%'),
  (2, 1, 'Lower A', 'B', 1, '4 × 10 each', 'Front-Rack Reverse Lunge', null),
  (2, 1, 'Lower A', 'C', 1, '4 × 8', 'Romanian Deadlift', 'RPE 7.5'),
  (2, 1, 'Lower A', 'D', 1, '8 × 25m', 'Sled Push', 'heavy'),
  (2, 1, 'Lower A', 'E', 1, 'For time', '50 wall balls, 40 cal row, 30 burpee broad jumps, 20 sandbag lunges', null),
  (3, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (3, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (3, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (3, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (3, 1, 'Lower A', 'A', 1, '4 × 3', 'Barbell Back Squat', '85%'),
  (3, 1, 'Lower A', 'B', 1, '4 × 10 each', 'Front-Rack Reverse Lunge', 'loaded'),
  (3, 1, 'Lower A', 'C', 1, '4 × 5', 'Deadlift', 'RPE 8'),
  (3, 1, 'Lower A', 'D', 1, '8 × 25m', 'Sled Push', 'heaviest of the block'),
  (3, 1, 'Lower A', 'E', 1, 'For time', '21-15-9 thrusters (43/30kg) and chest-to-bar pull-ups', null),
  (5, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (5, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (5, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (5, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (5, 1, 'Lower A', 'A', 1, '5 × 3', 'Barbell Back Squat', '85%'),
  (5, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', 'heavy'),
  (5, 1, 'Lower A', 'C', 1, '4 × 4', 'Deadlift', 'RPE 8'),
  (5, 1, 'Lower A', 'D', 1, '6 × 50m', 'Sled Push', 'race weight'),
  (5, 1, 'Lower A', 'E', 1, 'For time', '25m sled push, 25m sled pull, 10 burpee broad jumps', null),
  (6, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (6, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (6, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (6, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (6, 1, 'Lower A', 'A', 1, '5 × 3', 'Barbell Back Squat', '87.5%'),
  (6, 1, 'Lower A', 'B', 1, '4 × 8 each', 'Front-Rack Reverse Lunge', null),
  (6, 1, 'Lower A', 'C', 1, '4 × 4', 'Deadlift', 'RPE 8.5'),
  (6, 1, 'Lower A', 'D', 1, '8 × 50m', 'Sled Push', 'race weight'),
  (6, 1, 'Lower A', 'E', 1, 'For time', '100 wall balls. That is the whole workout.', null),
  (7, 1, 'Lower A', 'W', 1, '3 min', 'BikeErg easy', null),
  (7, 1, 'Lower A', 'W', 2, '10', 'Ankle rocks each side', null),
  (7, 1, 'Lower A', 'W', 3, '10', 'Air squats', null),
  (7, 1, 'Lower A', 'W', 4, '10', 'Band pull-aparts', null),
  (7, 1, 'Lower A', 'A', 1, '4 × 2', 'Barbell Back Squat', '90%'),
  (7, 1, 'Lower A', 'B', 1, '3 × 8 each', 'Front-Rack Reverse Lunge', null),
  (7, 1, 'Lower A', 'C', 1, '3 × 3', 'Deadlift', 'RPE 8.5'),
  (7, 1, 'Lower A', 'D', 1, '8 × 50m', 'Sled Push', 'heaviest'),
  (7, 1, 'Lower A', 'E', 1, 'For time', '10 thrusters, 10 burpees over the bar', null),
  (1, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (1, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (1, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (1, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (1, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (1, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (1, 4, 'Upper A', 'C', 1, '4 × 6', 'Push Press', null),
  (1, 4, 'Upper A', 'D', 1, '4 × 50m', 'Farmers Carry', null),
  (1, 4, 'Upper A', 'E', 1, '5 × 25m', 'Sled Pull', null),
  (1, 4, 'Upper A', 'F', 1, '', 'Odd: 10 kettlebell swings + 5 burpees. Even: 40m farmers carry.', null),
  (2, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (2, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (2, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (2, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (2, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (2, 4, 'Upper A', 'B', 1, '4 × 10 each', 'Single-Arm DB Row', null),
  (2, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (2, 4, 'Upper A', 'D', 1, '4 × 75m', 'Farmers Carry', null),
  (2, 4, 'Upper A', 'E', 1, '6 × 25m', 'Sled Pull', null),
  (2, 4, 'Upper A', 'F', 1, '', 'Minute 1: 5 cal. Add one calorie every minute until you cannot finish inside it.', null),
  (3, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (3, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (3, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (3, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (3, 4, 'Upper A', 'A', 1, '5 × 4', 'Weighted Pull-Up', null),
  (3, 4, 'Upper A', 'B', 1, '5 × 8', 'Barbell Row', null),
  (3, 4, 'Upper A', 'C', 1, '5 × 4', 'Push Press', null),
  (3, 4, 'Upper A', 'D', 1, '5 × 100m', 'Farmers Carry', null),
  (3, 4, 'Upper A', 'E', 1, '6 × 30m', 'Sled Pull', null),
  (3, 4, 'Upper A', 'F', 1, '', '5 pull-ups, 10 press-ups, 15 air squats, 200m run', null),
  (5, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (5, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (5, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (5, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (5, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (5, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (5, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (5, 4, 'Upper A', 'D', 1, '4 × 100m', 'Farmers Carry', null),
  (5, 4, 'Upper A', 'E', 1, '6 × 30m', 'Sled Pull', null),
  (5, 4, 'Upper A', 'F', 1, '', '21-15-9 deadlift (102/70kg) and handstand press-ups', null),
  (6, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (6, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (6, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (6, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (6, 4, 'Upper A', 'A', 1, '5 × 5', 'Weighted Pull-Up', null),
  (6, 4, 'Upper A', 'B', 1, '5 × 8', 'Barbell Row', null),
  (6, 4, 'Upper A', 'C', 1, '5 × 5', 'Push Press', null),
  (6, 4, 'Upper A', 'D', 1, '4 × 100m', 'Farmers Carry', null),
  (6, 4, 'Upper A', 'E', 1, '6 × 40m', 'Sled Pull', null),
  (6, 4, 'Upper A', 'F', 1, '', '10 cal row, 10 kettlebell swings, 10 box step-overs', null),
  (7, 4, 'Upper A', 'W', 1, '3 min', 'BikeErg easy', null),
  (7, 4, 'Upper A', 'W', 2, '10', 'Ankle rocks each side', null),
  (7, 4, 'Upper A', 'W', 3, '10', 'Air squats', null),
  (7, 4, 'Upper A', 'W', 4, '10', 'Band pull-aparts', null),
  (7, 4, 'Upper A', 'A', 1, '4 × 5', 'Weighted Pull-Up', null),
  (7, 4, 'Upper A', 'B', 1, '4 × 8', 'Barbell Row', null),
  (7, 4, 'Upper A', 'C', 1, '4 × 5', 'Push Press', null),
  (7, 4, 'Upper A', 'D', 1, '3 × 100m', 'Farmers Carry', null),
  (1, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (1, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (1, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (1, 3, 'Compromised', 'A', 2, '', '40 wall balls', null),
  (1, 3, 'Compromised', 'A', 3, '', '25 cal row', null),
  (2, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (2, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (2, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (2, 3, 'Compromised', 'A', 2, '', '50 wall balls', null),
  (2, 3, 'Compromised', 'A', 3, '', '30 cal row', null),
  (3, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (3, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (3, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (3, 3, 'Compromised', 'A', 2, '', '50 wall balls', null),
  (3, 3, 'Compromised', 'A', 3, '', '30 cal row', null),
  (5, 3, 'Compromised', 'W', 1, '10 min', 'Easy running', null),
  (5, 3, 'Compromised', 'W', 2, '6 × 100m', 'Strides, building', null),
  (5, 3, 'Compromised', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (5, 3, 'Compromised', 'A', 2, '', '20 burpee broad jumps', null),
  (5, 3, 'Compromised', 'A', 3, '', '50m sled push + 50m sled pull', null),
  (6, 3, 'Benchmark Repeat', 'W', 1, '10 min', 'Easy running', null),
  (6, 3, 'Benchmark Repeat', 'W', 2, '6 × 100m', 'Strides, building', null),
  (6, 3, 'Benchmark Repeat', 'A', 1, '1km', '1km @ race pace', 'Race pace, every round'),
  (6, 3, 'Benchmark Repeat', 'A', 2, '', '40 wall balls', null),
  (6, 3, 'Benchmark Repeat', 'A', 3, '', '25 cal row', null)
) as x(widx, day, stitle, letter, ord, pres, mv, sub)
where pr.slug = 'salus-elite'
  and w.idx = x.widx and s.day = x.day and s.title = x.stitle
  and s.slot = 1 and b.letter = x.letter
  and not exists (select 1 from public.block_lines bl
                  where bl.block_id = b.id and bl.ord = x.ord);


-- ---------- the chips, from the structured fields ----------
-- Set after insert rather than during, so the generator is the single
-- source of the wording and nothing here can drift from what the back
-- office writes.
update public.blocks b
   set scheme = public.block_scheme(b)
  from public.sessions s
  join public.weeks w       on w.id = s.week_id
  join public.programmes pr on pr.id = w.programme_id
 where b.session_id = s.id
   and pr.slug = 'salus-elite'
   and (b.scheme is null or b.scheme = '');

-- ---------- loggable items, so sets can be ticked off ----------
insert into public.block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, coalesce(b.rounds, 3),
       coalesce(nullif(substring(bl.prescription from '× *(\d+)'), '')::integer, 5),
       coalesce(b.rest_s, 120)
from public.blocks b
join public.block_lines bl on bl.block_id = b.id and bl.ord = 1
join public.movements m    on m.name = bl.movement
join public.sessions s     on s.id = b.session_id
join public.weeks w        on w.id = s.week_id
join public.programmes pr  on pr.id = w.programme_id
where pr.slug = 'salus-elite'
  and b.format = 'sets'
  and not exists (select 1 from public.block_items bi where bi.block_id = b.id);

-- ---------- put the standards on the score ----------
-- The elite block is scored against the same fixed standards as
-- everything else. A member switching programmes keeps their number.
