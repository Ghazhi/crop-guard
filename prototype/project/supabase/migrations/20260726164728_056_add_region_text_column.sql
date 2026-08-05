-- Add plain-text `region` column to tables that currently store the region_code enum.
-- The old region_code column is kept to avoid data loss; new code writes/reads `region`.

-- Mapping from region_code enum → full region name
DO $$
BEGIN
  -- ── farmers ────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='farmers' AND column_name='region') THEN
    ALTER TABLE farmers ADD COLUMN region text;
  END IF;
  UPDATE farmers SET region = CASE region_code
    WHEN 'AA' THEN 'Ahafo'        WHEN 'AH' THEN 'Ashanti'
    WHEN 'BA' THEN 'Bono'         WHEN 'BE' THEN 'Bono East'
    WHEN 'CE' THEN 'Central'      WHEN 'EP' THEN 'Eastern'
    WHEN 'NE' THEN 'North East'   WHEN 'NR' THEN 'Northern'
    WHEN 'OT' THEN 'Oti'          WHEN 'SA' THEN 'Savannah'
    WHEN 'UE' THEN 'Upper East'   WHEN 'UW' THEN 'Upper West'
    WHEN 'VR' THEN 'Volta'        WHEN 'WN' THEN 'Western North'
    WHEN 'WR' THEN 'Western'      WHEN 'SW' THEN 'South Western'
    ELSE NULL
  END WHERE region IS NULL AND region_code IS NOT NULL;

  -- ── farm_details ────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='farm_details' AND column_name='region') THEN
    ALTER TABLE farm_details ADD COLUMN region text;
  END IF;
  UPDATE farm_details SET region = CASE region_code
    WHEN 'AA' THEN 'Ahafo'        WHEN 'AH' THEN 'Ashanti'
    WHEN 'BA' THEN 'Bono'         WHEN 'BE' THEN 'Bono East'
    WHEN 'CE' THEN 'Central'      WHEN 'EP' THEN 'Eastern'
    WHEN 'NE' THEN 'North East'   WHEN 'NR' THEN 'Northern'
    WHEN 'OT' THEN 'Oti'          WHEN 'SA' THEN 'Savannah'
    WHEN 'UE' THEN 'Upper East'   WHEN 'UW' THEN 'Upper West'
    WHEN 'VR' THEN 'Volta'        WHEN 'WN' THEN 'Western North'
    WHEN 'WR' THEN 'Western'      WHEN 'SW' THEN 'South Western'
    ELSE NULL
  END WHERE region IS NULL AND region_code IS NOT NULL;

  -- ── cohorts ─────────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cohorts' AND column_name='region') THEN
    ALTER TABLE cohorts ADD COLUMN region text;
  END IF;
  UPDATE cohorts SET region = CASE region_code
    WHEN 'AA' THEN 'Ahafo'        WHEN 'AH' THEN 'Ashanti'
    WHEN 'BA' THEN 'Bono'         WHEN 'BE' THEN 'Bono East'
    WHEN 'CE' THEN 'Central'      WHEN 'EP' THEN 'Eastern'
    WHEN 'NE' THEN 'North East'   WHEN 'NR' THEN 'Northern'
    WHEN 'OT' THEN 'Oti'          WHEN 'SA' THEN 'Savannah'
    WHEN 'UE' THEN 'Upper East'   WHEN 'UW' THEN 'Upper West'
    WHEN 'VR' THEN 'Volta'        WHEN 'WN' THEN 'Western North'
    WHEN 'WR' THEN 'Western'      WHEN 'SW' THEN 'South Western'
    ELSE NULL
  END WHERE region IS NULL AND region_code IS NOT NULL;

  -- ── communities (community_profiling) ───────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='communities') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='communities' AND column_name='region') THEN
      ALTER TABLE communities ADD COLUMN region text;
    END IF;
    UPDATE communities SET region = CASE region_code
      WHEN 'AA' THEN 'Ahafo'        WHEN 'AH' THEN 'Ashanti'
      WHEN 'BA' THEN 'Bono'         WHEN 'BE' THEN 'Bono East'
      WHEN 'CE' THEN 'Central'      WHEN 'EP' THEN 'Eastern'
      WHEN 'NE' THEN 'North East'   WHEN 'NR' THEN 'Northern'
      WHEN 'OT' THEN 'Oti'          WHEN 'SA' THEN 'Savannah'
      WHEN 'UE' THEN 'Upper East'   WHEN 'UW' THEN 'Upper West'
      WHEN 'VR' THEN 'Volta'        WHEN 'WN' THEN 'Western North'
      WHEN 'WR' THEN 'Western'      WHEN 'SW' THEN 'South Western'
      ELSE NULL
    END WHERE region IS NULL AND region_code IS NOT NULL;
  END IF;
END $$;
