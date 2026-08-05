/*
  # Create Auth Account for Ama Konadu (0551234568)

  Farmer Ama Konadu exists in the farmers table but has no auth account.
  This creates her login with:
    - Email: +233551234568@cropguard.ag
    - PIN (password): 654321
    - Role: farmer
    - Organisation: ASINYO Demo Org
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '+233551234568@cropguard.ag') THEN
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
      '+233551234568@cropguard.ag',
      crypt('654321', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'role',            'farmer',
        'full_name',       'Ama Konadu',
        'organisation_id', '00000000-0000-0000-0000-000000000001',
        'phone',           '0551234568'
      ),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  END IF;
END $$;
