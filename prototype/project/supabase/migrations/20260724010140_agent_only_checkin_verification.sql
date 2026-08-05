/*
# Agent-only check-in verification support

1. Modified Tables
- `farmer_checkins`: add `is_agent_only` boolean column (default false)
  - Tags check-ins that were verified by an agent without a farmer submission

2. Security (RLS)
- Add INSERT policy for agents on `farmer_checkins` so they can create check-ins on behalf of farmers (agent-only verification)
- Add INSERT/DELETE/UPDATE policies for agents on `farmer_checkin_responses` so they can manage response rows during agent-only verification
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmer_checkins' AND column_name = 'is_agent_only'
  ) THEN
    ALTER TABLE farmer_checkins
      ADD COLUMN is_agent_only boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Agent INSERT policy on farmer_checkins
DROP POLICY IF EXISTS "Agents insert checkins for agent-only verification" ON farmer_checkins;
CREATE POLICY "Agents insert checkins for agent-only verification"
ON farmer_checkins FOR INSERT
TO authenticated
WITH CHECK (
  is_agent_or_above()
  AND EXISTS (
    SELECT 1 FROM farmers
    WHERE farmers.id = farmer_checkins.farmer_id
    AND farmers.organisation_id = get_my_org_id()
  )
);

-- Agent INSERT policy on farmer_checkin_responses
DROP POLICY IF EXISTS "Agents insert responses for verification" ON farmer_checkin_responses;
CREATE POLICY "Agents insert responses for verification"
ON farmer_checkin_responses FOR INSERT
TO authenticated
WITH CHECK (
  is_agent_or_above()
  AND EXISTS (
    SELECT 1 FROM farmer_checkins fc
    JOIN farmers f ON f.id = fc.farmer_id
    WHERE fc.id = farmer_checkin_responses.checkin_id
    AND f.organisation_id = get_my_org_id()
  )
);

-- Agent DELETE policy on farmer_checkin_responses
DROP POLICY IF EXISTS "Agents delete responses for verification" ON farmer_checkin_responses;
CREATE POLICY "Agents delete responses for verification"
ON farmer_checkin_responses FOR DELETE
TO authenticated
USING (
  is_agent_or_above()
  AND EXISTS (
    SELECT 1 FROM farmer_checkins fc
    JOIN farmers f ON f.id = fc.farmer_id
    WHERE fc.id = farmer_checkin_responses.checkin_id
    AND f.organisation_id = get_my_org_id()
  )
);

-- Agent UPDATE policy on farmer_checkin_responses (for verdicts)
DROP POLICY IF EXISTS "Agents update responses for verification" ON farmer_checkin_responses;
CREATE POLICY "Agents update responses for verification"
ON farmer_checkin_responses FOR UPDATE
TO authenticated
USING (
  is_agent_or_above()
  AND EXISTS (
    SELECT 1 FROM farmer_checkins fc
    JOIN farmers f ON f.id = fc.farmer_id
    WHERE fc.id = farmer_checkin_responses.checkin_id
    AND f.organisation_id = get_my_org_id()
  )
)
WITH CHECK (
  is_agent_or_above()
  AND EXISTS (
    SELECT 1 FROM farmer_checkins fc
    JOIN farmers f ON f.id = fc.farmer_id
    WHERE fc.id = farmer_checkin_responses.checkin_id
    AND f.organisation_id = get_my_org_id()
  )
);
