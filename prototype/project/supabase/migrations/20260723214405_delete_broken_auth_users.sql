/*
# Delete broken SQL-seeded auth users

The demo accounts were inserted directly into auth.users via SQL,
which produced users that GoTrue's auth API cannot manage (returns 500
on password update / signIn attempts). This migration deletes those
broken auth.users entries and their associated auth.identities rows
so they can be recreated cleanly via the auth admin API.

1. Deletes auth.identities rows for the broken user IDs
2. Deletes auth.users rows for the broken user IDs
3. Does NOT touch public.users profiles — those will be re-linked
   to the new auth user IDs after recreation
*/

DELETE FROM auth.identities
WHERE user_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008'
);

DELETE FROM auth.users
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008'
);
