-- Fix GoTrue service permissions for auth schema
-- This grants the necessary permissions for the auth service to work

-- Grant usage on auth schema to service role
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Also grant to authenticated role
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant specific permissions on auth tables
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.identities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.refresh_tokens TO service_role;

-- Verify grants
SELECT
    schemaname,
    tablename,
    grantee,
    privilege_type
FROM pg_catalog.pg_tables t
JOIN pg_catalog.pg_namespace n ON t.schemaname = n.nspname
LEFT JOIN information_schema.table_privileges p
    ON t.tablename = p.table_name AND t.schemaname = p.table_schema
WHERE schemaname = 'auth'
    AND grantee IN ('service_role', 'authenticator')
ORDER BY tablename, grantee, privilege_type;
