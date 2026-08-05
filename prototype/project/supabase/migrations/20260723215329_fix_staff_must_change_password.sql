/*
# Fix staff must_change_password flag

The admin-reset-password edge function set must_change_password=true
for the staff demo account. This resets it to false so the user isn't
forced to change their password on login.
*/

UPDATE public.users
SET must_change_password = false
WHERE id = 'e2c9af85-ac3f-49aa-b84c-9bdd6bae7b8e';
