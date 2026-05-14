-- Each tenant Supabase project hosts one foreman; for v1 any authenticated
-- session in the project has full access to that project's data. When
-- issue #8 (multi-foreman) ships, narrow these to auth.uid()-scoped
-- policies. RLS was enabled at table-creation time with no policies, so
-- this migration is what actually opens the door to the user client.

create policy "authed_select_jobsites" on public.jobsites
  for select to authenticated using (true);
create policy "authed_modify_jobsites" on public.jobsites
  for all to authenticated using (true) with check (true);

create policy "authed_select_people" on public.people
  for select to authenticated using (true);
create policy "authed_modify_people" on public.people
  for all to authenticated using (true) with check (true);

-- This project disables "automatically expose new tables" in its Data API
-- settings, which gates GRANTs to authenticated/anon. The service_role
-- grants from the prior migration are unaffected; this just opens the
-- table to the authenticated role so RLS policies can actually take effect.
grant select, insert, update, delete on public.jobsites to authenticated;
grant select, insert, update, delete on public.people   to authenticated;
