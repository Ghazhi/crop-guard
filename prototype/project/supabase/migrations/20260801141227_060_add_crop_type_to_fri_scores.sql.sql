/*
# Add crop_type to farmer_fri_scores

1. Overview
Adds a crop_type column to the farmer_fri_scores table so scores are
tagged with the crop they were computed for.

2. Changes to existing tables
- `farmer_fri_scores`
  Added `crop_type` column (text, nullable). Existing rows are unaffected.

3. Important Notes
- The column is nullable so existing scores remain valid.
- The frontend scoring engine and edge function will populate this
  column going forward.
*/

ALTER TABLE farmer_fri_scores
  ADD COLUMN IF NOT EXISTS crop_type text;
