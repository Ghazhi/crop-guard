/*
# Seed team user account

Creates a demo team user for the finance module.
Email: team@cropguard.demo  Password: Team1234!
Uses fixed UUID to avoid conflicts on re-runs.
*/

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000099';
  v_org_id  uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'team@cropguard.demo',
    crypt('Team1234!', gen_salt('bf')),
    now(),
    jsonb_build_object('organisation_id', v_org_id, 'role', 'team'),
    '{}',
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(), v_user_id, 'team@cropguard.demo', 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', 'team@cropguard.demo'),
    now(), now(), now()
  );

  INSERT INTO users (id, organisation_id, role, full_name, is_active, must_change_password)
  VALUES (v_user_id, v_org_id, 'team', 'Finance Team', true, false)
  ON CONFLICT (id) DO UPDATE SET role = 'team', full_name = 'Finance Team';
END $$;
