/*
# Cooperative reorder, report auto-gen config, insights saving

1. Modified Tables
- `cooperatives`: add `sort_order` (integer, default 0) so users can reorder cooperative cards.
- `norvi_community_outputs`: add `output_type` (text, nullable) to distinguish 'insight' from 'report'.
  Add `custom_prompt` (text, nullable) to store the user's custom prompt when generating insights/reports.
  Add `auto_generated` (boolean, default false) to mark reports created by scheduled auto-generation.

2. New Tables
- `cooperative_report_configs`: per-cooperative + per-report-type configuration for auto-generation.
  - `id` (uuid PK)
  - `cooperative_id` (uuid FK -> cooperatives, cascade delete)
  - `organisation_id` (uuid, not null)
  - `report_type` (text, not null)
  - `auto_generate` (boolean, default false)
  - `frequency` (text, nullable) — 'daily', 'weekly', 'monthly', 'quarterly'
  - `day_of_month` (integer, nullable)
  - `day_of_week` (integer, nullable)
  - `custom_prompt` (text, nullable)
  - `last_generated_at` (timestamptz, nullable)
  - `created_at`, `updated_at` (timestamptz)
  - Unique constraint on (cooperative_id, report_type)

3. Security
- Enable RLS on `cooperative_report_configs`.
- Authenticated users can CRUD configs scoped to their organisation (via `users` table join).
*/

-- Add sort_order to cooperatives
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooperatives' AND column_name = 'sort_order') THEN
    ALTER TABLE cooperatives ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add output_type, custom_prompt, auto_generated to norvi_community_outputs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norvi_community_outputs' AND column_name = 'output_type') THEN
    ALTER TABLE norvi_community_outputs ADD COLUMN output_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norvi_community_outputs' AND column_name = 'custom_prompt') THEN
    ALTER TABLE norvi_community_outputs ADD COLUMN custom_prompt text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'norvi_community_outputs' AND column_name = 'auto_generated') THEN
    ALTER TABLE norvi_community_outputs ADD COLUMN auto_generated boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create cooperative_report_configs table
CREATE TABLE IF NOT EXISTS cooperative_report_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  report_type text NOT NULL,
  auto_generate boolean NOT NULL DEFAULT false,
  frequency text,
  day_of_month integer,
  day_of_week integer,
  custom_prompt text,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cooperative_id, report_type)
);

ALTER TABLE cooperative_report_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_report_configs" ON cooperative_report_configs;
CREATE POLICY "select_report_configs" ON cooperative_report_configs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organisation_id = cooperative_report_configs.organisation_id)
  );

DROP POLICY IF EXISTS "insert_report_configs" ON cooperative_report_configs;
CREATE POLICY "insert_report_configs" ON cooperative_report_configs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organisation_id = cooperative_report_configs.organisation_id)
  );

DROP POLICY IF EXISTS "update_report_configs" ON cooperative_report_configs;
CREATE POLICY "update_report_configs" ON cooperative_report_configs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organisation_id = cooperative_report_configs.organisation_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organisation_id = cooperative_report_configs.organisation_id)
  );

DROP POLICY IF EXISTS "delete_report_configs" ON cooperative_report_configs;
CREATE POLICY "delete_report_configs" ON cooperative_report_configs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.organisation_id = cooperative_report_configs.organisation_id)
  );
