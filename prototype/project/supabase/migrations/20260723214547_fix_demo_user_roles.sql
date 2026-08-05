/*
# Fix demo user roles in public.users

The profile rows for staff, partner, admin, agronomist, and credits
had the wrong role ('farmer') after being re-linked to new auth user IDs.
This migration sets the correct role for each profile.
*/

UPDATE public.users SET role = 'staff' WHERE id = (SELECT id FROM auth.users WHERE email = 'staff@asinyo.org');
UPDATE public.users SET role = 'partner' WHERE id = (SELECT id FROM auth.users WHERE email = 'partner@asinyo.org');
UPDATE public.users SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@asinyo.org');
UPDATE public.users SET role = 'agronomist' WHERE id = (SELECT id FROM auth.users WHERE email = 'agro@asinyo.org');
UPDATE public.users SET role = 'credits' WHERE id = (SELECT id FROM auth.users WHERE email = 'credits@asinyo.org');
