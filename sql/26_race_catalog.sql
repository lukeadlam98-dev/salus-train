-- ============================================================
--  SALUS TRAIN — a catalogue of real races
--
--  Members were typing race names and dates by hand, which
--  means five spellings of the same event and at least one
--  wrong date. This gives them a list to pick from.
--
--  Sources and dates:
--    ATHX  — athxgames.com, read 31 August 2026. Official.
--    HYROX — hyroxlab.com, an independent tracker that states
--            it verifies against hyrox.com; last verified there
--            6 July 2026. HYROX publishes the second half of a
--            season a few months late, so spring 2027 dates are
--            not out yet and aren't guessed at here.
--
--  Multi-day events are stored as their first day. A member
--  racing the Saturday of a Wednesday-to-Sunday event can
--  adjust their own copy — this table is the fixture list, not
--  their entry.
--
--  Run after 25_races.sql. Safe to re-run.
-- ============================================================

create table if not exists public.race_catalog (
  id         uuid primary key default gen_random_uuid(),
  series     text not null,              -- HYROX | ATHX
  name       text not null,
  race_date  date not null,
  end_date   date,
  venue      text,
  city       text,
  country    text,
  region     text,                       -- Europe, UK, North America…
  url        text,
  active     boolean default true,
  unique (series, name, race_date)
);

create index if not exists race_catalog_date on public.race_catalog (race_date);

alter table public.race_catalog enable row level security;

drop policy if exists "read race_catalog" on public.race_catalog;
create policy "read race_catalog" on public.race_catalog
  for select to authenticated using (true);

