/*
  # Scoring & Eligibility Schema Additions

  1. Modified Tables
    - `farmer_fri_scores`
      - Add `enrollment_id` (uuid, nullable FK to enrollments) — links score to enrollment
      - Add `zone` (text) — Green / Amber / Red zone label
      - Add `credit_score` (integer, nullable) — 300–850 credit proxy
      - Add `season_average` (numeric, nullable) — rolling average for current season
      - Add `raw_responses` (jsonb) — pillar item responses snapshot
      - Add `eci_score` (numeric) — Ethical Conduct & Integrity subscale score
    
  2. New Tables
    - `eligibility_rules`
      - Rules table for program intervention eligibility
      - Each row defines one rule with field, operator, value, and metadata
      - Linked to programs via program_id

  3. Security
    - RLS enabled on eligibility_rules
    - Agents and staff can read rules for their organisation's programs
    - Only staff/admin can insert/update/delete rules
*/

-- Add new columns to farmer_fri_scores
ALTER TABLE farmer_fri_scores
  ADD COLUMN IF NOT EXISTS enrollment_id   uuid REFERENCES enrollments(id),
  ADD COLUMN IF NOT EXISTS zone            text NOT NULL DEFAULT 'Red',
  ADD COLUMN IF NOT EXISTS credit_score    integer,
  ADD COLUMN IF NOT EXISTS season_average  numeric,
  ADD COLUMN IF NOT EXISTS raw_responses   jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eci_score       numeric NOT NULL DEFAULT 0;

-- eligibility_rules table
CREATE TABLE IF NOT EXISTS eligibility_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   uuid REFERENCES programs(id),
  name         text NOT NULL DEFAULT '',
  description  text,
  field        text NOT NULL DEFAULT '',
  operator     text NOT NULL DEFAULT '>=',
  value        numeric NOT NULL DEFAULT 0,
  benefit_label text NOT NULL DEFAULT '',
  benefit_amount numeric,
  benefit_currency text NOT NULL DEFAULT 'GHS',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and staff can read eligibility rules"
  ON eligibility_rules FOR SELECT
  TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Staff can insert eligibility rules"
  ON eligibility_rules FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can update eligibility rules"
  ON eligibility_rules FOR UPDATE
  TO authenticated
  USING (is_admin_or_staff())
  WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can delete eligibility rules"
  ON eligibility_rules FOR DELETE
  TO authenticated
  USING (is_admin_or_staff());

-- Seed default eligibility rules for the existing demo program
INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT
  p.id,
  'Input Support',
  'Subsidised seeds, fertiliser and agrochemicals for enrolled farmers.',
  'total_score',
  '>=',
  40,
  'Up to 40% subsidy on certified inputs',
  null,
  'GHS'
FROM programs p LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT
  p.id,
  'Crop Insurance',
  'Weather-indexed crop insurance covering drought, floods and pest outbreaks.',
  'total_score',
  '>=',
  60,
  'Coverage up to GH₵ 5,000 per season',
  5000,
  'GHS'
FROM programs p LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT
  p.id,
  'Market Linkage',
  'Guaranteed offtake contracts with premium buyers at above-market prices.',
  'total_score',
  '>=',
  70,
  '15–25% premium over market price',
  null,
  'GHS'
FROM programs p LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT
  p.id,
  'Agri Credit',
  'Low-interest seasonal credit for farm expansion and equipment purchase.',
  'total_score',
  '>=',
  80,
  'Up to GH₵ 20,000 at 12% p.a.',
  20000,
  'GHS'
FROM programs p LIMIT 1
ON CONFLICT DO NOTHING;
