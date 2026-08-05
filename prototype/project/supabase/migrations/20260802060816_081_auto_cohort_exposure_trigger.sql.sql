/*
# Auto-create cohort_exposure_inputs when a new cohort is inserted

1. New Functions
- `create_cohort_exposure_input()` — a trigger function that fires AFTER INSERT on `cohorts`.
  It inserts a new row into `cohort_exposure_inputs` with default values (Moderate hazard,
  zeroed rainfall/alert counts, no critical stage, no forecast stress) and copies the
  `organisation_id` from the cohort's parent program.

2. New Triggers
- `cohorts_after_insert_exposure` — AFTER INSERT ON cohorts FOR EACH ROW, calls the function above.

3. Notes
- The trigger is idempotent: if a row already exists for the cohort (e.g. from a seed
  migration), the INSERT ... ON CONFLICT DO NOTHING prevents duplicates.
- The organisation_id is resolved by joining cohorts → programs to get the program's
  organisation_id. This keeps RLS scoping consistent.
*/

CREATE OR REPLACE FUNCTION create_cohort_exposure_input()
RETURNS trigger AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Resolve organisation_id from the cohort's parent program
  SELECT p.organisation_id INTO v_org_id
  FROM programs p
  WHERE p.id = NEW.program_id;

  -- Insert a default exposure row (ON CONFLICT prevents duplicates)
  INSERT INTO cohort_exposure_inputs (
    cohort_id, organisation_id, hazard_classification,
    actual_rainfall, historical_avg_rainfall,
    critical_alert_count, high_alert_count, medium_alert_count,
    in_critical_growth_stage, forecast_stress_flag
  ) VALUES (
    NEW.id, v_org_id, 'Moderate',
    0, 0,
    0, 0, 0,
    false, false
  )
  ON CONFLICT (cohort_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS cohorts_after_insert_exposure ON cohorts;
CREATE TRIGGER cohorts_after_insert_exposure
  AFTER INSERT ON cohorts
  FOR EACH ROW EXECUTE FUNCTION create_cohort_exposure_input();
