/*
  # Farmer Check-ins Tables

  These tables support the farmer self-reporting (weekly check-in) flow
  in the farmer mobile portal.

  1. New Tables
    - `farmer_checkins` — one record per farmer per week; tracks status and help requests
    - `farmer_checkin_responses` — individual activity responses within a check-in

  2. Security
    - RLS enabled on both tables
    - Farmers can insert/select/update their own check-ins
    - Agents and staff can read check-ins for farmers in their org
*/

CREATE TABLE IF NOT EXISTS farmer_checkins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id        uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  organisation_id  uuid REFERENCES organisations(id) ON DELETE SET NULL,
  week_number      integer NOT NULL,
  status           text NOT NULL DEFAULT 'draft',
  help_requested   boolean NOT NULL DEFAULT false,
  challenge_notes  text,
  verified_at      timestamptz,
  verified_by      uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT farmer_checkins_farmer_week_unique UNIQUE (farmer_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_farmer_checkins_farmer ON farmer_checkins(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_checkins_status ON farmer_checkins(status);
CREATE INDEX IF NOT EXISTS idx_farmer_checkins_week   ON farmer_checkins(week_number);

ALTER TABLE farmer_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers select own checkins"
  ON farmer_checkins FOR SELECT TO authenticated
  USING (farmer_id = get_my_farmer_id());

CREATE POLICY "Farmers insert own checkins"
  ON farmer_checkins FOR INSERT TO authenticated
  WITH CHECK (farmer_id = get_my_farmer_id());

CREATE POLICY "Farmers update own draft checkin"
  ON farmer_checkins FOR UPDATE TO authenticated
  USING (farmer_id = get_my_farmer_id() AND status = 'draft')
  WITH CHECK (farmer_id = get_my_farmer_id());

CREATE POLICY "Agents view org farmer checkins"
  ON farmer_checkins FOR SELECT TO authenticated
  USING (is_agent_or_above() AND EXISTS (SELECT 1 FROM farmers WHERE farmers.id = farmer_checkins.farmer_id AND farmers.organisation_id = get_my_org_id()));

CREATE POLICY "Staff view all checkins in their org"
  ON farmer_checkins FOR SELECT TO authenticated
  USING (is_admin_or_staff() AND EXISTS (SELECT 1 FROM farmers WHERE farmers.id = farmer_checkins.farmer_id AND farmers.organisation_id = get_my_org_id()));

CREATE POLICY "Agents can update checkins for verification"
  ON farmer_checkins FOR UPDATE TO authenticated
  USING (is_agent_or_above() AND EXISTS (SELECT 1 FROM farmers WHERE farmers.id = farmer_checkins.farmer_id AND farmers.organisation_id = get_my_org_id()))
  WITH CHECK (is_agent_or_above());

-- farmer_checkin_responses
CREATE TABLE IF NOT EXISTS farmer_checkin_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id      uuid NOT NULL REFERENCES farmer_checkins(id) ON DELETE CASCADE,
  activity_code   text NOT NULL,
  farmer_response text,
  is_flagged      boolean NOT NULL DEFAULT false,
  photo_url       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farmer_responses_checkin ON farmer_checkin_responses(checkin_id);

ALTER TABLE farmer_checkin_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers select own responses"
  ON farmer_checkin_responses FOR SELECT TO authenticated
  USING (checkin_id IN (SELECT id FROM farmer_checkins WHERE farmer_id = get_my_farmer_id()));

CREATE POLICY "Farmers insert own responses"
  ON farmer_checkin_responses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM farmer_checkins WHERE farmer_checkins.id = checkin_id AND farmer_checkins.farmer_id = get_my_farmer_id()));

CREATE POLICY "Farmers update own draft responses"
  ON farmer_checkin_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM farmer_checkins fc WHERE fc.id = farmer_checkin_responses.checkin_id AND fc.farmer_id = get_my_farmer_id() AND fc.status = 'draft'))
  WITH CHECK (EXISTS (SELECT 1 FROM farmer_checkins fc WHERE fc.id = farmer_checkin_responses.checkin_id AND fc.farmer_id = get_my_farmer_id()));

CREATE POLICY "Agents view responses for org farmers"
  ON farmer_checkin_responses FOR SELECT TO authenticated
  USING (is_agent_or_above() AND EXISTS (SELECT 1 FROM farmer_checkins fc JOIN farmers f ON f.id = fc.farmer_id WHERE fc.id = farmer_checkin_responses.checkin_id AND f.organisation_id = get_my_org_id()));

CREATE POLICY "Farmers delete own draft responses"
  ON farmer_checkin_responses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM farmer_checkins fc WHERE fc.id = farmer_checkin_responses.checkin_id AND fc.farmer_id = get_my_farmer_id() AND fc.status = 'draft'));
