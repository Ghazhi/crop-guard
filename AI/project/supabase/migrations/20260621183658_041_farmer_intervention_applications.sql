
CREATE TABLE IF NOT EXISTS farmer_intervention_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  intervention_id uuid NOT NULL REFERENCES interventions_catalog(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'applied'
                   CHECK (status IN ('applied','active','closed','suspended')),
  notes          text,
  created_by     uuid REFERENCES auth.users(id),
  applied_at     timestamptz NOT NULL DEFAULT now(),
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, intervention_id)
);

ALTER TABLE farmer_intervention_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_fia" ON farmer_intervention_applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_fia" ON farmer_intervention_applications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update_fia" ON farmer_intervention_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_fia" ON farmer_intervention_applications
  FOR DELETE TO authenticated USING (true);
