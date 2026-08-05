/*
# Fix demo auth users: link profiles, set app_metadata, create remaining users

1. Updates the two users created by seed-demo-users (agent + farmer) to have
   proper app_metadata (role, organisation_id).
2. Updates public.users profiles to point to the new auth user IDs.
3. Creates remaining demo users (staff, partner, admin, agronomist, credits)
   in auth.users with proper app_metadata and identities.
4. Links all profiles to their auth user IDs.
*/

-- ── Step 1: Fix app_metadata for agent and farmer ──
UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'role', 'agent',
  'provider', 'email',
  'providers', ARRAY['email']::text[],
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE email = 'agent@asinyo.org';

UPDATE auth.users
SET raw_app_meta_data = jsonb_build_object(
  'role', 'farmer',
  'provider', 'email',
  'providers', ARRAY['email']::text[],
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE email = '+233241234567@cropguard.ag';

-- ── Step 2: Link agent profile to new auth ID ──
UPDATE public.users
SET id = '60d22542-f85d-4752-a4f1-a34f291ed363', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000001';

-- ── Step 3: Link farmer profile to new auth ID ──
UPDATE public.users
SET id = 'ed739b72-2aa9-46d5-bf9b-649dc1400d06', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000002';

-- ── Step 4: Create remaining demo users in auth.users ──

-- Staff: staff@asinyo.org / Staff1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'staff@asinyo.org',
  crypt('Staff1234!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('role','staff','provider','email','providers',ARRAY['email']::text[]),
  jsonb_build_object('full_name','Abena Owusu','phone','0200000003'),
  'authenticated', 'authenticated', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'staff@asinyo.org');

-- Partner: partner@asinyo.org / Partner1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'partner@asinyo.org',
  crypt('Partner1234!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('role','partner','provider','email','providers',ARRAY['email']::text[]),
  jsonb_build_object('full_name','Kofi Mensah','phone','0200000005'),
  'authenticated', 'authenticated', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'partner@asinyo.org');

-- Admin: admin@asinyo.org / Admin1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@asinyo.org',
  crypt('Admin1234!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('role','admin','provider','email','providers',ARRAY['email']::text[]),
  jsonb_build_object('full_name','Admin User','phone','0200000006'),
  'authenticated', 'authenticated', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@asinyo.org');

-- Agronomist: agro@asinyo.org / Agro1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'agro@asinyo.org',
  crypt('Agro1234!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('role','agronomist','provider','email','providers',ARRAY['email']::text[]),
  jsonb_build_object('full_name','Agronomist User','phone','0200000007'),
  'authenticated', 'authenticated', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'agro@asinyo.org');

-- Credits: credits@asinyo.org / Credits1234!
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'credits@asinyo.org',
  crypt('Credits1234!', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('role','credits','provider','email','providers',ARRAY['email']::text[]),
  jsonb_build_object('full_name','Credits User','phone','0200000008'),
  'authenticated', 'authenticated', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'credits@asinyo.org');

-- ── Step 5: Create auth.identities rows for the new users ──
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  now(),
  now()
FROM auth.users u
WHERE u.email IN ('staff@asinyo.org','partner@asinyo.org','admin@asinyo.org','agro@asinyo.org','credits@asinyo.org')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
  );

-- ── Step 6: Link remaining profiles to new auth user IDs ──
UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'staff@asinyo.org'), must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000003';

UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'partner@asinyo.org'), must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000005';

UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'admin@asinyo.org'), must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000006';

UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'agro@asinyo.org'), must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000007';

UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'credits@asinyo.org'), must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000008';
