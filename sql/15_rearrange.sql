-- ============================================================
--  SALUS TRAIN — a member can move their own week
--
--  Sessions are written to a day, but a member's week isn't the
--  coach's week. Someone works Tuesdays, someone's kid is ill on
--  Thursday. Right now they skip the session and it's gone.
--
--  This lets them move sessions around within their own week
--  without touching what the coach wrote — an override per
--  member, per session, not an edit to the programme.
--
--  Run after 14_salus_leaderboard.sql. Safe to re-run.
-- ============================================================

create table if not exists session_moves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  session_id  uuid references public.sessions on delete cascade not null,
  day         integer not null check (day between 1 and 7),
  moved_at    timestamptz default now(),
  unique (user_id, session_id)
);

alter table public.session_moves enable row level security;

drop policy if exists "own moves read"   on public.session_moves;
drop policy if exists "own moves write"  on public.session_moves;
drop policy if exists "own moves update" on public.session_moves;
drop policy if exists "own moves delete" on public.session_moves;

create policy "own moves read"   on public.session_moves
  for select using (auth.uid() = user_id or public.is_admin());
create policy "own moves write"  on public.session_moves
  for insert with check (auth.uid() = user_id);
create policy "own moves update" on public.session_moves
  for update using (auth.uid() = user_id);
create policy "own moves delete" on public.session_moves
  for delete using (auth.uid() = user_id);

-- ---------- a member's week, with their moves applied ----------
drop function if exists public.my_week(uuid) cascade;

create function public.my_week(p_week uuid)
returns table (
  id         uuid,
  day        integer,
  coach_day  integer,
  moved      boolean,
  slot       integer,
  title      text,
  tag        text,
  kind       text,
  est_min    integer,
  is_test    boolean,
  body       text,
  cover_url  text,
  video_url  text,
  focus      text,
  coach_id   uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    coalesce(m.day, s.day)::integer as day,
    s.day::integer                  as coach_day,
    (m.day is not null and m.day <> s.day)::boolean as moved,
    coalesce(s.slot, 1)::integer as slot,
    s.title::text, s.tag::text, s.kind::text, s.est_min::integer,
    s.is_test::boolean, s.body::text, s.cover_url::text,
    s.video_url::text, s.focus::text, s.coach_id::uuid
  from public.sessions s
  left join public.session_moves m
    on m.session_id = s.id and m.user_id = auth.uid()
  where s.week_id = p_week
  order by coalesce(m.day, s.day), coalesce(s.slot, 1);
$$;

grant execute on function public.my_week(uuid) to authenticated;

-- ---------- save a whole rearrangement in one go ----------
-- One call rather than seven, so a half-applied week can't happen
-- if the connection drops between two of them.
drop function if exists public.rearrange_week(uuid, uuid[], integer[]) cascade;

create function public.rearrange_week(
  p_week    uuid,
  p_session uuid[],
  p_day     integer[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if array_length(p_session, 1) is distinct from array_length(p_day, 1) then
    raise exception 'mismatched arrays';
  end if;

  for i in 1 .. coalesce(array_length(p_session, 1), 0) loop
    insert into public.session_moves (user_id, session_id, day)
    values (auth.uid(), p_session[i], p_day[i])
    on conflict (user_id, session_id)
      do update set day = excluded.day, moved_at = now();
  end loop;
end;
$$;

grant execute on function public.rearrange_week(uuid, uuid[], integer[])
  to authenticated;

-- ---------- put it back the way the coach wrote it ----------
drop function if exists public.reset_week(uuid) cascade;

create function public.reset_week(p_week uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.session_moves m
  using public.sessions s
  where m.session_id = s.id
    and s.week_id = p_week
    and m.user_id = auth.uid();
$$;

grant execute on function public.reset_week(uuid) to authenticated;
