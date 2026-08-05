/*
# Departments module

Adds department management for organisations.

1. New Tables
   - `departments`: Organisation departments with name, description, head user, and active flag
   - `user_departments`: Many-to-many junction linking users to departments

2. Security
   - RLS enabled on both tables
   - Admin can manage; staff/team can read own org's departments
   - Users can read their own department assignments
*/

CREATE TABLE IF NOT EXISTS departments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  head_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organisation_id);

CREATE TABLE IF NOT EXISTS user_departments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(department_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_departments_updated_at();

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_departments" ON departments;
CREATE POLICY "org_select_departments" ON departments FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "admin_insert_departments" ON departments;
CREATE POLICY "admin_insert_departments" ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id
  );

DROP POLICY IF EXISTS "admin_update_departments" ON departments;
CREATE POLICY "admin_update_departments" ON departments FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "admin_delete_departments" ON departments;
CREATE POLICY "admin_delete_departments" ON departments FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_select_user_departments" ON user_departments;
CREATE POLICY "org_select_user_departments" ON user_departments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = user_departments.department_id
    AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = d.organisation_id
  ));

DROP POLICY IF EXISTS "admin_insert_user_departments" ON user_departments;
CREATE POLICY "admin_insert_user_departments" ON user_departments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = user_departments.department_id
      AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = d.organisation_id
    )
  );

DROP POLICY IF EXISTS "admin_delete_user_departments" ON user_departments;
CREATE POLICY "admin_delete_user_departments" ON user_departments FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = user_departments.department_id
      AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = d.organisation_id
    )
  );
