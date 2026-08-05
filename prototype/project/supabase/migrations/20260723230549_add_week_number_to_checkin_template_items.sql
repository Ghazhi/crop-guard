/*
# Add week_number to checkin_template_items

## Purpose
Weekly check-in templates now cover ALL weeks of the season in a single template,
rather than one template per week. Each item is tagged with the week it belongs to.

## Changes
1. `checkin_template_items` — add `week_number integer NOT NULL DEFAULT 1`
   so every item knows which week it belongs to within the multi-week template.
2. `checkin_templates.week_number` — kept for backward compatibility but no longer
   used by the UI; new templates set it to NULL (covers all weeks).

## Notes
- The DEFAULT 1 ensures existing items (if any) land in week 1.
- No data is lost; the column is additive.
*/

ALTER TABLE checkin_template_items
  ADD COLUMN IF NOT EXISTS week_number integer NOT NULL DEFAULT 1;

-- Index for efficient filtering by week within a template
CREATE INDEX IF NOT EXISTS idx_checkin_template_items_week
  ON checkin_template_items (checkin_template_id, week_number);
