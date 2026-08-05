/*
# Add generated_by to norvi_community_outputs

1. Modified Tables
- `norvi_community_outputs`: add `generated_by` (text, nullable) to store the name of the user who generated the report/insight.
  This supports the report naming convention: reportType_cooperativeName_datetime_generatedBy

2. Security
- No RLS changes needed (existing policies still apply).
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norvi_community_outputs' AND column_name = 'generated_by') THEN
    ALTER TABLE norvi_community_outputs ADD COLUMN generated_by text;
  END IF;
END $$;
