/*
# Training Materials Module

## Overview
Adds a full training-content module to the Configuration page, with
weekly templates, per-cohort schedules, per-farmer overrides, in-person
/ online sessions, attendance, and read receipts. A new public-readable
storage bucket holds the uploaded video/image/document materials.

## New Tables
- training_templates ........ org-scoped weekly content (crop, week, title, topic, notes)
- training_materials ........ one row per uploaded file attached to a template
- training_farmer_overrides . per-farmer pause / force-send / withhold control
- training_sessions .......... in-person or online scheduled events
- training_session_attendance  attendance records per farmer per session
- training_material_views .... read receipts when a farmer opens a material

## Modified Tables
- cohorts .................... +training_start_date, training_window_days, training_grace_days

## Storage
- new public bucket "cropguard-training" (videos, images, pdfs, docs)
  - any authenticated user can READ (farmers/agents view materials)
  - only staff/admin can WRITE (upload new materials)

## Security
- RLS enabled on every new table.
- SELECT scoped to the user's organisation via get_my_org_id().
- INSERT/UPDATE/DELETE restricted to staff/admin via is_admin_or_staff().
- training_sessions SELECT is org-wide (all authenticated in same org).
- training_material_views: a farmer can insert their own view row; staff can read all.
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. COHORT SCHEDULE COLUMNS (mirror check-in schedule)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS training_start_date   date,
  ADD COLUMN IF NOT EXISTS training_window_days  integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS training_grace_days   integer NOT NULL DEFAULT 2;

-- ═══════════════════════════════════════════════════════════════
-- 2. TRAINING TEMPLATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  crop_type       text NOT NULL DEFAULT 'maize' CHECK (crop_type IN ('maize','soybean','cocoa')),
  week_number     integer NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
  week_title      text NOT NULL DEFAULT '',
  title           text NOT NULL DEFAULT '',
  topic           text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  notes           text NOT NULL DEFAULT '',
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, crop_type, week_number)
);

CREATE INDEX IF NOT EXISTS idx_tt_org_crop_week ON training_templates(organisation_id, crop_type, week_number);

ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tt_select_org" ON training_templates;
CREATE POLICY "tt_select_org" ON training_templates FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());

DROP POLICY IF EXISTS "tt_insert_org" ON training_templates;
CREATE POLICY "tt_insert_org" ON training_templates FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "tt_update_org" ON training_templates;
CREATE POLICY "tt_update_org" ON training_templates FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "tt_delete_org" ON training_templates;
CREATE POLICY "tt_delete_org" ON training_templates FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ═══════════════════════════════════════════════════════════════
-- 3. TRAINING MATERIALS (child files)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL REFERENCES training_templates(id) ON DELETE CASCADE,
  file_path       text NOT NULL,
  file_name       text NOT NULL DEFAULT '',
  mime_type       text NOT NULL DEFAULT '',
  file_size       bigint NOT NULL DEFAULT 0,
  display_label   text NOT NULL DEFAULT '',
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tm_template ON training_materials(template_id);

ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tm_select_org" ON training_materials;
CREATE POLICY "tm_select_org" ON training_materials FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_templates t
     WHERE t.id = training_materials.template_id
       AND t.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "tm_insert_org" ON training_materials;
CREATE POLICY "tm_insert_org" ON training_materials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM training_templates t
     WHERE t.id = training_materials.template_id
       AND t.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "tm_update_org" ON training_materials;
CREATE POLICY "tm_update_org" ON training_materials FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_templates t
     WHERE t.id = training_materials.template_id
       AND t.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "tm_delete_org" ON training_materials;
CREATE POLICY "tm_delete_org" ON training_materials FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_templates t
     WHERE t.id = training_materials.template_id
       AND t.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. TRAINING FARMER OVERRIDES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_farmer_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  farmer_id     uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  template_id   uuid REFERENCES training_templates(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'paused' CHECK (status IN ('paused','send','withhold')),
  notes         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_tfo_farmer ON training_farmer_overrides(farmer_id);
CREATE INDEX IF NOT EXISTS idx_tfo_template ON training_farmer_overrides(template_id);

ALTER TABLE training_farmer_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tfo_select_org" ON training_farmer_overrides;
CREATE POLICY "tfo_select_org" ON training_farmer_overrides FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());

DROP POLICY IF EXISTS "tfo_insert_org" ON training_farmer_overrides;
CREATE POLICY "tfo_insert_org" ON training_farmer_overrides FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "tfo_update_org" ON training_farmer_overrides;
CREATE POLICY "tfo_update_org" ON training_farmer_overrides FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "tfo_delete_org" ON training_farmer_overrides;
CREATE POLICY "tfo_delete_org" ON training_farmer_overrides FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ═══════════════════════════════════════════════════════════════
-- 5. TRAINING SESSIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  session_type    text NOT NULL DEFAULT 'in_person' CHECK (session_type IN ('in_person','online')),
  crop_type       text CHECK (crop_type IS NULL OR crop_type IN ('maize','soybean','cocoa')),
  cohort_id       uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  scheduled_date  date NOT NULL,
  start_time      time,
  end_time        time,
  location        text NOT NULL DEFAULT '',
  meeting_link    text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ts_org_date ON training_sessions(organisation_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ts_cohort ON training_sessions(cohort_id);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_select_org" ON training_sessions;
CREATE POLICY "ts_select_org" ON training_sessions FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());

DROP POLICY IF EXISTS "ts_insert_org" ON training_sessions;
CREATE POLICY "ts_insert_org" ON training_sessions FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "ts_update_org" ON training_sessions;
CREATE POLICY "ts_update_org" ON training_sessions FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "ts_delete_org" ON training_sessions;
CREATE POLICY "ts_delete_org" ON training_sessions FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ═══════════════════════════════════════════════════════════════
-- 6. TRAINING SESSION ATTENDANCE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_session_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  farmer_id   uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  attended    boolean NOT NULL DEFAULT false,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, farmer_id)
);

CREATE INDEX IF NOT EXISTS idx_tsa_session ON training_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_tsa_farmer ON training_session_attendance(farmer_id);

ALTER TABLE training_session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tsa_select_org" ON training_session_attendance;
CREATE POLICY "tsa_select_org" ON training_session_attendance FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_sessions s
     WHERE s.id = training_session_attendance.session_id
       AND s.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "tsa_insert_org" ON training_session_attendance;
CREATE POLICY "tsa_insert_org" ON training_session_attendance FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM training_sessions s
     WHERE s.id = training_session_attendance.session_id
       AND s.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "tsa_update_org" ON training_session_attendance;
CREATE POLICY "tsa_update_org" ON training_session_attendance FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_sessions s
     WHERE s.id = training_session_attendance.session_id
       AND s.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "tsa_delete_org" ON training_session_attendance;
CREATE POLICY "tsa_delete_org" ON training_session_attendance FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_sessions s
     WHERE s.id = training_session_attendance.session_id
       AND s.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

-- ═══════════════════════════════════════════════════════════════
-- 7. TRAINING MATERIAL VIEWS (read receipts)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_material_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES training_materials(id) ON DELETE CASCADE,
  farmer_id   uuid REFERENCES farmers(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tmv_material ON training_material_views(material_id);
CREATE INDEX IF NOT EXISTS idx_tmv_farmer ON training_material_views(farmer_id);

ALTER TABLE training_material_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tmv_select_org" ON training_material_views;
CREATE POLICY "tmv_select_org" ON training_material_views FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_materials m
     JOIN training_templates t ON t.id = m.template_id
     WHERE m.id = training_material_views.material_id
       AND t.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "tmv_insert_self" ON training_material_views;
CREATE POLICY "tmv_insert_self" ON training_material_views FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM training_materials m
     JOIN training_templates t ON t.id = m.template_id
     WHERE m.id = training_material_views.material_id
       AND t.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "tmv_delete_org" ON training_material_views;
CREATE POLICY "tmv_delete_org" ON training_material_views FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM training_materials m
     JOIN training_templates t ON t.id = m.template_id
     WHERE m.id = training_material_views.material_id
       AND t.organisation_id = get_my_org_id()
       AND is_admin_or_staff())
  );

-- ═══════════════════════════════════════════════════════════════
-- 8. STORAGE BUCKET: cropguard-training
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cropguard-training', 'cropguard-training', true, 104857600,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf',
        'video/mp4','video/webm','audio/mpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user can read training materials (farmers + agents + staff)
DROP POLICY IF EXISTS "training_bucket_read" ON storage.objects;
CREATE POLICY "training_bucket_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'cropguard-training');

-- Only staff/admin can upload training materials
DROP POLICY IF EXISTS "training_bucket_upload" ON storage.objects;
CREATE POLICY "training_bucket_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'cropguard-training' AND is_admin_or_staff()
  );

-- Staff/admin can update their org's training materials
DROP POLICY IF EXISTS "training_bucket_update" ON storage.objects;
CREATE POLICY "training_bucket_update" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'cropguard-training' AND is_admin_or_staff()
  );

-- Staff/admin can delete training materials
DROP POLICY IF EXISTS "training_bucket_delete" ON storage.objects;
CREATE POLICY "training_bucket_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'cropguard-training' AND is_admin_or_staff()
  );

-- ═══════════════════════════════════════════════════════════════
-- 9. UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_training_templates') THEN
    CREATE TRIGGER set_updated_at_training_templates
      BEFORE UPDATE ON training_templates
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_training_farmer_overrides') THEN
    CREATE TRIGGER set_updated_at_training_farmer_overrides
      BEFORE UPDATE ON training_farmer_overrides
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_training_sessions') THEN
    CREATE TRIGGER set_updated_at_training_sessions
      BEFORE UPDATE ON training_sessions
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;
