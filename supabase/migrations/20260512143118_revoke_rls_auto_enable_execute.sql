-- The auto-RLS feature (enabled at project creation) installs an event
-- trigger function `public.rls_auto_enable()` that enables RLS on every
-- newly created table in the public schema. The function is SECURITY
-- DEFINER, and because it lives in the `public` schema it's reachable
-- via the Data API at `/rest/v1/rpc/rls_auto_enable`.
--
-- Postgres grants EXECUTE on new functions to the PUBLIC role by default,
-- which transitively exposes the function to anon / authenticated / any
-- future role. Revoke EXECUTE from PUBLIC so only explicitly-granted
-- roles (postgres / the function owner) can call it. The DDL event
-- trigger continues to fire because it executes as the function owner.
--
-- Guard with `IF EXISTS` so `supabase db reset --linked` (which drops the
-- public schema and re-runs all migrations from scratch) can replay this
-- one. The function is a one-time Supabase project-creation artifact —
-- once dropped by reset it doesn't come back, but the REVOKE intent is
-- still satisfied because there's nothing to revoke from.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;
