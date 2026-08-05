/*
# User Management: Custom Roles & Permissions

## Purpose
Adds a flexible role-and-permission system so super admins can create custom
roles, assign granular page-level permissions (view, create, read, update,
delete) to each role, and assign users (profiles) to those roles.

## New Tables

### 1. `custom_roles`
- `id` (uuid, PK)
- `name` (text, unique) — human-friendly role name e.g. "Field Officer"
- `description` (text) — optional description
- `is_system` (boolean, default false) — true for built-in roles that cannot be deleted
- `created_at` / `updated_at` (timestamptz)

### 2. `custom_role_permissions`
- `id` (uuid, PK)
- `role_id` (uuid FK → custom_roles.id ON DELETE CASCADE)
- `page_key` (text) — the page/route identifier e.g. "farmer-management"
- `can_view` (boolean, default false)
- `can_create` (boolean, default false)
- `can_read` (boolean, default false)
- `can_update` (boolean, default false)
- `can_delete` (boolean, default false)
- `created_at` / `updated_at` (timestamptz)
- Unique constraint on (role_id, page_key) to prevent duplicates

### 3. `profiles.custom_role_id` (new column)
- `custom_role_id` (uuid, nullable, FK → custom_roles.id ON DELETE SET NULL)
  Links a user profile to a custom role. Null means the user falls back to
  their built-in `user_role` enum for access.

## Security (RLS)
- `custom_roles`: super_admin full CRUD; authenticated can read (so the app
  can display role names in dropdowns).
- `custom_role_permissions`: super_admin full CRUD; authenticated can read.
- `profiles` already has RLS; the new `custom_role_id` column inherits the
  existing policies.

## Notes
1. Built-in roles (farmer, agent, staff, admin, partner, agronomist, credits,
   team, super_admin) are seeded as `custom_roles` rows with `is_system = true`.
   These cannot be deleted but CAN have their permissions edited.
2. The frontend reads `custom_role_permissions` to decide which nav items and
   action buttons to show for the signed-in user.
*/

-- ── custom_roles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_crud_custom_roles" ON custom_roles;
CREATE POLICY "super_admin_crud_custom_roles"
  ON custom_roles FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

DROP POLICY IF EXISTS "authenticated_read_custom_roles" ON custom_roles;
CREATE POLICY "authenticated_read_custom_roles"
  ON custom_roles FOR SELECT
  TO authenticated
  USING (true);

-- ── custom_role_permissions ──────────────────────────────
CREATE TABLE IF NOT EXISTS custom_role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  page_key    text NOT NULL,
  can_view    boolean NOT NULL DEFAULT false,
  can_create  boolean NOT NULL DEFAULT false,
  can_read    boolean NOT NULL DEFAULT false,
  can_update  boolean NOT NULL DEFAULT false,
  can_delete  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, page_key)
);

ALTER TABLE custom_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_crud_role_permissions" ON custom_role_permissions;
CREATE POLICY "super_admin_crud_role_permissions"
  ON custom_role_permissions FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ))
  WITH CHECK ( EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

DROP POLICY IF EXISTS "authenticated_read_role_permissions" ON custom_role_permissions;
CREATE POLICY "authenticated_read_role_permissions"
  ON custom_role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- ── profiles.custom_role_id ──────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'custom_role_id'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN custom_role_id uuid REFERENCES custom_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── seed built-in roles ──────────────────────────────────
INSERT INTO custom_roles (name, description, is_system)
VALUES
  ('farmer',      'Farmer portal user',                 true),
  ('agent',       'Field agent',                        true),
  ('staff',       'Program manager staff',              true),
  ('admin',       'Administrator',                       true),
  ('partner',     'Partner / MERL user',                 true),
  ('agronomist',  'Agronomist',                          true),
  ('credits',     'Credit officer',                     true),
  ('team',        'Finance & insurance team',           true),
  ('super_admin', 'Super administrator (full access)',  true)
ON CONFLICT (name) DO NOTHING;

-- ── updated_at triggers ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS custom_roles_updated_at ON custom_roles;
CREATE TRIGGER custom_roles_updated_at BEFORE UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS custom_role_permissions_updated_at ON custom_role_permissions;
CREATE TRIGGER custom_role_permissions_updated_at BEFORE UPDATE ON custom_role_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