drop policy if exists "admin writes race_catalog" on public.race_catalog;
create policy "admin writes race_catalog" on public.race_catalog
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  HYROX 2026/27
-- ============================================================
insert into public.race_catalog
  (series, name, race_date, end_date, venue, city, country, region) values
  -- August 2026
  ('HYROX','HYROX Istanbul','2026-08-01','2026-08-02',null,'Istanbul','Turkey','Europe'),
  ('HYROX','HYROX Chengdu','2026-08-01','2026-08-02',null,'Chengdu','China','Asia-Pacific'),
  ('HYROX','HYROX Chiba','2026-08-06','2026-08-09',null,'Chiba','Japan','Asia-Pacific'),
  ('HYROX','HYROX Shenzhen','2026-08-15','2026-08-16',null,'Shenzhen','China','Asia-Pacific'),
  ('HYROX','AirAsia HYROX Perth','2026-08-21','2026-08-23',null,'Perth','Australia','Asia-Pacific'),
  -- September 2026
  ('HYROX','Amazfit HYROX Washington D.C.','2026-09-03','2026-09-07',null,'Washington, D.C.','USA','North America'),
  ('HYROX','HYROX Tenerife','2026-09-04','2026-09-06',null,'Tenerife','Spain','Europe'),
  ('HYROX','HYROX Beijing','2026-09-12','2026-09-13',null,'Beijing','China','Asia-Pacific'),
  ('HYROX','HYROX Maastricht','2026-09-17','2026-09-20','MECC Maastricht','Maastricht','Netherlands','Europe'),
  ('HYROX','HYROX Salt Lake City','2026-09-18','2026-09-20',null,'Salt Lake City','USA','North America'),
  ('HYROX','HYROX Rome','2026-09-23','2026-09-27',null,'Rome','Italy','Europe'),
  ('HYROX','HYROX Oslo','2026-09-25','2026-09-27',null,'Oslo','Norway','Europe'),
  ('HYROX','HYROX Bordeaux','2026-09-30','2026-10-04',null,'Bordeaux','France','Europe'),
  -- October 2026
  ('HYROX','HYROX Toronto','2026-10-01','2026-10-04',null,'Toronto','Canada','North America'),
  ('HYROX','HYROX Karlsruhe','2026-10-01','2026-10-04','Messe Karlsruhe','Karlsruhe','Germany','Europe'),
  ('HYROX','HYROX Boston','2026-10-08','2026-10-11',null,'Boston','USA','North America'),
  ('HYROX','Let''s Go Fitness HYROX Geneva','2026-10-09','2026-10-11',null,'Geneva','Switzerland','Europe'),
  ('HYROX','HYROX Gdansk','2026-10-10','2026-10-11',null,'Gdansk','Poland','Europe'),
  ('HYROX','HYROX Valencia','2026-10-15','2026-10-18',null,'Valencia','Spain','Europe'),
  ('HYROX','HYROX Sao Paulo','2026-10-17',null,null,'Sao Paulo','Brazil','South America'),
  ('HYROX','HYROX Tampa','2026-10-23','2026-10-25',null,'Tampa','USA','North America'),
  ('HYROX','HYROX Birmingham','2026-10-27','2026-11-01',null,'Birmingham','UK','UK'),
  ('HYROX','HYROX Nice','2026-10-29','2026-11-01',null,'Nice','France','Europe'),
  ('HYROX','HYROX Shanghai','2026-10-31','2026-11-01',null,'Shanghai','China','Asia-Pacific'),
  -- November 2026
  ('HYROX','HYROX Dusseldorf','2026-11-11','2026-11-15','Merkur Spiel-Arena','Dusseldorf','Germany','Europe'),
  ('HYROX','HYROX Barcelona','2026-11-11','2026-11-15',null,'Barcelona','Spain','Europe'),
  ('HYROX','HYROX Denver','2026-11-12','2026-11-15',null,'Denver','USA','North America'),
  ('HYROX','HYROX Seoul','2026-11-14','2026-11-15',null,'Seoul','South Korea','Asia-Pacific'),
  ('HYROX','HYROX Dallas','2026-11-18','2026-11-22',null,'Dallas','USA','North America'),
  ('HYROX','HYROX Poznan','2026-11-20','2026-11-22',null,'Poznan','Poland','Europe'),
  ('HYROX','HYROX Guangzhou','2026-11-21','2026-11-22',null,'Guangzhou','China','Asia-Pacific'),
  ('HYROX','HYROX Utrecht','2026-11-26','2026-11-30','Jaarbeurs Utrecht','Utrecht','Netherlands','Europe'),
  -- December 2026
  ('HYROX','HYROX London','2026-12-02','2026-12-06','ExCeL London','London','UK','UK'),
  ('HYROX','HYROX Anaheim','2026-12-03','2026-12-06',null,'Anaheim','USA','North America'),
  ('HYROX','HYROX Milan','2026-12-05','2026-12-06','Rho Fiera Milano','Milan','Italy','Europe'),
  ('HYROX','HYROX Frankfurt','2026-12-10','2026-12-13',null,'Frankfurt','Germany','Europe'),
  ('HYROX','HYROX Nashville','2026-12-10','2026-12-13',null,'Nashville','USA','North America'),
  ('HYROX','HYROX Paris','2026-12-12','2026-12-20',null,'Paris','France','Europe'),
  ('HYROX','HYROX Gent','2026-12-17','2026-12-20',null,'Gent','Belgium','Europe'),
  ('HYROX','HYROX Helsinki','2026-12-18','2026-12-20',null,'Helsinki','Finland','Europe'),
  ('HYROX','HYROX Vancouver','2026-12-18','2026-12-20',null,'Vancouver','Canada','North America')
on conflict (series, name, race_date) do nothing;

