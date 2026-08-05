
-- Fix raw_app_meta_data (required by Supabase for email/password auth)
-- and reset passwords to known values

UPDATE auth.users
SET
  raw_app_meta_data = '{"provider":"email","providers":["email"]}',
  encrypted_password = crypt('Agro1234!', gen_salt('bf', 10))
WHERE id = '10000000-0000-0000-0000-000000000007';

UPDATE auth.users
SET
  raw_app_meta_data = '{"provider":"email","providers":["email"]}',
  encrypted_password = crypt('Credits1234!', gen_salt('bf', 10))
WHERE id = '10000000-0000-0000-0000-000000000008';

-- Also ensure identities have the correct identity_data
UPDATE auth.identities
SET identity_data = jsonb_build_object(
  'sub', '10000000-0000-0000-0000-000000000007',
  'email', 'agro@asinyo.org',
  'email_verified', true,
  'provider', 'email'
)
WHERE user_id = '10000000-0000-0000-0000-000000000007';

UPDATE auth.identities
SET identity_data = jsonb_build_object(
  'sub', '10000000-0000-0000-0000-000000000008',
  'email', 'credits@asinyo.org',
  'email_verified', true,
  'provider', 'email'
)
WHERE user_id = '10000000-0000-0000-0000-000000000008';
