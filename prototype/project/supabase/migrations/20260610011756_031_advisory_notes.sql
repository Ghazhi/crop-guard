CREATE TABLE IF NOT EXISTS advisory_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  crop_type   text,
  week        integer,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advisory_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_advisory_notes" ON advisory_notes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_advisory_notes" ON advisory_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "update_advisory_notes" ON advisory_notes FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "delete_advisory_notes" ON advisory_notes FOR DELETE
  TO authenticated USING (auth.uid() = author_id);
