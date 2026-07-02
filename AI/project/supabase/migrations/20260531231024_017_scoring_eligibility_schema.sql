/*
  # Scoring & Eligibility Schema
*/

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id     uuid REFERENCES programs(id),
  name           text NOT NULL DEFAULT '',
  description    text,
  field          text NOT NULL DEFAULT '',
  operator       text NOT NULL DEFAULT '>=',
  value          numeric NOT NULL DEFAULT 0,
  benefit_label  text NOT NULL DEFAULT '',
  benefit_amount numeric,
  benefit_currency text NOT NULL DEFAULT 'GHS',
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and staff can read eligibility rules"
  ON eligibility_rules FOR SELECT TO authenticated
  USING (program_id IN (SELECT p.id FROM programs p WHERE p.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can insert eligibility rules"
  ON eligibility_rules FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can update eligibility rules"
  ON eligibility_rules FOR UPDATE TO authenticated
  USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can delete eligibility rules"
  ON eligibility_rules FOR DELETE TO authenticated
  USING (is_admin_or_staff());

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_currency)
SELECT p.id, 'Input Support', 'Subsidised seeds, fertiliser and agrochemicals.', 'total_score', '>=', 40, 'Up to 40% subsidy on certified inputs', 'GHS' FROM programs p WHERE p.id = '00000000-0000-0000-0000-000000000010' ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT p.id, 'Crop Insurance', 'Weather-indexed crop insurance.', 'total_score', '>=', 60, 'Coverage up to GH₵ 5,000 per season', 5000, 'GHS' FROM programs p WHERE p.id = '00000000-0000-0000-0000-000000000010' ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_currency)
SELECT p.id, 'Market Linkage', 'Guaranteed offtake contracts with premium buyers.', 'total_score', '>=', 70, '15–25% premium over market price', 'GHS' FROM programs p WHERE p.id = '00000000-0000-0000-0000-000000000010' ON CONFLICT DO NOTHING;

INSERT INTO eligibility_rules (program_id, name, description, field, operator, value, benefit_label, benefit_amount, benefit_currency)
SELECT p.id, 'Agri Credit', 'Low-interest seasonal credit.', 'total_score', '>=', 80, 'Up to GH₵ 20,000 at 12% p.a.', 20000, 'GHS' FROM programs p WHERE p.id = '00000000-0000-0000-0000-000000000010' ON CONFLICT DO NOTHING;
