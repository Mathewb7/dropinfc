 -- Recreate your profile
  INSERT INTO profiles (
    id,
    email,
    display_name,
    whatsapp_name,
    role,
    skill_rating,
    is_permanent_keeper,
    total_games_played,
    weeks_since_last_played,
    times_started_as_sub,
    times_started_as_keeper,
    credit_balance,
    withdrawal_strikes
  )
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'mathewbailey1990@gmail.com'),  -- Replace with your actual email
    'mathewbailey1990@gmail.com',           -- Replace with your actual email
    'Mathew Bailey',                 -- Replace with your display name
    '@mathew',              -- Replace with your WhatsApp name
    'super_admin',               -- Gives you full admin access
    5,                           -- Skill rating
    false,                       -- Not a permanent keeper
    0,                           -- Games played
    0,                           -- Weeks since last played
    0,                           -- Times started as sub
    0,                           -- Times started as keeper
    0,                           -- Credit balance
    0                            -- Withdrawal strikes
  );