/*
  # Weekly Check-in Draft Support

  Enables farmers to save in-progress check-ins as drafts that persist
  across page navigations, and prevents duplicate submissions per week.

  1. Changes to farmer_checkins
     - The status column already exists; we support 'draft' | 'submitted' | 'verified'
     - Add a unique constraint on (farmer_id, week_number) so there is at most
       one check-in record per farmer per week (draft OR submitted, not both)
     - Add UPDATE policy so farmers can update their own draft check-in

  2. Changes to farmer_checkin_responses
     - Add UPDATE policy so farmers can update responses on a draft check-in

  Notes:
  - The unique constraint replaces the app-level duplicate check.
  - Upsert logic (insert or update) is handled entirely in the frontend via
    the checkin id stored in state.
*/

-- Unique constraint: one check-in row per farmer per week
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'farmer_checkins_farmer_week_unique'
  ) THEN
    ALTER TABLE farmer_checkins
      ADD CONSTRAINT farmer_checkins_farmer_week_unique
      UNIQUE (farmer_id, week_number);
  END IF;
END $$;

-- Farmers can update their own draft check-in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'farmer_checkins' AND policyname = 'Farmers update own draft checkin'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Farmers update own draft checkin"
        ON farmer_checkins FOR UPDATE
        TO authenticated
        USING (farmer_id = get_my_farmer_id() AND status = 'draft')
        WITH CHECK (farmer_id = get_my_farmer_id());
    $pol$;
  END IF;
END $$;

-- Farmers can update responses on their draft check-in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'farmer_checkin_responses' AND policyname = 'Farmers update own draft responses'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Farmers update own draft responses"
        ON farmer_checkin_responses FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM farmer_checkins fc
            WHERE fc.id = farmer_checkin_responses.checkin_id
              AND fc.farmer_id = get_my_farmer_id()
              AND fc.status = 'draft'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM farmer_checkins fc
            WHERE fc.id = farmer_checkin_responses.checkin_id
              AND fc.farmer_id = get_my_farmer_id()
          )
        );
    $pol$;
  END IF;
END $$;
