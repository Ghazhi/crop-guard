-- Add farmer_id column to cooperative_officers table
-- This links an officer to a specific farmer record in the cooperative
ALTER TABLE cooperative_officers
  ADD COLUMN IF NOT EXISTS farmer_id uuid REFERENCES farmers(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cooperative_officers_farmer_id
  ON cooperative_officers(farmer_id);

-- Make full_name nullable since it will be derived from the farmer record
ALTER TABLE cooperative_officers
  ALTER COLUMN full_name DROP NOT NULL;
