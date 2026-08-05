/*
# Cooperative Meeting Attendance

1. New Tables
- `cooperative_meeting_attendance`
  - `id` (uuid, primary key)
  - `meeting_id` (uuid, FK to cooperative_meetings, CASCADE on delete)
  - `cooperative_id` (uuid, FK to cooperatives, CASCADE on delete)
  - `organisation_id` (uuid, not null — for RLS scoping)
  - `farmer_id` (uuid, FK to farmers, CASCADE on delete)
  - `present` (boolean, default false)
  - `created_at` / `updated_at` (timestamptz)

2. Security
- RLS enabled.
- SELECT: any authenticated user in the same organisation.
- INSERT/UPDATE/DELETE: staff/admin/super_admin in the same organisation.

3. Notes
- One row per farmer per meeting. Unique constraint on (meeting_id, farmer_id).
- Indexes on meeting_id and cooperative_id for fast lookups.
*/

CREATE TABLE IF NOT EXISTS cooperative_meeting_attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid NOT NULL REFERENCES cooperative_meetings(id) ON DELETE CASCADE,
  cooperative_id  uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  farmer_id       uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  present         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, farmer_id)
);

CREATE INDEX IF NOT EXISTS idx_coop_meeting_att_meeting ON cooperative_meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_coop_meeting_att_coop ON cooperative_meeting_attendance(cooperative_id);

ALTER TABLE cooperative_meeting_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_meeting_att" ON cooperative_meeting_attendance;
CREATE POLICY "select_coop_meeting_att" ON cooperative_meeting_attendance FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_meeting_att" ON cooperative_meeting_attendance;
CREATE POLICY "insert_coop_meeting_att" ON cooperative_meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_meeting_att" ON cooperative_meeting_attendance;
CREATE POLICY "update_coop_meeting_att" ON cooperative_meeting_attendance FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_meeting_att" ON cooperative_meeting_attendance;
CREATE POLICY "delete_coop_meeting_att" ON cooperative_meeting_attendance FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_meeting_attendance
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_meeting_attendance');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
