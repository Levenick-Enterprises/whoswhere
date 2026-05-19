-- Allowlist + role storage for whoswhere users. Replaces the per-tenant
-- ALLOWED_EMAILS env var that gated sign-in until now. Same security shape
-- (an admin email curates who can authenticate), different storage: the
-- list lives in the tenant's Supabase DB so a future /users UI can CRUD it
-- without redeploying. Sign-in queries this table via the admin client
-- (createAdminClient(), service-role keyed, RLS-bypassing, server-only) —
-- there's no user session yet at sign-in time, so RLS can't gate the read.
--
-- Email is the natural key: one Supabase project == one auth realm, and
-- Supabase already enforces email uniqueness within auth.users. Stored form
-- is normalized (trim + NFKC + lowercase) — same normalization the sign-in
-- action applies to the form input, kept in lockstep via src/lib/normalizeEmail.
--
-- Cutover sequence per tenant: apply this migration → manually seed at
-- least one admin row (otherwise nobody can sign in once the new code
-- deploys) → deploy the code change → delete ALLOWED_EMAILS from Vercel.
-- Documented in CLAUDE.md under "Per-tenant onboarding for auth".

create table public.app_users (
  email text primary key,
  role text not null check (role in ('admin', 'audit')),
  created_at timestamptz not null default now(),
  -- Enforce the lower+trim half of normalizeEmail() at the DB layer so an
  -- operator's ad-hoc `insert ... ('Michael.Levenick@gmail.com', 'admin')`
  -- fails loudly with a check-constraint violation instead of silently
  -- breaking sign-in (where the lookup is exact-match against the
  -- normalized form). NFKC stays an app-layer concern — Postgres has no
  -- built-in NFKC and the failure mode (homoglyph paste) is far less
  -- common than a casual capitalized paste.
  constraint app_users_email_canonical check (email = lower(btrim(email)))
);

alter table public.app_users enable row level security;

-- "Automatically expose new tables" is OFF on this project, so DML grants
-- don't auto-attach to authenticated when the table is created. service_role
-- happens to get auto-granted but matches existing migrations grant it
-- explicitly anyway. Without these, the cookie-backed server client (running
-- as `authenticated`) would hit "permission denied for table app_users"
-- before RLS even gets a chance to filter rows — getCurrentUserRole() would
-- silently return null and every authed user would look read-only.
grant select, insert, update, delete on public.app_users to authenticated;
grant select, insert, update, delete on public.app_users to service_role;

-- private.is_admin(): is the current authenticated user an admin?
-- SECURITY DEFINER so it sees app_users without recursing into its own RLS
-- when called from a policy. Lives in a private schema (not exposed via the
-- Data API) per the supabase skill's security checklist — SECURITY DEFINER
-- functions don't belong in `public`.
create schema if not exists private;

-- The `authenticated` role needs USAGE on the schema in addition to EXECUTE
-- on the function — without USAGE, every RLS policy that calls is_admin()
-- fails with "permission denied for schema private", which silently blocks
-- admin writes too. CREATE stays revoked (only the schema owner can add
-- new objects here).
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_users
    where email = auth.email() and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Authenticated users can read their own row — powers getCurrentUserRole()
-- in the request path. Admins can read all rows — powers the future /users
-- UI; harmless until that lands.
create policy "self_select_app_users" on public.app_users
  for select to authenticated
  using (email = auth.email());

create policy "admin_select_app_users" on public.app_users
  for select to authenticated
  using (private.is_admin());

create policy "admin_insert_app_users" on public.app_users
  for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_app_users" on public.app_users
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_delete_app_users" on public.app_users
  for delete to authenticated
  using (private.is_admin());

-- Tighten existing policies on projects + people: writes now require the
-- caller to be an admin. SELECT stays open to all authenticated users —
-- audit users can read the whole magnet board, just not change it. DELETE
-- remains uncovered for the authenticated role (soft-delete only; see the
-- narrow_authed_rls_to_select_insert_update migration).
drop policy if exists "authed_insert_projects" on public.projects;
drop policy if exists "authed_update_projects" on public.projects;
drop policy if exists "authed_insert_people" on public.people;
drop policy if exists "authed_update_people" on public.people;

create policy "admin_insert_projects" on public.projects
  for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_projects" on public.projects
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "admin_insert_people" on public.people
  for insert to authenticated
  with check (private.is_admin());

create policy "admin_update_people" on public.people
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
