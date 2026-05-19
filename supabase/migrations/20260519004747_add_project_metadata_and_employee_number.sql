-- Project metadata fields. All nullable text — operator may know any subset
-- at create time. project_number is the human-readable identifier (e.g.
-- "PRJ-0042"); the role columns store free-text names for now (FK-to-people
-- deferred — office staff aren't yet in the people table).
alter table public.projects
  add column project_number text,
  add column project_executive text,
  add column project_manager text,
  add column project_engineer text,
  add column superintendent text,
  add column project_coordinator text;

-- Employee number on people. Same shape as project_number.
alter table public.people
  add column employee_number text;

-- Partial unique indexes: multiple NULLs allowed (operator can have many
-- in-flight rows with no number assigned yet); any non-null value must be
-- unique across active + archived rows. src/lib/uniqueViolation.ts maps
-- the resulting 23505 errors to friendly messages by inspecting the
-- column name in `error.details`, so renaming these indexes is safe —
-- the column names are what's coupled, not the index identifiers.
create unique index projects_project_number_unique
  on public.projects (project_number)
  where project_number is not null;

create unique index people_employee_number_unique
  on public.people (employee_number)
  where employee_number is not null;
