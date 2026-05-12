-- Local-development seed data, loaded by `supabase db reset`.
-- Production / remote pushes do not run this file.
--
-- Sample crew + jobsite data so the list-view UI shows something
-- meaningful before the CRUD flow lands. Delete or replace at will.

insert into public.jobsites (id, name, address, notes) values
  ('11111111-1111-1111-1111-111111111111', 'Smith Residence', '1834 Maple St, Springfield', 'Kitchen + bath remodel; client home most days.'),
  ('22222222-2222-2222-2222-222222222222', 'Downtown Office Build', '210 Market Ave, Floor 4', 'Tenant fit-out; site access via freight elevator.'),
  ('33333333-3333-3333-3333-333333333333', 'Hwy 12 Overpass', 'Mile marker 47, Hwy 12', 'Lane closure window: 9am-3pm weekdays.'),
  ('44444444-4444-4444-4444-444444444444', 'Lincoln Elementary', '500 Cedar Rd', 'Summer-only access; finish by Aug 15.');

insert into public.people (name, phone, current_jobsite_id, notes) values
  ('Alice Chen', '555-0142', '11111111-1111-1111-1111-111111111111', 'Tile + finish carpentry.'),
  ('Bob Martinez', '555-0173', '11111111-1111-1111-1111-111111111111', null),
  ('Carlos Rivera', '555-0188', '22222222-2222-2222-2222-222222222222', 'Foreman on Downtown.'),
  ('Dave Kim', '555-0211', '22222222-2222-2222-2222-222222222222', null),
  ('Eli Johnson', '555-0254', '33333333-3333-3333-3333-333333333333', 'CDL; runs the loader.'),
  ('Frank Wu', '555-0267', '33333333-3333-3333-3333-333333333333', null),
  ('Grace Patel', '555-0290', null, 'Out this week.'),
  ('Henry Davis', '555-0312', '44444444-4444-4444-4444-444444444444', null);
