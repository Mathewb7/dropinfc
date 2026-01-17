-- Check if the trigger function has permission to insert profiles
-- The function needs to be SECURITY DEFINER (which it is)
-- But let's verify the RLS policies

-- Show current RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- If the above shows policies that might block inserts,
-- we need to ensure the trigger function bypasses RLS
-- This is already handled by SECURITY DEFINER, but let's verify:

-- Re-create the function with explicit SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    whatsapp_name,
    is_permanent_keeper
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_permanent_keeper')::boolean, false)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (this will appear in Supabase logs)
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;
