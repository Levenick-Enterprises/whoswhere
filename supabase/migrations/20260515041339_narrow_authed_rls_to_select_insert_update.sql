-- Narrow the `authed_modify_*` policies on jobsites + people from `for all`
-- (which covers SELECT/INSERT/UPDATE/DELETE) to `for insert` + `for update`
-- only. SELECT is already covered by the existing `authed_select_*` policies.
-- DELETE is intentionally left uncovered for the `authenticated` role.
--
-- The app never hard-deletes — every "delete" is a soft-delete `update
-- archived_at`. But until this migration, an authenticated session could
-- `DELETE FROM public.people` from the Supabase dashboard SQL editor or a
-- crafted client call, bypassing the trash safety net entirely. After this,
-- such an attempt returns 0 rows affected (RLS denies the row, no error
-- surfaced to the client — that's standard Postgres RLS behavior).
--
-- `service_role` retains full access via the GRANTs from the initial schema
-- migration, so any future bulk-import / admin tooling that legitimately
-- needs DELETE can use the secret-key path via createAdminClient().
--
-- Idempotent: every policy this migration touches is dropped-if-exists
-- before any create, so a partial-apply recovery or accidental re-run
-- lands in the same end state with no errors.

drop policy if exists "authed_modify_jobsites" on public.jobsites;
drop policy if exists "authed_modify_people" on public.people;
drop policy if exists "authed_insert_jobsites" on public.jobsites;
drop policy if exists "authed_update_jobsites" on public.jobsites;
drop policy if exists "authed_insert_people" on public.people;
drop policy if exists "authed_update_people" on public.people;

create policy "authed_insert_jobsites" on public.jobsites
  for insert to authenticated with check (true);
create policy "authed_update_jobsites" on public.jobsites
  for update to authenticated using (true) with check (true);

create policy "authed_insert_people" on public.people
  for insert to authenticated with check (true);
create policy "authed_update_people" on public.people
  for update to authenticated using (true) with check (true);
