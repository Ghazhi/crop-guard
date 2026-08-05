ALTER TABLE training_bundles
  ADD COLUMN IF NOT EXISTS total_weeks integer;

-- Back-fill from CROP_META defaults
UPDATE training_bundles SET total_weeks = CASE crop_type
  WHEN 'maize'   THEN 12
  WHEN 'soybean' THEN 11
  WHEN 'cocoa'   THEN 16
  ELSE 12
END
WHERE total_weeks IS NULL;
