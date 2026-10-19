-- ============================================================
--  SALUS TRAIN — name a 1:1 after the training, not the client
--
--  create_client_programme defaulted to "<name> — 1:1". In the back
--  office the roster already says whose it is on the same row, so the
--  programme name was saying it twice. And in the member's app it's
--  the only name she sees on Train — "Rakhee Patel — 1:1" tells her
--  nothing about what she's about to do. "Full Body" does.
--
--  So: the default becomes the coach's to choose, and anything
--  already created under the old default is renamed.
--
--  Run after 56_copy_everything.sql. Safe to re-run.
-- ============================================================

set lock_timeout = '5s';

drop function if exists public.create_client_programme(uuid, text, integer) cascade;

create function public.create_client_programme(
  p_client uuid,
  p_name   text default null,
  p_weeks  integer default 4
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_name text;
  v_slug text;
  i      integer;
begin
  -- A null uid is the SQL editor or the service role: direct database
  -- access, which is more privileged than an admin rather than less.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not permitted';
  end if;

  if not exists (select 1 from public.profiles where id = p_client) then
    raise exception 'no such member';
  end if;

  --  Named after what it is. Falls back to "Full Body" rather than the
  --  member's name, because a programme name is read by the member on
  --  her own Train screen, where her own name is not information.
  v_name := coalesce(nullif(btrim(p_name), ''), 'Full Body');

  v_slug := 'c-' || replace(p_client::text, '-', '') || '-'
            || to_char(now(), 'YYYYMMDDHH24MISS');

  insert into public.programmes
    (slug, name, weeks, blurb, live, archived, client_id, sort)
  values
    (v_slug, v_name, p_weeks,
     'Written for you. Nobody else can see this.',
     true, false, p_client,
     coalesce((select max(sort) from public.programmes), 0) + 1)
  returning id into v_id;

  for i in 1..p_weeks loop
    insert into public.weeks (programme_id, idx, phase, published)
    values (v_id, i, 'Week ' || i, true);
  end loop;

  update public.profiles
     set programme_id = v_id, week_idx = 1, week_started = current_date
   where id = p_client;

  return v_id;
end;
$$;

grant execute on function public.create_client_programme(uuid, text, integer)
  to authenticated;

-- ---------- rename what the old default already made ----------
update public.programmes
   set name = 'Full Body'
 where client_id is not null
   and name like '%1:1%';
