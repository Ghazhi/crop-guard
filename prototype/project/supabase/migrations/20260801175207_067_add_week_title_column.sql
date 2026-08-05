
-- Add week_title column to checkin_template_items
ALTER TABLE checkin_template_items ADD COLUMN IF NOT EXISTS week_title text;
