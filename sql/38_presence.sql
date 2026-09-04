-- ============================================================
--  SALUS TRAIN — faces, and who's here
--
--  The room was a wall of initials with no sense of how many
--  people were in it. Two things fix that: a picture, and
--  knowing who is actually reading right now.
--
--  Presence itself is not stored — it runs over Supabase
--  Realtime and lives only while someone has the app open.
--  Writing "last seen" to a table would mean a database write
--  every thirty seconds per member for something nobody needs
--  a history of.
--
--  Run after 37_carry_media.sql. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists photo_url text;

-- ---------- who's in the room, and what they look like ----------
--  Names and faces only. No numbers, no scores — this answers "who
--  else trains here", which is a different question from the
--  leaderboard and shouldn't leak the same data.
drop view if exists public.room_members cascade;

create view public.room_members
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.photo_url,
  (p.role = 'admin')                                     as is_coach,
  (select max(l.ended_at) from public.workout_logs l
    where l.user_id = p.id and l.ended_at is not null)    as last_trained
from public.profiles p
where p.name is not null
order by (p.role = 'admin') desc, p.name;

grant select on public.room_members to authenticated;
