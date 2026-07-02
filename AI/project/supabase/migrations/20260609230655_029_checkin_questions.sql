
-- Weekly check-in questions configurable per organisation
CREATE TABLE IF NOT EXISTS checkin_questions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  component        text NOT NULL CHECK (component IN ('agronomy','climate_smart','advisory_commitment','farm_enterprise')),
  label            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkin_questions_org ON checkin_questions(organisation_id);

ALTER TABLE checkin_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_checkin_questions" ON checkin_questions FOR SELECT
  TO authenticated USING (organisation_id = (
    SELECT organisation_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "insert_checkin_questions" ON checkin_questions FOR INSERT
  TO authenticated WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('staff','admin')
  );

CREATE POLICY "update_checkin_questions" ON checkin_questions FOR UPDATE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('staff','admin')
  ) WITH CHECK (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('staff','admin')
  );

CREATE POLICY "delete_checkin_questions" ON checkin_questions FOR DELETE
  TO authenticated USING (
    organisation_id = (SELECT organisation_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('staff','admin')
  );

-- Trigger for updated_at
CREATE TRIGGER trg_checkin_questions_updated_at
  BEFORE UPDATE ON checkin_questions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
