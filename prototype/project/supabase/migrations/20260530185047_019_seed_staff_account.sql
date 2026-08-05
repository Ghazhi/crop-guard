/*
  # Seed Staff Demo Account

  Creates a staff account for accessing the Farmer Registration & Program Setup portal.

  1. New Auth User
     - Email: staff@asinyo.org
     - Password: Staff1234!
     - Role: staff
     - Org: ASINYO Demo Org (00000000-0000-0000-0000-000000000001)

  2. Notes
     - Uses ON CONFLICT DO NOTHING so re-running is safe
     - The handle_new_auth_user trigger will auto-create the public.users profile row
*/

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
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'staff@asinyo.org',
  crypt('Staff1234!', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'role',            'staff',
    'full_name',       'Abena Owusu',
    'organisation_id', '00000000-0000-0000-0000-000000000001',
    'phone',           '0200000003'
  ),
  'authenticated',
  'authenticated',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
