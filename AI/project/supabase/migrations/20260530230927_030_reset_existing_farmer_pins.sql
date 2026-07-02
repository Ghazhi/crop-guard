/*
  # Reset existing farmer auth account PINs to 654321

  ## Summary
  Updates the password for all existing farmer auth accounts (identified by
  role = 'farmer' in user_metadata) to the PIN 654321.

  ## Changes
  - Updates `encrypted_password` in `auth.users` for all farmer accounts
  - Uses pgcrypto `crypt()` with bcrypt to hash the new PIN
  - Does not affect agent, staff, or partner accounts
*/

UPDATE auth.users
SET
  encrypted_password = crypt('654321', gen_salt('bf')),
  updated_at         = now()
WHERE raw_user_meta_data->>'role' = 'farmer';
