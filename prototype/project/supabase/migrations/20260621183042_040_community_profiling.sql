-- ── Communities ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communities (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  region_code          text NOT NULL,
  district             text NOT NULL,
  nearest_town         text,
  socioeconomic_status text CHECK (socioeconomic_status IN ('rural', 'urban', 'peri_urban')),
  income_streams       text[]    DEFAULT '{}',
  income_streams_other text,
  social_amenities     jsonb     DEFAULT '{}',
  gps_lat              numeric,
  gps_lng              numeric,
  leader_name          text,
  leader_contact       text,
  created_by           uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_communities" ON communities FOR SELECT
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "insert_communities" ON communities FOR INSERT
  TO authenticated WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "update_communities" ON communities FOR UPDATE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "delete_communities" ON communities FOR DELETE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );

-- ── Cooperatives ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperatives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  community_id    uuid REFERENCES communities(id) ON DELETE SET NULL,
  member_count    int  DEFAULT 0,
  primary_crops   text[] DEFAULT '{}',
  secondary_crops text[] DEFAULT '{}',
  farm_animals    text[] DEFAULT '{}',
  chairman_name   text,
  secretary_name  text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cooperatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_cooperatives" ON cooperatives FOR SELECT
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "insert_cooperatives" ON cooperatives FOR INSERT
  TO authenticated WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "update_cooperatives" ON cooperatives FOR UPDATE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "delete_cooperatives" ON cooperatives FOR DELETE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
  );

-- ── Cooperative ↔ Farmer junction ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_farmers (
  cooperative_id uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  farmer_id      uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cooperative_id, farmer_id)
);

ALTER TABLE cooperative_farmers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_cooperative_farmers" ON cooperative_farmers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_cooperative_farmers" ON cooperative_farmers FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "delete_cooperative_farmers" ON cooperative_farmers FOR DELETE
  TO authenticated USING (true);

-- ── Community ↔ Farmer (soft link) ───────────────────────────────────────────

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
