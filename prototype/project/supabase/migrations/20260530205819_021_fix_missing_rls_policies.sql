/*
  # Fix Missing RLS Policies

  1. Changes
    - Add DELETE policy for cohorts (staff/admin)
    - Add DELETE policy for enrollments (staff/admin)
    - Add INSERT policy for enrollments allowing staff to enroll with themselves as agent
    - Fix enrollment upsert to allow staff-originated enrollments

  2. Context
    Staff users were unable to delete cohorts or enrollment records because no DELETE
    policies existed on those tables. Enrollment inserts by staff also failed because the
    existing INSERT policy required agent_id = auth.uid(), which excluded staff users
    who set themselves as the agent.
*/

-- ── cohorts: allow staff/admin to delete ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cohorts' AND policyname = 'Staff and admin can delete cohorts'
  ) THEN
    CREATE POLICY "Staff and admin can delete cohorts"
      ON cohorts FOR DELETE
      TO authenticated
      USING (
        is_admin_or_staff()
        AND EXISTS (
          SELECT 1 FROM programs
          WHERE programs.id = cohorts.program_id
            AND programs.organisation_id = get_my_org_id()
        )
      );
  END IF;
END $$;

-- ── enrollments: allow staff/admin to delete ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'enrollments' AND policyname = 'Staff and admin can delete enrollments'
  ) THEN
    CREATE POLICY "Staff and admin can delete enrollments"
      ON enrollments FOR DELETE
      TO authenticated
      USING (
        is_admin_or_staff()
        AND EXISTS (
          SELECT 1 FROM programs
          WHERE programs.id = enrollments.program_id
            AND programs.organisation_id = get_my_org_id()
        )
      );
  END IF;
END $$;

-- ── enrollments: allow staff/admin to insert (agent_id = themselves) ────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'enrollments' AND policyname = 'Staff and admin can enroll farmers'
  ) THEN
    CREATE POLICY "Staff and admin can enroll farmers"
      ON enrollments FOR INSERT
      TO authenticated
      WITH CHECK (
        is_admin_or_staff()
        AND EXISTS (
          SELECT 1 FROM programs
          WHERE programs.id = program_id
            AND programs.organisation_id = get_my_org_id()
        )
      );
  END IF;
END $$;

-- ── enrollments: allow staff/admin to upsert (needed for onConflict) ────────
-- Update policy already exists but only checks is_agent_or_above().
-- Staff is covered by is_agent_or_above() which returns true for staff/admin,
-- but we need to confirm the function definition covers staff role.
-- Drop and recreate to include explicit staff check if needed.

-- Verify is_agent_or_above includes staff
DO $$
DECLARE
  fn_body text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO fn_body
  FROM pg_proc WHERE proname = 'is_agent_or_above';
  IF fn_body IS NULL OR fn_body NOT ILIKE '%staff%' THEN
    -- Recreate to include staff
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION is_agent_or_above()
      RETURNS boolean
      LANGUAGE sql
      STABLE SECURITY DEFINER
      AS $inner$
        SELECT EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
            AND role IN ('agent', 'staff', 'admin', 'partner')
        )
      $inner$
    $func$;
  END IF;
END $$;
