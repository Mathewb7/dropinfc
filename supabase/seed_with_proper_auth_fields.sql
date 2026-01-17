-- Test: Create ONE user with ALL required fields properly set
-- This is to verify what fields GoTrue needs

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  test_user_id := gen_random_uuid();

  -- Insert with ALL fields that GoTrue expects
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous,
    role,
    aud
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'testuser@dropin.test',
    crypt('testpass123', gen_salt('bf')),
    NOW(),  -- email_confirmed_at
    NULL,  -- invited_at
    '',  -- confirmation_token (EMPTY STRING, not NULL!)
    NULL,  -- confirmation_sent_at
    '',  -- recovery_token (EMPTY STRING)
    NULL,  -- recovery_sent_at
    '',  -- email_change_token_new (EMPTY STRING)
    '',  -- email_change (EMPTY STRING)
    NULL,  -- email_change_sent_at
    NULL,  -- last_sign_in_at
    '{"provider":"email","providers":["email"]}',  -- raw_app_meta_data
    '{"display_name":"Test User"}',  -- raw_user_meta_data
    FALSE,  -- is_super_admin
    NOW(),  -- created_at
    NOW(),  -- updated_at
    NULL,  -- phone
    NULL,  -- phone_confirmed_at
    '',  -- phone_change (EMPTY STRING)
    '',  -- phone_change_token (EMPTY STRING)
    NULL,  -- phone_change_sent_at
    '',  -- email_change_token_current (EMPTY STRING)
    0,  -- email_change_confirm_status
    NULL,  -- banned_until
    '',  -- reauthentication_token (EMPTY STRING)
    NULL,  -- reauthentication_sent_at
    FALSE,  -- is_sso_user
    NULL,  -- deleted_at
    FALSE,  -- is_anonymous
    'authenticated',  -- role
    'authenticated'  -- aud
  );

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
    test_user_id,
    test_user_id::text,
    jsonb_build_object(
      'sub', test_user_id::text,
      'email', 'testuser@dropin.test',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Test user created: testuser@dropin.test';
  RAISE NOTICE 'Try logging in with: testuser@dropin.test / testpass123';
END $$;
