/*
# Delete broken SQL-inserted auth users (round 2)

The following users were inserted via SQL into auth.users and cannot
be authenticated by GoTrue (returns 500 "Database error querying schema").
They need to be deleted and recreated via the auth admin API.

This deletes: staff, partner, admin, agronomist, credits
Their public.users profiles will be re-linked after recreation.
*/

-- Delete identities first
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('staff@asinyo.org','partner@asinyo.org','admin@asinyo.org','agro@asinyo.org','credits@asinyo.org')
);

-- Delete the auth users
DELETE FROM auth.users
WHERE email IN ('staff@asinyo.org','partner@asinyo.org','admin@asinyo.org','agro@asinyo.org','credits@asinyo.org');
