/*
  # Seed Demo Accounts

  Creates two test accounts for login:

  1. Agent account
     - Email: agent@asinyo.org
     - Password: Agent1234!
     - Role: agent
     - Org: ASINYO Demo Org

  2. Farmer account
     - Phone-mapped email: +233241234567@cropguard.ag
     - Password (PIN): 123456
     - Role: farmer
     - Org: ASINYO Demo Org

  Both users are inserted into auth.users with raw_user_meta_data so the
  handle_new_auth_user trigger auto-creates their public.users profile.

  Note: passwords are bcrypt hashed. The plaintext values are for display only.
*/

-- Agent: agent@asinyo.org / Agent1234!
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
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'agent@asinyo.org',
  crypt('Agent1234!', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'role',            'agent',
    'full_name',       'Kwame Asante',
    'organisation_id', '00000000-0000-0000-0000-000000000001',
    'phone',           '0241234567'
  ),
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Farmer: +233241234567@cropguard.ag / 123456
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
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  '+233241234567@cropguard.ag',
  crypt('123456', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'role',            'farmer',
    'full_name',       'Ama Mensah',
    'organisation_id', '00000000-0000-0000-0000-000000000001',
    'phone',           '0241234567'
  ),
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
