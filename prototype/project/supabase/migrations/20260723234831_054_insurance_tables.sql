/*
# Create insurance policies and claims tables

1. New Tables
   - `insurance_policies` — crop insurance policies for farmers
     Columns: id, organisation_id, farmer_id, policy_number, crop, coverage_amount,
     premium_amount, premium_paid, start_date, end_date, status, provider_name, notes,
     created_at, updated_at
   - `insurance_claims` — claims filed against policies
     Columns: id, policy_id, farmer_id, claim_date, incident_date, claim_amount,
     description, status, reviewed_by, reviewed_at, payout_amount, payout_date, notes,
     created_at, updated_at
2. Security
   - RLS enabled on both tables
   - Authenticated users can CRUD
3. Notes
   - Uses existing crop_type enum
   - Uses existing policy_status and claim_status enums
*/

CREATE TABLE IF NOT EXISTS insurance_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  farmer_id       uuid REFERENCES farmers(id) ON DELETE CASCADE,
  policy_number   text NOT NULL DEFAULT '',
  crop            crop_type,
  coverage_amount numeric NOT NULL DEFAULT 0,
  premium_amount  numeric NOT NULL DEFAULT 0,
  premium_paid    boolean NOT NULL DEFAULT false,
  start_date      date,
  end_date        date,
  status          policy_status NOT NULL DEFAULT 'draft',
  provider_name   text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_insurance_policies" ON insurance_policies;
CREATE POLICY "select_insurance_policies" ON insurance_policies FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_insurance_policies" ON insurance_policies;
CREATE POLICY "insert_insurance_policies" ON insurance_policies FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_insurance_policies" ON insurance_policies;
CREATE POLICY "update_insurance_policies" ON insurance_policies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_insurance_policies" ON insurance_policies;
CREATE POLICY "delete_insurance_policies" ON insurance_policies FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ins_policies_org ON insurance_policies(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ins_policies_farmer ON insurance_policies(farmer_id);
CREATE INDEX IF NOT EXISTS idx_ins_policies_status ON insurance_policies(status);


CREATE TABLE IF NOT EXISTS insurance_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       uuid NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  farmer_id       uuid REFERENCES farmers(id) ON DELETE SET NULL,
  claim_date      date NOT NULL DEFAULT CURRENT_DATE,
  incident_date   date,
  claim_amount    numeric NOT NULL DEFAULT 0,
  description     text,
  status          claim_status NOT NULL DEFAULT 'submitted',
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  payout_amount   numeric DEFAULT 0,
  payout_date     date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_insurance_claims" ON insurance_claims;
CREATE POLICY "select_insurance_claims" ON insurance_claims FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_insurance_claims" ON insurance_claims;
CREATE POLICY "insert_insurance_claims" ON insurance_claims FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_insurance_claims" ON insurance_claims;
CREATE POLICY "update_insurance_claims" ON insurance_claims FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_insurance_claims" ON insurance_claims;
CREATE POLICY "delete_insurance_claims" ON insurance_claims FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ins_claims_policy ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_ins_claims_status ON insurance_claims(status);
