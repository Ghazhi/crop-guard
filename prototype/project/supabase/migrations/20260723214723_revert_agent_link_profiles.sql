/*
# Revert agent role and link new user profiles

1. Reverts the agent's app_metadata role back to 'agent'.
2. Links the newly created auth users to their existing public.users profiles
   by updating the profile ID to match the new auth user ID.
3. Sets must_change_password to false for all demo accounts.
*/

-- Revert agent role
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"agent"')
WHERE email = 'agent@asinyo.org';

-- Link admin profile
UPDATE public.users
SET id = '6220e438-15f6-41db-9db8-ca643efbe95d', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000006';

-- Link staff profile
UPDATE public.users
SET id = 'e2c9af85-ac3f-49aa-b84c-9bdd6bae7b8e', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000003';

-- Link partner profile
UPDATE public.users
SET id = 'aacfa737-4a7f-462e-89e9-8f18d1122ad1', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000005';

-- Link agronomist profile
UPDATE public.users
SET id = '559d97b8-4e27-4f04-b1e9-f85cc24d03f2', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000007';

-- Link credits profile
UPDATE public.users
SET id = '94eb0b21-16e4-4b8c-aaa5-7892d5bbbcaa', must_change_password = false
WHERE id = '10000000-0000-0000-0000-000000000008';
