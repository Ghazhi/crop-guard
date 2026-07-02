/*
  # Create Agent Account: Abdul Razak

  Creates agent user razak@asinyo.org / Agent1234! in ASINYO Demo Org.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'razak@asinyo.org') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      role,
      aud,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'razak@asinyo.org',
      crypt('Agent1234!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'role',            'agent',
        'full_name',       'Abdul Razak',
        'organisation_id', '00000000-0000-0000-0000-000000000001',
        'phone',           '0200000010',
        'region_code',     'ash'
      ),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  END IF;
END $$;
