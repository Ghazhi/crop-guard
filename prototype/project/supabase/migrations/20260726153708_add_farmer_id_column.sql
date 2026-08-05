-- Add farmer_id: 10-digit number (YY CC NNNNNN)
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farmer_id VARCHAR(10) UNIQUE;

-- Backfill existing farmers with sequential IDs (year 26, cohort 01)
DO $$
DECLARE
  r RECORD;
  seq INTEGER := 1;
  new_id TEXT;
BEGIN
  FOR r IN SELECT id FROM farmers WHERE farmer_id IS NULL ORDER BY created_at ASC LOOP
    new_id := '26' || '01' || lpad(seq::text, 6, '0');
    UPDATE farmers SET farmer_id = new_id WHERE id = r.id;
    seq := seq + 1;
  END LOOP;
END $$;

-- Add region_code to the registration form data (column already exists on farmers table)
-- Ensure region_code can be null temporarily for form flow
ALTER TABLE farmers ALTER COLUMN region_code DROP NOT NULL;
