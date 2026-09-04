-- ============================================================
--  SALUS TRAIN — a coach explaining the session
--
--  A written coach's note tells you the standard. A coach
--  saying it tells you the intent, and it's the closest thing
--  to them being in the room at six in the morning.
--
--  Also adds a focus — the one movement the session is really
--  about — because "Lower A" doesn't say what today is for.
--
--  Run after 16_progress.sql. Safe to re-run.
-- ============================================================

alter table public.sessions add column if not exists video_url text;
alter table public.sessions add column if not exists focus text;
alter table public.sessions add column if not exists coach_id uuid
  references public.coaches on delete set null;

-- Coaches need a photo to appear next to their video.
alter table public.coaches add column if not exists photo_url text;

-- ---------- how many people have done this session ----------
-- Not vanity: seeing that forty others have done today's session is
-- the closest a solo 6am member gets to training with the room.
drop view if exists public.session_completions cascade;

create view public.session_completions
with (security_invoker = on) as
select
  s.id as session_id,
  count(distinct w.user_id) as people,
  count(*) as completions
from public.sessions s
join public.workout_logs w on w.session_id = s.id and w.ended_at is not null
group by s.id;

grant select on public.session_completions to authenticated;
