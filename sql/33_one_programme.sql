-- ============================================================
--  SALUS TRAIN — the elite block becomes Road to HYROX
--
--  Two programmes was a hedge. The elite block is the one that
--  got written properly, and the original seed was three weeks
--  of placeholder sessions. Running both means half the members
--  are on the worse one.
--
--  Idempotent, which the first version was not: 03_seed recreates
--  road-to-hyrox on every run, so this has to cope with finding a
--  fresh empty one sitting next to an archive from last time.
--
--  An empty placeholder is deleted rather than archived —
--  archiving one on every run just accumulates junk. A programme
--  with logged sessions against it is always kept, under the
--  first free archive slug.
--
--  Run after 32_current_week.sql. Safe to re-run.
-- ============================================================

do $$
declare
  v_old     uuid;
  v_new     uuid;
  v_logs    integer;
  v_weeks   integer;
  v_slug    text;
  v_n       integer := 1;
begin
  select id into v_new from public.programmes where slug = 'salus-elite';

  -- Already merged: the elite content is under road-to-hyrox and
  -- there's no salus-elite left to move. Nothing to do.
  if v_new is null then
    raise notice 'salus-elite not present — already merged, or never loaded';
  else
    select id into v_old from public.programmes
     where slug = 'road-to-hyrox' and id <> v_new;

    if v_old is not null then
      -- Does anything actually depend on the old one?
      select count(*) into v_logs
        from public.workout_logs l
        join public.sessions s on s.id = l.session_id
        join public.weeks w    on w.id = s.week_id
       where w.programme_id = v_old;

      select count(*) into v_weeks
        from public.weeks w where w.programme_id = v_old;

      -- Members move across first, either way. week_idx carries over:
      -- someone on week three stays on week three, which beats
      -- resetting them.
      update public.profiles
         set programme_id = v_new
       where programme_id = v_old;

      if v_logs = 0 and v_weeks <= 3 then
        -- A freshly seeded placeholder with nothing in it. Remove it
        -- rather than keeping a copy of nothing.
        delete from public.programmes where id = v_old;
        raise notice 'removed the empty seed programme';
      else
        -- Somebody trained on it. Keep it, under the first free slug.
        loop
          v_slug := 'road-to-hyrox-v' || v_n;
          exit when not exists (
            select 1 from public.programmes where slug = v_slug);
          v_n := v_n + 1;
        end loop;

        update public.programmes
           set slug     = v_slug,
               name     = 'Road to HYROX (archive ' || v_n || ')',
               blurb    = 'An earlier version of the block. Kept so anyone who trained on it still has their history.',
               archived = true
         where id = v_old;
        raise notice 'archived the old programme as %', v_slug;
      end if;
    end if;

    update public.programmes
       set slug     = 'road-to-hyrox',
           name     = 'Road to HYROX',
           blurb    = 'Eight weeks to a HYROX. Six to eleven sessions a week depending on how deep you want to go, built on how the best in the sport actually train.',
           archived = false
     where id = v_new;
  end if;
end $$;

-- ---------- anyone without a programme lands on it ----------
update public.profiles p
   set programme_id = pr.id
  from public.programmes pr
 where pr.slug = 'road-to-hyrox'
   and p.programme_id is null;

-- ---------- and nobody sits past the end of it ----------
update public.profiles p
   set week_idx = least(p.week_idx, pr.weeks)
  from public.programmes pr
 where pr.id = p.programme_id
   and p.week_idx > pr.weeks;
