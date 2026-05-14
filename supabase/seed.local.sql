-- Local-development + stress-test seed data, loaded automatically by
-- `pnpm db:reset:local` against the LOCAL Docker stack.
--
-- ⚠ DESTRUCTIVE — wipes `people` and `jobsites` unconditionally. Three
-- layered defenses keep this from ever running against a remote cluster:
--   1. `scripts/db.sh` is the canonical wrapper for any migration flow
--      and never invokes `db reset` on a remote.
--   2. This file is named `seed.local.sql` (vs the CLI's default `seed.sql`)
--      so accidental discovery is impossible — only `supabase/config.toml`
--      points at it.
--   3. The guard block below refuses to execute on any cluster whose
--      server IP is publicly routable.
--
-- ~200 people across 15 Wisconsin-flavored jobsites. Names lean
-- German / Polish / Scandinavian / Anglo (Wisconsin demographic mix).
-- Phone numbers are deterministic 555-XXXX. ~10% of crew are
-- unassigned at any time.

-- Refuse to run on a non-local cluster. Supabase Cloud poolers sit on
-- public IPs; local Docker is 127.x or 172.x. NULL inet_server_addr()
-- (Unix-socket connection) passes through — that's local by definition.
do $$
begin
  if inet_server_addr() is not null
     and not (inet_server_addr() << inet '127.0.0.0/8'
              or inet_server_addr() << inet '10.0.0.0/8'
              or inet_server_addr() << inet '172.16.0.0/12'
              or inet_server_addr() << inet '192.168.0.0/16') then
    raise exception 'seed.local.sql refuses to run on a non-local cluster (server addr: %)', inet_server_addr();
  end if;
end $$;

delete from public.people;
delete from public.jobsites;

-- ──────────────────────────────────────────────────────────────────────
-- Jobsites — 15 sites scattered across Wisconsin.
-- ──────────────────────────────────────────────────────────────────────
insert into public.jobsites (id, name, address, notes) values
  ('00000000-0000-0000-0000-000000000001', 'Smith Residence', '1834 Maple St, Madison', 'Kitchen + bath remodel; client home most days.'),
  ('00000000-0000-0000-0000-000000000002', 'Downtown Office Build', '210 Market Ave, Floor 4, Milwaukee', 'Tenant fit-out; site access via freight elevator.'),
  ('00000000-0000-0000-0000-000000000003', 'Hwy 12 Overpass', 'Mile marker 47, Hwy 12', 'Lane closure window: 9am-3pm weekdays.'),
  ('00000000-0000-0000-0000-000000000004', 'Lincoln Elementary', '500 Cedar Rd, Green Bay', 'Summer-only access; finish by Aug 15.'),
  ('00000000-0000-0000-0000-000000000005', 'Lake Geneva Resort', '1145 Shore Dr, Lake Geneva', 'Lakefront cabana expansion; high-season deadline.'),
  ('00000000-0000-0000-0000-000000000006', 'Sheboygan Cheese Plant', '2701 Industrial Pkwy, Sheboygan', 'Refrigerated zone; food-safety PPE required.'),
  ('00000000-0000-0000-0000-000000000007', 'Oshkosh Airport Hangar', 'Wittman Regional, Bay 12', 'Active airfield; coordinate with tower for crane lifts.'),
  ('00000000-0000-0000-0000-000000000008', 'Eau Claire Hospital Wing', '1400 Bellinger St, Eau Claire', 'Patient-occupied building; noise window 7am-5pm only.'),
  ('00000000-0000-0000-0000-000000000009', 'La Crosse Riverfront Lofts', '88 Riverside N, La Crosse', 'Mixed-use; ground-floor retail finishing now.'),
  ('00000000-0000-0000-0000-000000000010', 'Wausau Distribution Center', '6200 Stewart Ave, Wausau', 'Tilt-up panels going up next week.'),
  ('00000000-0000-0000-0000-000000000011', 'Appleton Public Works', '1819 Wisconsin Ave, Appleton', 'Municipal contract; weekly progress meetings Tue 8am.'),
  ('00000000-0000-0000-0000-000000000012', 'Kenosha Marina Pavilion', 'Harbor Park, Kenosha', 'Tidal work — schedule around water levels.'),
  ('00000000-0000-0000-0000-000000000013', 'Janesville School Gym', '2400 S Crosby Ave, Janesville', 'Roof + bleacher replacement.'),
  ('00000000-0000-0000-0000-000000000014', 'Racine Brewery Expansion', '524 6th St, Racine', 'Stainless install; certified welders only.'),
  ('00000000-0000-0000-0000-000000000015', 'Stevens Point Mall Reno', '5300 US-10, Stevens Point', 'Phased — anchor stores stay open during work.');

-- ──────────────────────────────────────────────────────────────────────
-- People — generated via CTE cross-join over first/last name pools.
-- Deterministic ordering via md5 hash (so re-runs of this seed produce
-- the same 200 people; not "random" but visually well-mixed).
-- ──────────────────────────────────────────────────────────────────────
with first_names(name) as (
  values
    -- Anglo (older, generational Midwest)
    ('Wayne'), ('Dale'), ('Doug'), ('Greg'), ('Curt'), ('Bruce'), ('Brett'),
    ('Roger'), ('Stan'), ('Don'), ('Glen'), ('Mel'), ('Vern'), ('Lloyd'),
    ('Wally'), ('Howie'), ('Rich'), ('Larry'), ('Gary'), ('Terry'),
    ('Jerry'), ('Tom'), ('Bob'), ('Mike'), ('Steve'), ('Dave'), ('Bill'),
    ('Jim'), ('John'), ('Frank'), ('Hank'),
    -- Middle-generation
    ('Brian'), ('Scott'), ('Mark'), ('Kurt'), ('Brad'), ('Chad'), ('Eric'),
    ('Tim'), ('Joel'), ('Karl'),
    -- Scandinavian heritage
    ('Hans'), ('Sven'), ('Lars'), ('Magnus'), ('Klaus'), ('Ole'), ('Erik'),
    ('Per'), ('Henrik'), ('Bjorn'), ('Knut'), ('Olaf'), ('Anders'), ('Stefan'),
    -- Polish heritage
    ('Wojciech'), ('Tomasz'), ('Piotr'), ('Marek'), ('Jacek'), ('Karol'), ('Pawel'),
    -- Younger
    ('Tyler'), ('Trevor'), ('Travis'), ('Brody'), ('Cole'), ('Tucker'),
    ('Cody'), ('Caleb'), ('Hunter'), ('Bryce'), ('Tanner'), ('Logan'),
    ('Connor'),
    -- Women on the crew
    ('Linda'), ('Diane'), ('Karen'), ('Cindy'), ('Patty'), ('Jenny'),
    ('Beth'), ('Susie'), ('Lori'), ('Ashley'), ('Brittany'), ('Heather'),
    ('Stephanie'), ('Megan'), ('Whitney'),
    ('Astrid'), ('Ingrid'), ('Helga'), ('Sigrid'), ('Gerda'), ('Annika'),
    ('Greta'), ('Marta'), ('Anya'), ('Eva'), ('Klara')
),
last_names(name) as (
  values
    -- German
    ('Schmidt'), ('Mueller'), ('Weber'), ('Fischer'), ('Wagner'), ('Becker'),
    ('Schulz'), ('Hoffmann'), ('Bauer'), ('Schroeder'), ('Klein'), ('Wolf'),
    ('Schwarz'), ('Zimmermann'), ('Braun'), ('Krueger'), ('Hartmann'),
    ('Lange'), ('Schmitt'), ('Werner'),
    -- Polish
    ('Kowalski'), ('Nowak'), ('Wisniewski'), ('Wojcik'), ('Kowalczyk'),
    ('Kaminski'), ('Lewandowski'), ('Zielinski'), ('Szymanski'), ('Wozniak'),
    ('Mazur'), ('Kwiatkowski'),
    -- Scandinavian
    ('Olson'), ('Anderson'), ('Hansen'), ('Larson'), ('Nelson'), ('Erickson'),
    ('Peterson'), ('Johnson'), ('Carlson'), ('Bergstrom'), ('Lindquist'),
    ('Hagen'), ('Sundberg'), ('Bjornson'), ('Nilsen'),
    -- Anglo
    ('Lewis'), ('Walsh'), ('Murphy'), ('Kelly'), ('Sullivan'), ('Cooper'),
    ('Brown'), ('Davis'), ('Wilson'), ('Thompson'), ('Miller'), ('Moore'),
    ('Taylor')
),
all_combos as (
  select
    f.name || ' ' || l.name as full_name,
    md5(f.name || '/' || l.name) as h
  from first_names f, last_names l
),
sample as (
  select
    full_name,
    row_number() over (order by h) as rn
  from all_combos
  order by h
  limit 200
),
js as (
  select id, row_number() over (order by name) as rn
  from public.jobsites
)
insert into public.people (name, position, phone, current_jobsite_id)
select
  s.full_name,
  -- Position distribution over 20 buckets, weighted toward common trades:
  --   2/20 Foreman, 4/20 Carpenter, 3/20 Laborer, 1/20 each of 11 other trades.
  --   `rn * 31 % 20` gives a stable spread across the 200 rows.
  case ((s.rn * 31) % 20)
    when 0 then 'Foreman'
    when 1 then 'Foreman'
    when 2 then 'Carpenter'
    when 3 then 'Carpenter'
    when 4 then 'Carpenter'
    when 5 then 'Carpenter'
    when 6 then 'Laborer'
    when 7 then 'Laborer'
    when 8 then 'Laborer'
    when 9 then 'Electrician'
    when 10 then 'Plumber'
    when 11 then 'Mason'
    when 12 then 'Roofer'
    when 13 then 'Painter'
    when 14 then 'Equipment Operator'
    when 15 then 'Welder'
    when 16 then 'Concrete Finisher'
    when 17 then 'Drywaller'
    when 18 then 'Crane Operator'
    when 19 then 'Apprentice'
  end,
  -- Deterministic 555-XXXX number per row.
  '555-' || lpad((((s.rn * 7919) % 9000) + 1000)::text, 4, '0'),
  -- ~11% unassigned (every 9th row); the rest spread evenly across the 15
  -- jobsites by rn modulo.
  case
    when s.rn % 9 = 0 then null
    else (select id from js where js.rn = ((s.rn % 15) + 1))
  end
from sample s;
