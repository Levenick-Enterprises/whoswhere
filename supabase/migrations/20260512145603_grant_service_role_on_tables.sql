-- "Automatically expose new tables" was disabled at project creation to
-- keep `anon` and `authenticated` locked out by default — which is what
-- we want for our RLS-no-policies setup. But that toggle also gates the
-- auto-grant to `service_role`, the role our server-only admin client
-- (using the sb_secret_* key) actually maps to.
--
-- Grant the four table-level DML privileges to service_role on the
-- existing tables, and set default privileges so any future tables
-- created in public are automatically usable by service_role too —
-- without re-exposing anon / authenticated.
grant select, insert, update, delete on public.jobsites to service_role;
grant select, insert, update, delete on public.people to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
