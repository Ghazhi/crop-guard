/*
  # Add verification columns to farmer_checkins

  1. Modified Tables
    - `farmer_checkins`
      - `verified_at` (timestamptz, nullable) — when agent completed verification
      - `verified_by` (uuid, nullable) — agent user_id who verified

  2. Notes
    - Both columns are nullable (checkins start unverified)
    - No RLS changes needed — existing policies cover these new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmer_checkins' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE farmer_checkins ADD COLUMN verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmer_checkins' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE farmer_checkins ADD COLUMN verified_by uuid REFERENCES auth.users(id);
  END IF;
END $$;
