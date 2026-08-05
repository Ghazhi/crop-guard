-- Training bundles: a named collection of weekly content (like a checkin template)
CREATE TABLE IF NOT EXISTS training_bundles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  crop_type       text NOT NULL DEFAULT 'maize' CHECK (crop_type IN ('maize','soybean','cocoa')),
  season          text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tb_org_crop ON training_bundles(organisation_id, crop_type);

ALTER TABLE training_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tb_select_org" ON training_bundles FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());
CREATE POLICY "tb_insert_org" ON training_bundles FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());
CREATE POLICY "tb_update_org" ON training_bundles FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());
CREATE POLICY "tb_delete_org" ON training_bundles FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- Add bundle_id to training_templates (nullable for backwards compat)
ALTER TABLE training_templates
  ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES training_bundles(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS training_templates_organisation_id_crop_type_week_number_key;

-- Allow multiple templates per week across different bundles
CREATE UNIQUE INDEX IF NOT EXISTS idx_tt_bundle_crop_week
  ON training_templates(bundle_id, crop_type, week_number)
  WHERE bundle_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_training_bundles') THEN
    CREATE TRIGGER set_updated_at_training_bundles
      BEFORE UPDATE ON training_bundles
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;
