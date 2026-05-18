-- Rename `jobsites` to `projects` across the schema. The client's vocabulary
-- (and the sample sheets they sent) calls these "projects"; every jobsite is
-- a project so the broader term is the right fit. Pure rename here — no
-- columns added, no policies changed, no behavior change. The follow-up
-- migration adds project_number + role-assignment columns.

alter table public.jobsites rename to projects;

alter table public.people rename column current_jobsite_id to current_project_id;

-- Postgres preserves the auto-generated FK constraint through a RENAME, but
-- keeps the stale jobsite-flavored name. Rename for cleanliness.
alter table public.people
  rename constraint people_current_jobsite_id_fkey to people_current_project_id_fkey;

alter index jobsites_active_name_idx rename to projects_active_name_idx;
alter index people_active_jobsite_idx rename to people_active_project_idx;

alter policy "authed_select_jobsites" on public.projects rename to "authed_select_projects";
alter policy "authed_insert_jobsites" on public.projects rename to "authed_insert_projects";
alter policy "authed_update_jobsites" on public.projects rename to "authed_update_projects";

-- Realtime publication membership tracks the underlying table OID, so the
-- rename carries through automatically. No ALTER PUBLICATION needed.
