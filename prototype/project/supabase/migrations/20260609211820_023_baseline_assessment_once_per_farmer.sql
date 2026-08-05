-- Enforce one baseline assessment per farmer (most recent is authoritative)
-- Add a unique constraint so only one baseline can be active per farmer
ALTER TABLE baseline_assessments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create unique partial index: only one active baseline per farmer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'baseline_assessments_farmer_id_active_unique'
  ) THEN
    CREATE UNIQUE INDEX baseline_assessments_farmer_id_active_unique
      ON baseline_assessments (farmer_id)
      WHERE is_active = true;
  END IF;
END $$;

-- When a new baseline is inserted, deactivate any prior ones via trigger
CREATE OR REPLACE FUNCTION deactivate_prior_baselines()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE baseline_assessments
     SET is_active = false
   WHERE farmer_id = NEW.farmer_id
     AND id <> NEW.id
     AND is_active = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_prior_baselines ON baseline_assessments;
CREATE TRIGGER trg_deactivate_prior_baselines
  AFTER INSERT ON baseline_assessments
  FOR EACH ROW EXECUTE FUNCTION deactivate_prior_baselines();
