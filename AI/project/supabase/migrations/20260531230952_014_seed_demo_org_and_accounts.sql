/*
  # Seed Demo Organisation and Demo Accounts

  Creates the ASINYO Demo Org and the following authenticated users:

  | Role    | Email                          | Password    | Full Name       |
  |---------|-------------------------------|-------------|-----------------|
  | agent   | agent@asinyo.org              | Agent1234!  | Kwame Asante    |
  | farmer  | +233241234567@cropguard.ag    | 654321      | Ama Mensah      |
  | staff   | staff@asinyo.org              | Staff1234!  | Abena Owusu     |
  | agent   | razak@asinyo.org              | Agent1234!  | Abdul Razak     |
  | farmer  | +233551234568@cropguard.ag    | 654321      | Ama Konadu      |
  | partner | partner@asinyo.org            | Partner1234!| Kofi Mensah     |
  | admin   | admin@asinyo.org              | Admin1234!  | Admin User      |
*/

-- Demo organisation
INSERT INTO organisations (id, name, type, country, contact_email, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ASINYO Demo Org',
  'financial_institution',
  'GH',
  'admin@asinyo.org',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Demo program
INSERT INTO programs (id, organisation_id, name, description, crop_season, crop_types, regions, start_date, end_date, target_enrollment, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Maize Season 2026A',
  'Smallholder maize farmer resilience program for Ashanti and Brong-Ahafo regions.',
  '2026A',
  ARRAY['maize']::crop_type[],
  ARRAY['AH','BA']::region_code[],
  '2026-03-01',
  '2026-09-30',
  500,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Agent: agent@asinyo.org / Agent1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'agent@asinyo.org',
  crypt('Agent1234!', gen_salt('bf')),
  now(),
  jsonb_build_object('role','agent','full_name','Kwame Asante','organisation_id','00000000-0000-0000-0000-000000000001','phone','0241234567'),
  'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Farmer: +233241234567@cropguard.ag / 654321
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  '+233241234567@cropguard.ag',
  crypt('654321', gen_salt('bf')),
  now(),
  jsonb_build_object('role','farmer','full_name','Ama Mensah','organisation_id','00000000-0000-0000-0000-000000000001','phone','0241234567'),
  'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Staff: staff@asinyo.org / Staff1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, role, aud, created_at, updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'staff@asinyo.org',
  crypt('Staff1234!', gen_salt('bf')),
  now(),
  jsonb_build_object('role','staff','full_name','Abena Owusu','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000003'),
  'authenticated', 'authenticated', now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Agent: razak@asinyo.org / Agent1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'razak@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'razak@asinyo.org',
      crypt('Agent1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','agent','full_name','Abdul Razak','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000010'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;

-- Farmer: +233551234568@cropguard.ag / 654321
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '+233551234568@cropguard.ag') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      '+233551234568@cropguard.ag',
      crypt('654321', gen_salt('bf')),
      now(),
      jsonb_build_object('role','farmer','full_name','Ama Konadu','organisation_id','00000000-0000-0000-0000-000000000001','phone','0551234568'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;

-- Partner: partner@asinyo.org / Partner1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'partner@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      '10000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-000000000000',
      'partner@asinyo.org',
      crypt('Partner1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','partner','full_name','Kofi Mensah','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000005'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;

-- Admin: admin@asinyo.org / Admin1234!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@asinyo.org') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, role, aud, created_at, updated_at
    ) VALUES (
      '10000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000000',
      'admin@asinyo.org',
      crypt('Admin1234!', gen_salt('bf')),
      now(),
      jsonb_build_object('role','admin','full_name','Admin User','organisation_id','00000000-0000-0000-0000-000000000001','phone','0200000006'),
      'authenticated', 'authenticated', now(), now()
    );
  END IF;
END $$;
