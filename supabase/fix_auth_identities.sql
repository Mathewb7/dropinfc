-- Fix missing auth.identities entries
-- When we insert into auth.users directly, we also need to create corresponding identities

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each user, create a corresponding identity if it doesn't exist
  FOR user_record IN
    SELECT id, email, encrypted_password, created_at, updated_at
    FROM auth.users
    WHERE email LIKE '%@dropin.test'
  LOOP
    -- Check if identity exists
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = user_record.id) THEN
      -- Create identity
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        user_record.id,
        user_record.id::text,
        jsonb_build_object(
          'sub', user_record.id::text,
          'email', user_record.email,
          'email_verified', true
        ),
        'email',
        user_record.created_at,
        user_record.created_at,
        user_record.updated_at
      );

      RAISE NOTICE 'Created identity for: %', user_record.email;
    END IF;
  END LOOP;

  RAISE NOTICE 'Auth identities fix complete!';
END $$;

-- Verify
SELECT COUNT(*) as identity_count FROM auth.identities WHERE provider = 'email';
