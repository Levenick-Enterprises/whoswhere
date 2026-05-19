-- Per-person flag controlling whether the person renders as a draggable
-- magnet on the /projects board. Defaults to true so existing rows stay
-- visible. Operator unchecks it on the person detail edit form when a
-- person is in the system for tracking/assignment purposes but shouldn't
-- clutter the magnet board — e.g. office staff who never get assigned to
-- a project, long-term inactives, placeholder names from a CSV import.
--
-- The flag affects only the /projects board view. /people list, project
-- detail crew lists, person detail page, and assignment workflows all
-- continue to show hidden people — they aren't archived, just not
-- magnetized.
--
-- Phase 2 (deferred): a user_hidden_people table layered on top of this
-- global flag so each operator (including audit users) can curate their
-- own view without affecting other users. This column stays as the
-- baseline; the per-user table would be a blocklist that adds further
-- hiding, never re-shows a globally-hidden person.
alter table public.people
  add column show_magnet boolean not null default true;
