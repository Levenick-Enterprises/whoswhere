-- whoswhere — initial schema.
-- Two entities (jobsites, people) with a one-to-many relationship: a person
-- is at zero-or-one jobsite at any given time. Soft delete via archived_at.
--
-- RLS is enabled with NO policies. The Data API is locked down; all access
-- must go through server actions using the service_role key. When auth lands
-- in a future migration, policies will be added based on auth.uid().

-- pgcrypto is not required: gen_random_uuid() is built into Postgres 13+
-- via pg_catalog. Supabase runs PG 15+, so the column defaults below work
-- without an extension install.

-- ──────────────────────────────────────────────────────────────────────
-- jobsites
-- ──────────────────────────────────────────────────────────────────────
create table public.jobsites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.jobsites enable row level security;

-- Active jobsites are the common query; filter out archived in the index.
create index jobsites_active_name_idx
  on public.jobsites (name)
  where archived_at is null;

-- ──────────────────────────────────────────────────────────────────────
-- people
-- ──────────────────────────────────────────────────────────────────────
create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  -- ON DELETE SET NULL: deleting a jobsite frees its people rather than
  -- cascading the loss. (We use soft delete normally; this guards hard
  -- deletes too.)
  current_jobsite_id uuid references public.jobsites(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

create index people_active_name_idx
  on public.people (name)
  where archived_at is null;

-- "Who's at this jobsite?" is one of the two main views — index for it.
create index people_active_jobsite_idx
  on public.people (current_jobsite_id)
  where archived_at is null;
