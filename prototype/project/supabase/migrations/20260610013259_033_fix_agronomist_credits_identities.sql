-- Add missing auth.identities for agronomist and credits accounts
-- Without identities, Supabase email/password login fails

-- Agronomist
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
VALUES (
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000007',
  'agro@asinyo.org',
  'email',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000007', 'email', 'agro@asinyo.org', 'email_verified', true),
  now(), now(), now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Credits
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
VALUES (
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000008',
  'credits@asinyo.org',
  'email',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000008', 'email', 'credits@asinyo.org', 'email_verified', true),
  now(), now(), now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Also reset passwords with proper bcrypt cost (10) to ensure compatibility
UPDATE auth.users
SET encrypted_password = crypt('Agro1234!', gen_salt('bf', 10))
WHERE id = '10000000-0000-0000-0000-000000000007';

UPDATE auth.users
SET encrypted_password = crypt('Credits1234!', gen_salt('bf', 10))
WHERE id = '10000000-0000-0000-0000-000000000008';
