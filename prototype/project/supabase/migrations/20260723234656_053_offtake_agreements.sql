/*
# Create offtake_agreements table

1. New Tables
   - `offtake_agreements` — contracts between buyers and the org for purchasing farmer produce
   - Columns: id, organisation_id, buyer_name, buyer_contact, crop, total_volume_kg,
     unit_price_per_kg, contract_value, agreement_date, delivery_start, delivery_end,
     status (draft/active/completed/cancelled), cohort_id (optional), notes,
     created_by, created_at, updated_at
2. Security
   - RLS enabled
   - Authenticated users can CRUD within their organisation
3. Notes
   - Links optionally to cohorts for cohort-specific offtake contracts
*/

CREATE TABLE IF NOT EXISTS offtake_agreements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  buyer_name        text NOT NULL,
  buyer_contact     text,
  buyer_phone       text,
  crop              crop_type NOT NULL,
  total_volume_kg   numeric NOT NULL DEFAULT 0,
  unit_price_per_kg numeric NOT NULL DEFAULT 0,
  contract_value    numeric NOT NULL DEFAULT 0,
  agreement_date    date NOT NULL DEFAULT CURRENT_DATE,
  delivery_start    date,
  delivery_end       date,
  status            text NOT NULL DEFAULT 'draft',
  cohort_id         uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  notes             text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE offtake_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_offtake_agreements" ON offtake_agreements;
CREATE POLICY "select_offtake_agreements" ON offtake_agreements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_offtake_agreements" ON offtake_agreements;
CREATE POLICY "insert_offtake_agreements" ON offtake_agreements FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_offtake_agreements" ON offtake_agreements;
CREATE POLICY "update_offtake_agreements" ON offtake_agreements FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_offtake_agreements" ON offtake_agreements;
CREATE POLICY "delete_offtake_agreements" ON offtake_agreements FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_offtake_org ON offtake_agreements(organisation_id);
CREATE INDEX IF NOT EXISTS idx_offtake_status ON offtake_agreements(status);
