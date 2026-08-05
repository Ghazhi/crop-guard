-- Add financial tracking columns to farmer_intervention_applications
ALTER TABLE farmer_intervention_applications
  ADD COLUMN IF NOT EXISTS disbursed_amount    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repayment_total     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_rate       numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursement_date  timestamptz,
  ADD COLUMN IF NOT EXISTS repayment_due_date  timestamptz,
  ADD COLUMN IF NOT EXISTS repayment_frequency text DEFAULT 'lump_sum',
  ADD COLUMN IF NOT EXISTS approved_by         uuid,
  ADD COLUMN IF NOT EXISTS disbursed_by         uuid,
  ADD COLUMN IF NOT EXISTS disbursed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS loan_duration_weeks integer DEFAULT 0;

-- Repayment schedule table
CREATE TABLE IF NOT EXISTS repayment_schedule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES farmer_intervention_applications(id) ON DELETE CASCADE,
  installment_no  integer NOT NULL,
  due_date        timestamptz NOT NULL,
  amount_due      numeric NOT NULL DEFAULT 0,
  amount_paid     numeric NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  paid_at         timestamptz,
  paid_by         uuid,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, installment_no)
);

ALTER TABLE repayment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_repayment_schedule" ON repayment_schedule FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_repayment_schedule" ON repayment_schedule FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_repayment_schedule" ON repayment_schedule FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_repayment_schedule" ON repayment_schedule FOR DELETE
  TO authenticated USING (true);
