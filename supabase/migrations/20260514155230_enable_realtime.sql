-- Opt the two app tables into the supabase_realtime publication so Supabase
-- Realtime broadcasts INSERT/UPDATE/DELETE events for them over WebSocket.
-- The authenticated role already has SELECT under RLS (from the auth gate
-- migration), so subscribed browser sessions will receive events for rows
-- they're allowed to read.
--
-- Default REPLICA IDENTITY (primary key only) is intentional — our handler
-- just calls router.refresh() on any event and doesn't inspect the payload,
-- so we don't need the WAL overhead of REPLICA IDENTITY FULL.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors with "relation is
-- already member of publication" if the table was already added (e.g. via
-- the Supabase dashboard UI or a partial prior run). Guarding each statement
-- against pg_publication_tables keeps the migration safe to re-apply.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'jobsites'
  ) then
    alter publication supabase_realtime add table public.jobsites;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'people'
  ) then
    alter publication supabase_realtime add table public.people;
  end if;
end $$;
