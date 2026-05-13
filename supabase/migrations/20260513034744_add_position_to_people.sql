-- Add optional free-text "position" to people (e.g. Foreman, Carpenter,
-- Laborer). Nullable so existing rows don't need a backfill; the form
-- treats empty input as null via the existing `nullableTrimmed` zod schema.

alter table public.people
  add column position text;
