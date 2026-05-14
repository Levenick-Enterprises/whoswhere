-- Opt the two app tables into the supabase_realtime publication so Supabase
-- Realtime broadcasts INSERT/UPDATE/DELETE events for them over WebSocket.
-- The authenticated role already has SELECT under RLS (from the auth gate
-- migration), so subscribed browser sessions will receive events for rows
-- they're allowed to read.
--
-- Default REPLICA IDENTITY (primary key only) is intentional — our handler
-- just calls router.refresh() on any event and doesn't inspect the payload,
-- so we don't need the WAL overhead of REPLICA IDENTITY FULL.

alter publication supabase_realtime add table public.jobsites;
alter publication supabase_realtime add table public.people;
