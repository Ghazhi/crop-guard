-- Agronomist: agro@asinyo.org / Agro1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'agro@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      '10000000-0000-0000-0000-000000000007',
      '00000000-0000-0000-0000-000000000000',
      'agro@asinyo.org',
      crypt('Agro1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','agronomist','full_name','Yaw Boateng','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000007'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;

-- Credits: credits@asinyo.org / Credits1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'credits@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      '10000000-0000-0000-0000-000000000008',
      '00000000-0000-0000-0000-000000000000',
      'credits@asinyo.org',
      crypt('Credits1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','credits','full_name','Efua Asante','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000008'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;
