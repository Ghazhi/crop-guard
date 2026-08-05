/*
# Add template_id to baseline_assessments

1. Modified Tables
- `baseline_assessments`: add `template_id` column (uuid, nullable, FK to `baseline_templates.id`)
  - Links each assessment to the baseline template that was configured by staff for the farmer's cohort
  - Enables the farmer/agent portals to load the same items the staff configured

2. Security
- No RLS policy changes needed — existing policies on baseline_assessments already cover the new column
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'baseline_assessments' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE baseline_assessments
      ADD COLUMN template_id uuid REFERENCES baseline_templates(id) ON DELETE SET NULL;
  END IF;
END $$;
