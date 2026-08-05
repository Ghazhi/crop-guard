/*
# Temporarily elevate agent to admin for user creation

Temporarily sets the agent user's app_metadata role to 'admin'
so we can use their JWT to call the create-staff-user edge function.
Will be reverted after all users are created.
*/

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
WHERE email = 'agent@asinyo.org';
