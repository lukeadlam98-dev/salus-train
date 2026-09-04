-- ============================================================
--  SALUS TRAIN — seed data
--  Run AFTER 02_schema.sql. Safe to re-run.
-- ============================================================

-- ---------- movements ----------
insert into movements (name, default_rest_s, has_time, pct_of, pct) values
  ('Barbell Back Squat',    150, false, 'squat', 1.00),
  ('Pause Back Squat',       90, false, 'squat', 0.72),
  ('Chest-Supported Row',    90, false, null,    null),
  ('Lat Pulldown',           90, false, null,    null),
  ('Dead Hang',              90, true,  null,    null),
  ('SkiErg 1,000m',         180, true,  null,    null),
  ('Row 1,000m',            180, true,  null,    null),
  ('5km Time Trial',          0, true,  null,    null)
on conflict (name) do nothing;

-- ---------- loggable items on Monday ----------
-- Block A: the squat test
insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 5, 5, 150
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = 'Barbell Back Squat'
where w.idx = 1 and s.day = 1 and b.letter = 'A'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- Block B: rows and hangs
insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, x.ord, x.sets, x.reps, 90
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('Chest-Supported Row', 1, 3, 10),
  ('Dead Hang',           2, 3, 1)
) as x(mv, ord, sets, reps)
join movements m on m.name = x.mv
where w.idx = 1 and s.day = 1 and b.letter = 'B'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- Thursday: the ergs ----------
insert into blocks (session_id, ord, letter, label, scheme, rest_note)
select s.id, x.ord, x.letter, x.label, x.scheme, x.rest
from sessions s
join weeks w on w.id = s.week_id
cross join (values
  (1, 'W', 'Warm Up', 'Build over 3 efforts', null),
  (2, 'A', 'SkiErg 1,000m', 'All out, fresh', '10 min rest before the row'),
  (3, 'B', 'Row 1,000m', 'All out', null)
) as x(ord, letter, label, scheme, rest)
where w.idx = 1 and s.day = 4
  and not exists (select 1 from blocks b where b.session_id = s.id);

insert into block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('W', 1, '5 min',   'BikeErg easy', null),
  ('W', 2, '3 × 100m','SkiErg, building', null),
  ('W', 3, '3 × 100m','Row, building', null),
  ('A', 1, '1,000m',  'SkiErg', 'Log the time and the average split'),
  ('B', 1, '1,000m',  'Row', 'Log the time and the average split')
) as x(letter, ord, pres, mv, sub)
where w.idx = 1 and s.day = 4 and b.letter = x.letter
  and not exists (select 1 from block_lines bl where bl.block_id = b.id);

insert into coach_notes (block_id, ord, heading, body)
select b.id, x.ord, x.heading, x.body
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('A', 1, 'Pacing', 'Roughly a four-minute effort. Go out at a pace you can hold, not one you can survive for 300m.'),
  ('B', 1, 'Compare', 'Most people are notably better at one. The gap tells you which machine to attack and which to sit on.')
) as x(letter, ord, heading, body)
where w.idx = 1 and s.day = 4 and b.letter = x.letter
  and not exists (select 1 from coach_notes cn where cn.block_id = b.id);

insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 1, null, 600
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = case b.letter when 'A' then 'SkiErg 1,000m' else 'Row 1,000m' end
where w.idx = 1 and s.day = 4 and b.letter in ('A','B')
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- Saturday: the 5km ----------
insert into blocks (session_id, ord, letter, label, scheme, rest_note)
select s.id, x.ord, x.letter, x.label, x.scheme, null
from sessions s
join weeks w on w.id = s.week_id
cross join (values
  (1, 'W', 'Warm Up', '15 min'),
  (2, 'A', 'The Test', 'One effort')
) as x(ord, letter, label, scheme)
where w.idx = 1 and s.day = 6
  and not exists (select 1 from blocks b where b.session_id = s.id);

insert into block_lines (block_id, ord, prescription, movement, sub)
select b.id, x.ord, x.pres, x.mv, x.sub
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('W', 1, '10 min',  'Easy jog', null),
  ('W', 2, '4 × 20s', 'Strides', 'Full recovery between'),
  ('A', 1, '5km',     'Time trial', 'Even pace, 1% incline')
) as x(letter, ord, pres, mv, sub)
where w.idx = 1 and s.day = 6 and b.letter = x.letter
  and not exists (select 1 from block_lines bl where bl.block_id = b.id);

insert into coach_notes (block_id, ord, heading, body)
select b.id, x.ord, x.heading, x.body
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
cross join (values
  ('A', 1, 'Why treadmill', 'Same conditions in week 8. Outdoors in November you would be testing the weather.'),
  ('A', 2, 'Pacing', 'Set the belt and hold it. Most people go out 20 sec/km too fast and lose ninety seconds in the last kilometre.')
) as x(letter, ord, heading, body)
where w.idx = 1 and s.day = 6 and b.letter = x.letter
  and not exists (select 1 from coach_notes cn where cn.block_id = b.id);

insert into block_items (block_id, movement_id, ord, sets, reps, rest_s)
select b.id, m.id, 1, 1, null, 0
from blocks b
join sessions s on s.id = b.session_id
join weeks w on w.id = s.week_id
join movements m on m.name = '5km Time Trial'
where w.idx = 1 and s.day = 6 and b.letter = 'A'
  and not exists (select 1 from block_items bi where bi.block_id = b.id);

-- ---------- coaches ----------
insert into coaches (slug, name, role, bio, spec, replies, tint, sort) values
  ('luke', 'Luke', 'Co-founder & Head of Programming',
   'Co-founded Salus House and writes the training blocks. On the floor most of the week with the hybrid sessions.',
   array['Hybrid training','HYROX programming','Strength'],
   'Usually replies within a day', '#4E463C', 1),
  ('katy', 'Katy', 'Coach',
   'Runs most of the reformer and strength sessions. If squat depth or your hips are the limiter, ask her.',
   array['Reformer Pilates','Strength','Movement quality'],
   'Usually replies within a few hours', '#615146', 2),
  ('stephen', 'Stephen', 'Coach & Operations',
   'Handles the running side and everything race-day — logistics, pacing, wave times, what to expect at ExCeL.',
   array['Running','Conditioning','Race prep'],
   'Usually replies within a few hours', '#4C5348', 3),
  ('alex', 'Alex', 'Coach',
   'Takes the heavy days. Sled position, carries, and anything needing a second pair of eyes under a barbell.',
   array['Strength','Sled & carries','Technique'],
   'Usually replies within a day', '#6B5644', 4)
on conflict (slug) do nothing;

-- ---------- notices ----------
insert into notices (tag, title, body, pinned) values
  ('RACE DAY', 'ExCeL group travel is open',
   'We are taking a group down on the DLR for the Wednesday and Saturday waves. Add your name at the desk by 20 November so we can sort times.',
   true),
  ('TIMETABLE', 'Extra hybrid slot on Tuesday mornings',
   'From next week there is a 06:15 hybrid slot on Tuesdays, built around the compromised running session. Booking is open.',
   false),
  ('THE ROOM', 'New sleds in — race weight from Monday',
   'Both sleds now load to full HYROX Open standards. Ask Alex for a hand setting yours the first time.',
   false)
on conflict do nothing;
