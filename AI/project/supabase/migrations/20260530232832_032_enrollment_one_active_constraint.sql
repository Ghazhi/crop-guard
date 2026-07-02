/*
  # Enrollment: One Active Program/Cohort Constraint

  Business rule: A farmer can be enrolled in multiple programs and cohorts
  historically, but only ONE enrollment may be 'active' at any given time.
  When a program/cohort becomes inactive, the enrollment record is preserved
  (graduated or withdrawn status) and the farmer may be enrolled in a new one.

  Changes:
  1. Drop the old unique constraint on (farmer_id, program_id) that prevented
     re-enrollment in the same program after graduation/withdrawal.
  2. Fix existing data: graduate the older active enrollment for any farmer
     that currently has more than one active enrollment (keep the most recent).
  3. Add a partial unique index: at most ONE 'active' enrollment per farmer.
  4. Add helper function to deactivate a farmer's current active enrollment
     before creating a new one — called by staff/agents when re-enrolling.

  Security:
  - No RLS policy changes; existing policies are preserved.

  Important Notes:
  - Historical enrollment records are NEVER deleted.
  - Only the status changes from 'active' to 'graduated' for superseded records.
*/

-- 1. Drop old unique constraint that prevented re-enrollment in same program
DROP INDEX IF EXISTS idx_enrollments_unique;

-- 2. Fix existing data: for farmers with multiple active enrollments,
--    graduate all but the most recently enrolled one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT farmer_id
    FROM enrollments
    WHERE status = 'active'
    GROUP BY farmer_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recently enrolled active record, graduate the rest
    UPDATE enrollments
    SET
      status            = 'graduated',
      graduated_at      = now(),
      withdrawal_reason = 'Superseded by newer enrollment',
      updated_at        = now()
    WHERE farmer_id = r.farmer_id
      AND status    = 'active'
      AND id NOT IN (
        SELECT id
        FROM enrollments
        WHERE farmer_id = r.farmer_id
          AND status    = 'active'
        ORDER BY enrolled_at DESC
        LIMIT 1
      );
  END LOOP;
END $$;

-- 3. Partial unique index: only one 'active' enrollment allowed per farmer
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_one_active_per_farmer
  ON enrollments(farmer_id)
  WHERE status = 'active';

-- 4. Helper function: deactivate a farmer's current active enrollment
--    before enrolling them in a new program/cohort
CREATE OR REPLACE FUNCTION deactivate_farmer_active_enrollment(
  p_farmer_id uuid,
  p_reason    text DEFAULT 'Re-enrolled in new program'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE enrollments
  SET
    status            = 'graduated',
    graduated_at      = now(),
    withdrawal_reason = p_reason,
    updated_at        = now()
  WHERE farmer_id = p_farmer_id
    AND status    = 'active';
END;
$$;
