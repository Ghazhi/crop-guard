/*
  # Cohort Agents Junction, enrollment one-active constraint,
    deactivate helper, cohort_agents RLS
*/

CREATE TABLE IF NOT EXISTS cohort_agents (
  cohort_id    uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  agent_id     uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  is_primary   boolean NOT NULL DEFAULT false,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (cohort_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_agents_cohort ON cohort_agents(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_agents_agent  ON cohort_agents(agent_id);

ALTER TABLE cohort_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cohort agents"
  ON cohort_agents FOR SELECT TO authenticated
  USING (is_admin_or_staff() OR EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id WHERE c.id = cohort_agents.cohort_id AND p.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can insert cohort agents"
  ON cohort_agents FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_staff() AND EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id WHERE c.id = cohort_agents.cohort_id AND p.organisation_id = get_my_org_id()));

CREATE POLICY "Staff can update cohort agents"
  ON cohort_agents FOR UPDATE TO authenticated
  USING (is_admin_or_staff()) WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can delete cohort agents"
  ON cohort_agents FOR DELETE TO authenticated
  USING (is_admin_or_staff());

-- Backfill from existing cohorts.agent_id
INSERT INTO cohort_agents (cohort_id, agent_id, is_primary)
SELECT id, agent_id, true FROM cohorts WHERE agent_id IS NOT NULL
ON CONFLICT (cohort_id, agent_id) DO NOTHING;

-- Drop old unique constraint that prevented re-enrollment in same program
DROP INDEX IF EXISTS idx_enrollments_unique;

-- Partial unique index: only one 'active' enrollment per farmer
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_one_active_per_farmer
  ON enrollments(farmer_id) WHERE status = 'active';

CREATE OR REPLACE FUNCTION deactivate_farmer_active_enrollment(
  p_farmer_id uuid,
  p_reason    text DEFAULT 'Re-enrolled in new program'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE enrollments
  SET status = 'graduated', graduated_at = now(), withdrawal_reason = p_reason, updated_at = now()
  WHERE farmer_id = p_farmer_id AND status = 'active';
END;
$$;
