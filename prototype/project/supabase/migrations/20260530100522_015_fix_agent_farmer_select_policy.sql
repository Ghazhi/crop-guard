/*
  # Fix agent SELECT policy on farmers

  Problem: Agents can only see farmers who are already enrolled with them.
  A newly registered farmer has no enrollment yet, so the agent who just
  registered them cannot see them in the registry.

  Fix: Replace the narrow enrollment-based policy with a broader one that
  lets agents see all farmers in their organisation (same as they can
  insert/update). This matches the expected UX where an agent's farmer
  registry shows all farmers they have registered.
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Agents view farmers they enrolled" ON farmers;

-- New policy: agents can see any farmer in their org
CREATE POLICY "Agents view farmers in their org"
  ON farmers FOR SELECT
  TO authenticated
  USING (
    (get_my_role() = 'agent'::user_role)
    AND (organisation_id = get_my_org_id())
  );
