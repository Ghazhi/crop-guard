
ALTER TABLE checkin_questions
  ADD COLUMN IF NOT EXISTS crop_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS week_title text;

-- Drop the old constraint from migration 029 (allowed only general)
ALTER TABLE checkin_questions
  DROP CONSTRAINT IF EXISTS checkin_questions_crop_type_check;

ALTER TABLE checkin_questions
  ADD CONSTRAINT checkin_questions_crop_type_check
  CHECK (crop_type IN ('maize', 'soybean', 'general'));

-- Index to speed up crop + week queries
CREATE INDEX IF NOT EXISTS idx_checkin_questions_crop_week
  ON checkin_questions(organisation_id, crop_type, week_number);
