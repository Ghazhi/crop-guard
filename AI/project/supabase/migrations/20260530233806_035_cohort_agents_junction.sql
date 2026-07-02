/*
  # Cohort Agents — Many-to-Many Junction Table

  Replaces the single cohorts.agent_id with a proper junction table so that
  multiple agents can be assigned to a single cohort.

  1. New Table: cohort_agents
     - cohort_id  (FK → cohorts)
     - agent_id   (FK → users)
     - assigned_at, assigned_by, is_primary (first agent is primary by default)
     - Composite PK on (cohort_id, agent_id)

  2. Data Migration
     - Backfills cohort_agents from existing cohorts.agent_id values
     - Marks those backfilled rows as is_primary = true

  3. Security
     - RLS enabled
     - Staff/admin can manage cohort_agents
     - Agents can read their own assignments

  4. Notes
     - cohorts.agent_id is kept for backwards compatibility but will reflect
       the primary agent; it is no longer the authoritative source.
     - Per-farmer agent assignment continues to use enrollments.agent_id.
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

-- Staff/admin can manage cohort_agents
CREATE POLICY "Staff can view cohort agents"
  ON cohort_agents FOR SELECT
  TO authenticated
  USING (
    is_admin_or_staff()
    OR EXISTS (
      SELECT 1 FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = cohort_agents.cohort_id
        AND p.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Staff can insert cohort agents"
  ON cohort_agents FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_or_staff()
    AND EXISTS (
      SELECT 1 FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = cohort_agents.cohort_id
        AND p.organisation_id = get_my_org_id()
    )
  );

CREATE POLICY "Staff can update cohort agents"
  ON cohort_agents FOR UPDATE
  TO authenticated
  USING (is_admin_or_staff())
  WITH CHECK (is_admin_or_staff());

CREATE POLICY "Staff can delete cohort agents"
  ON cohort_agents FOR DELETE
  TO authenticated
  USING (is_admin_or_staff());

-- Backfill from existing cohorts.agent_id
INSERT INTO cohort_agents (cohort_id, agent_id, is_primary)
SELECT id, agent_id, true
FROM cohorts
WHERE agent_id IS NOT NULL
ON CONFLICT (cohort_id, agent_id) DO NOTHING;
