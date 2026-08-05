/*
# Add custom_role_id to users table

## Purpose
The User Management page assigns custom roles to users, but it was writing to
`profiles.custom_role_id` while the application reads user data from the `users`
table. The `users` table has no `custom_role_id` column, so role assignments
silently failed.

## Changes
1. Add `custom_role_id` column to `users` table (nullable, FK to custom_roles).
2. The existing `users` RLS policies already cover the new column (column-level
   privileges inherit from table policies).
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE users
      ADD COLUMN custom_role_id uuid REFERENCES custom_roles(id) ON DELETE SET NULL;
  END IF;
END $$;
