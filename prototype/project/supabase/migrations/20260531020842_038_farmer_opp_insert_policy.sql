-- Farmer opportunity application support
-- Adds INSERT policy so farmers can submit their own applications via enrollments_opp

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'enrollments_opp'
      AND policyname = 'Farmers can submit applications for their own enrollments'
  ) THEN
    CREATE POLICY "Farmers can submit applications for their own enrollments"
      ON enrollments_opp FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM farmers
          WHERE farmers.id = enrollments_opp.farmer_id
            AND farmers.user_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.id = enrollments_opp.enrollment_id
            AND enrollments.farmer_id = enrollments_opp.farmer_id
            AND enrollments.status = 'active'
        )
        AND enrollments_opp.status = 'submitted'
      );
  END IF;
END $$;
