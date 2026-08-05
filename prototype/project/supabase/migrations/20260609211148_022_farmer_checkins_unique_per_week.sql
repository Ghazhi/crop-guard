-- Ensure at most one check-in per farmer per week
-- Use ON CONFLICT DO NOTHING at insert time; this constraint enforces it at DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'farmer_checkins_farmer_id_week_number_key'
  ) THEN
    ALTER TABLE farmer_checkins
      ADD CONSTRAINT farmer_checkins_farmer_id_week_number_key
      UNIQUE (farmer_id, week_number);
  END IF;
END $$;

-- Add a verified_week column so farmers can see verification status without joining
-- farmer_fri_scores; this is a denorm convenience flag updated by agent submission.
ALTER TABLE farmer_checkins
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Backfill existing verified checkins
UPDATE farmer_checkins SET is_verified = true WHERE status = 'verified';