-- ============================================================
--  ATHX — the rest of 2026, and all of 2027
-- ============================================================
insert into public.race_catalog
  (series, name, race_date, end_date, venue, city, country, region) values
  -- 2026
  ('ATHX','ATHX Barcelona 2026','2026-09-05',null,'Fira Barcelona','Barcelona','Spain','Europe'),
  ('ATHX','ATHX Marseille 2026','2026-09-19',null,'Marseille Chanot','Marseille','France','Europe'),
  ('ATHX','ATHX Liverpool 2026','2026-10-03','2026-10-04','Exhibition Centre Liverpool','Liverpool','UK','UK'),
  ('ATHX','ATHX Miami 2026','2026-10-10',null,'Miami Beach Convention Center','Miami','USA','North America'),
  ('ATHX','ATHX Houston 2026','2026-10-17',null,'Reliant Park','Houston','USA','North America'),
  ('ATHX','ATHX Amsterdam 2026','2026-11-07',null,'RAI Amsterdam','Amsterdam','Netherlands','Europe'),
  ('ATHX','ATHX Los Angeles 2026','2026-11-07',null,'Long Beach Convention Center','Los Angeles','USA','North America'),
  ('ATHX','ATHX Finals 2026','2026-11-27','2026-11-29','Lisbon Exhibition & Congress Centre','Lisbon','Portugal','Europe'),
  -- 2027
  ('ATHX','ATHX London 2027','2027-01-23','2027-01-24','ExCeL London','London','UK','UK'),
  ('ATHX','ATHX Paris 2027','2027-02-13','2027-02-14','Paris Event Centre','Paris','France','Europe'),
  ('ATHX','ATHX Valencia 2027','2027-02-20',null,'Feria Valencia','Valencia','Spain','Europe'),
  ('ATHX','ATHX Milan 2027','2027-03-06','2027-03-07','Fiera Milano','Milan','Italy','Europe'),
  ('ATHX','ATHX Brussels 2027','2027-03-20',null,'Brussels Expo','Brussels','Belgium','Europe'),
  ('ATHX','ATHX St Gallen 2027','2027-04-10',null,'Olma Messen St. Gallen','St Gallen','Switzerland','Europe'),
  ('ATHX','ATHX Stuttgart 2027','2027-04-17',null,'Messe Stuttgart','Stuttgart','Germany','Europe'),
  ('ATHX','ATHX Vienna 2027','2027-04-24',null,'Marx Halle','Vienna','Austria','Europe'),
  ('ATHX','ATHX Madrid 2027','2027-05-08','2027-05-09','IFEMA Madrid','Madrid','Spain','Europe'),
  ('ATHX','ATHX Frankfurt 2027','2027-05-22',null,'Messe Frankfurt','Frankfurt','Germany','Europe'),
  ('ATHX','ATHX Montpellier 2027','2027-05-28','2027-05-29','Montpellier Exhibition Centre','Montpellier','France','Europe'),
  ('ATHX','ATHX Glasgow 2027','2027-06-05','2027-06-06','The Scottish Event Campus','Glasgow','UK','UK'),
  ('ATHX','ATHX Dublin 2027','2027-06-12','2027-06-13','RDS Dublin','Dublin','Ireland','Europe'),
  ('ATHX','ATHX Lisbon 2027','2027-06-26','2027-06-27','Feira Internacional de Lisboa','Lisbon','Portugal','Europe'),
  ('ATHX','ATHX Copenhagen 2027','2027-07-31','2027-08-01','Bella Centre','Copenhagen','Denmark','Europe'),
  ('ATHX','ATHX Berlin 2027','2027-08-14','2027-08-15','Arena Halle Berlin','Berlin','Germany','Europe'),
  ('ATHX','ATHX Birmingham 2027','2027-08-20','2027-08-22','NEC Birmingham','Birmingham','UK','UK'),
  ('ATHX','ATHX Hamburg 2027','2027-08-28',null,'Hamburg Messe','Hamburg','Germany','Europe'),
  ('ATHX','ATHX Marseille 2027','2027-09-10','2027-09-11','Marseille Chanot','Marseille','France','Europe'),
  ('ATHX','ATHX Turin 2027','2027-09-25',null,'Lingotto Fiere','Turin','Italy','Europe'),
  ('ATHX','ATHX Amsterdam 2027','2027-10-02','2027-10-03','RAI Amsterdam','Amsterdam','Netherlands','Europe'),
  ('ATHX','ATHX Liverpool 2027','2027-10-09','2027-10-10','ACC Liverpool','Liverpool','UK','UK'),
  ('ATHX','ATHX Bilbao 2027','2027-11-06',null,'Bilbao Exhibition Centre','Bilbao','Spain','Spain')
on conflict (series, name, race_date) do nothing;

-- Bilbao's region was mistyped above; fix rather than leave it wrong.
update public.race_catalog set region = 'Europe' where region = 'Spain';

-- ---------- what's still to come ----------
drop view if exists public.upcoming_races cascade;

create view public.upcoming_races
with (security_invoker = on) as
select
  c.*,
  (c.race_date - current_date) as days_away
from public.race_catalog c
where c.active and c.race_date >= current_date
order by c.race_date;

grant select on public.upcoming_races to authenticated;
