-- Fix missing role and organisation_id in auth user metadata for staff/admin/partner/agronomist/credits/team users.
-- The RLS helper functions (get_my_role, get_my_org_id, is_admin_or_staff, is_agent_or_above)
-- read from auth.jwt() -> 'user_metadata', so these fields must be present in raw_user_meta_data.

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'admin',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = '6220e438-15f6-41db-9db8-ca643efbe95d';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'staff',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = 'e2c9af85-ac3f-49aa-b84c-9bdd6bae7b8e';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'partner',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = 'aacfa737-4a7f-462e-89e9-8f18d1122ad1';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'agronomist',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = '559d97b8-4e27-4f04-b1e9-f85cc24d03f2';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'credits',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = '94eb0b21-16e4-4b8c-aaa5-7892d5bbbcaa';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'role', 'team',
  'organisation_id', '00000000-0000-0000-0000-000000000001'
)
WHERE id = '00000000-0000-0000-0000-000000000099';
