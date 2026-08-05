/*
# Add custom_prompt column to norvi_outputs

1. Changes
- Add `custom_prompt` (text, nullable) to `norvi_outputs`.
  When present, this stores the user-supplied prompt that was sent to the AI
  instead of one of the built-in prompt templates. This lets staff write
  their own analysis instructions and have the generated report persisted
  alongside the prompt that produced it.

2. Security
- No RLS policy changes. The table already has RLS enabled with existing
  policies. The new column inherits the same row-level access rules.
*/

ALTER TABLE norvi_outputs
  ADD COLUMN IF NOT EXISTS custom_prompt text;
