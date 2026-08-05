/*
# Create cohort_exposure_inputs table for Climate Exposure scoring

1. New Tables
- `cohort_exposure_inputs`
  - `id` (uuid, primary key)
  - `cohort_id` (uuid, FK to cohorts.id, unique — one row per cohort)
  - `organisation_id` (uuid, FK to organisations.id, for RLS scoping)
  - `hazard_classification` (enum: Severe/High/Moderate/Low) — E1 input
  - `actual_rainfall` (numeric, mm) — E2 input
  - `historical_avg_rainfall` (numeric, mm) — E2 input
  - `critical_alert_count` (integer) — E3 input
  - `high_alert_count` (integer) — E3 input
  - `medium_alert_count` (integer) — E3 input
  - `in_critical_growth_stage` (boolean) — E4 input
  - `forecast_stress_flag` (boolean) — E4 input
  - `updated_by` (uuid, nullable — user who last updated)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `cohort_exposure_inputs`.
- Authenticated users can read and manage exposure inputs for their organisation.

3. Seed Data
- Inserts exposure input rows for the 2 existing cohorts with varied hazard profiles.

4. Notes
- The exposure score itself is NOT stored — it is computed at read time by the
  pure function `computeExposureScore()` in `src/lib/exposure.ts`.
- This table stores only the raw E1–E4 inputs, independent of FRI data.
*/

DO $$ BEGIN
  CREATE TYPE hazard_classification_type AS ENUM ('Severe', 'High', 'Moderate', 'Low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cohort_exposure_inputs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id                 uuid NOT NULL UNIQUE REFERENCES cohorts(id) ON DELETE CASCADE,
  organisation_id           uuid REFERENCES organisations(id) ON DELETE SET NULL,
  hazard_classification     hazard_classification_type NOT NULL DEFAULT 'Moderate',
  actual_rainfall           numeric NOT NULL DEFAULT 0,
  historical_avg_rainfall   numeric NOT NULL DEFAULT 0,
  critical_alert_count      integer NOT NULL DEFAULT 0,
  high_alert_count          integer NOT NULL DEFAULT 0,
  medium_alert_count        integer NOT NULL DEFAULT 0,
  in_critical_growth_stage  boolean NOT NULL DEFAULT false,
  forecast_stress_flag      boolean NOT NULL DEFAULT false,
  updated_by                uuid,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cohort_exposure_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cohort_exposure_inputs" ON cohort_exposure_inputs;
CREATE POLICY "select_cohort_exposure_inputs"
  ON cohort_exposure_inputs FOR SELECT
  TO authenticated
  USING (organisation_id IS NULL OR organisation_id IN (
    SELECT o.id FROM organisations o
    JOIN users u ON u.organisation_id = o.id
    WHERE u.id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_cohort_exposure_inputs" ON cohort_exposure_inputs;
CREATE POLICY "insert_cohort_exposure_inputs"
  ON cohort_exposure_inputs FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id IS NULL OR organisation_id IN (
    SELECT o.id FROM organisations o
    JOIN users u ON u.organisation_id = o.id
    WHERE u.id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_cohort_exposure_inputs" ON cohort_exposure_inputs;
CREATE POLICY "update_cohort_exposure_inputs"
  ON cohort_exposure_inputs FOR UPDATE
  TO authenticated
  USING (organisation_id IS NULL OR organisation_id IN (
    SELECT o.id FROM organisations o
    JOIN users u ON u.organisation_id = o.id
    WHERE u.id = auth.uid()
  ))
  WITH CHECK (organisation_id IS NULL OR organisation_id IN (
    SELECT o.id FROM organisations o
    JOIN users u ON u.organisation_id = o.id
    WHERE u.id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_cohort_exposure_inputs" ON cohort_exposure_inputs;
CREATE POLICY "delete_cohort_exposure_inputs"
  ON cohort_exposure_inputs FOR DELETE
  TO authenticated
  USING (organisation_id IS NULL OR organisation_id IN (
    SELECT o.id FROM organisations o
    JOIN users u ON u.organisation_id = o.id
    WHERE u.id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cohort_exposure_inputs_updated_at ON cohort_exposure_inputs;
CREATE TRIGGER cohort_exposure_inputs_updated_at
  BEFORE UPDATE ON cohort_exposure_inputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data for existing cohorts (organisation_id from programs table)
INSERT INTO cohort_exposure_inputs (cohort_id, organisation_id, hazard_classification, actual_rainfall, historical_avg_rainfall, critical_alert_count, high_alert_count, medium_alert_count, in_critical_growth_stage, forecast_stress_flag)
SELECT '77e6736f-f5a9-4417-a88e-dfec733eadbc', p.organisation_id, 'Severe', 420, 950, 4, 6, 8, true, true
FROM cohorts c JOIN programs p ON p.id = c.program_id
WHERE c.id = '77e6736f-f5a9-4417-a88e-dfec733eadbc'
ON CONFLICT (cohort_id) DO NOTHING;

INSERT INTO cohort_exposure_inputs (cohort_id, organisation_id, hazard_classification, actual_rainfall, historical_avg_rainfall, critical_alert_count, high_alert_count, medium_alert_count, in_critical_growth_stage, forecast_stress_flag)
SELECT '479d7f2b-6d2d-48ac-b028-2242a156ae21', p.organisation_id, 'Moderate', 1180, 1250, 1, 2, 3, true, false
FROM cohorts c JOIN programs p ON p.id = c.program_id
WHERE c.id = '479d7f2b-6d2d-48ac-b028-2242a156ae21'
ON CONFLICT (cohort_id) DO NOTHING;
