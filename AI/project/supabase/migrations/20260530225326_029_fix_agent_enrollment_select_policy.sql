/*
  # Fix agent enrollment SELECT policy

  ## Problem
  The existing "Agents view enrollments they manage" policy only allows agents to
  see enrollments where agent_id = their own user id. This means agents cannot read
  enrollments created by staff on their behalf — causing "No active enrollment found"
  errors on the agent portal (e.g., in BaselineAssessmentForm) even when the farmer
  is actively enrolled.

  ## Fix
  Replace the restrictive agent policy with one that allows agents to view any
  enrollment for farmers within their organisation. Agents need read access to ALL
  enrollments for farmers in their org to do their job (baseline assessments,
  check-ins, verifications).

  ## Changes
  - DROP old "Agents view enrollments they manage" policy (agent_id = auth.uid() only)
  - CREATE new "Agents view enrollments for org farmers" policy using org membership check
*/

DROP POLICY IF EXISTS "Agents view enrollments they manage" ON enrollments;

CREATE POLICY "Agents view enrollments for org farmers"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (
    is_agent_or_above()
    AND EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = enrollments.program_id
        AND programs.organisation_id = get_my_org_id()
    )
  );
