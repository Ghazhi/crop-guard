/*
  # Fix missing auth.identities records

  Every Supabase auth user created by direct INSERT into auth.users needs a
  corresponding row in auth.identities with provider = 'email'. Without it,
  signInWithPassword fails even when the password hash is correct.

  This migration backfills auth.identities for all existing users that are
  missing an identity record.
*/

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object(
    'sub',   u.id::text,
    'email', u.email
  ),
  now(),
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);
