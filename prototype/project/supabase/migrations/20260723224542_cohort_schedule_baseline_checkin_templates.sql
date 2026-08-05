/*
# Cohort Schedule, Baseline Templates, Checkin Templates & Agent Verification

## Overview
1. Multiple baseline templates (4 mandatory pillars + optional ECI)
2. Weekly checkin templates (crop, season, title, 4 components, duplicate)
3. Cohort schedule: start mode (immediate/scheduled), template links, pause
4. Per-farmer pause overrides within a cohort
5. Agent verification mode on farmer checkins

## New Tables
- baseline_templates, checkin_templates, checkin_template_items, cohort_farmer_overrides

## Modified Tables
- cohorts: +start_mode, baseline_template_id, checkin_template_id, schedule_paused, paused_at
- farmer_checkins: +checkin_template_id, verification_mode, agent_verified_at, agent_verified_by
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. BASELINE TEMPLATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS baseline_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  crop_type       text NOT NULL DEFAULT 'maize',
  p1_items        jsonb NOT NULL DEFAULT '[]',
  p2_items        jsonb NOT NULL DEFAULT '[]',
  p3_items        jsonb NOT NULL DEFAULT '[]',
  p4_items        jsonb NOT NULL DEFAULT '[]',
  include_eci     boolean NOT NULL DEFAULT true,
  eci_items       jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE baseline_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bt_select_org" ON baseline_templates;
CREATE POLICY "bt_select_org" ON baseline_templates FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());

DROP POLICY IF EXISTS "bt_insert_org" ON baseline_templates;
CREATE POLICY "bt_insert_org" ON baseline_templates FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "bt_update_org" ON baseline_templates;
CREATE POLICY "bt_update_org" ON baseline_templates FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "bt_delete_org" ON baseline_templates;
CREATE POLICY "bt_delete_org" ON baseline_templates FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ═══════════════════════════════════════════════════════════════
-- 2. CHECKIN TEMPLATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS checkin_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title             text NOT NULL,
  crop_type          text NOT NULL DEFAULT 'maize',
  season            text NOT NULL DEFAULT '',
  week_number       integer,
  description       text NOT NULL DEFAULT '',
  is_active         boolean NOT NULL DEFAULT true,
  source_template_id uuid REFERENCES checkin_templates(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE checkin_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct_select_org" ON checkin_templates;
CREATE POLICY "ct_select_org" ON checkin_templates FOR SELECT
  TO authenticated USING (organisation_id = get_my_org_id());

DROP POLICY IF EXISTS "ct_insert_org" ON checkin_templates;
CREATE POLICY "ct_insert_org" ON checkin_templates FOR INSERT
  TO authenticated WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "ct_update_org" ON checkin_templates;
CREATE POLICY "ct_update_org" ON checkin_templates FOR UPDATE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff())
  WITH CHECK (organisation_id = get_my_org_id() AND is_admin_or_staff());

DROP POLICY IF EXISTS "ct_delete_org" ON checkin_templates;
CREATE POLICY "ct_delete_org" ON checkin_templates FOR DELETE
  TO authenticated USING (organisation_id = get_my_org_id() AND is_admin_or_staff());

-- ═══════════════════════════════════════════════════════════════
-- 3. CHECKIN TEMPLATE ITEMS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS checkin_template_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_template_id uuid NOT NULL REFERENCES checkin_templates(id) ON DELETE CASCADE,
  component           text NOT NULL CHECK (component IN ('agronomy','climate_smart','advisory_commitment','farm_enterprise')),
  activity_code       text NOT NULL,
  label               text NOT NULL,
  description         text NOT NULL DEFAULT '',
  sort_order          integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cti_template ON checkin_template_items(checkin_template_id);

ALTER TABLE checkin_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cti_select_org" ON checkin_template_items;
CREATE POLICY "cti_select_org" ON checkin_template_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM checkin_templates ct
     WHERE ct.id = checkin_template_items.checkin_template_id
     AND ct.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "cti_insert_org" ON checkin_template_items;
CREATE POLICY "cti_insert_org" ON checkin_template_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM checkin_templates ct
     WHERE ct.id = checkin_template_items.checkin_template_id
     AND ct.organisation_id = get_my_org_id()
     AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "cti_update_org" ON checkin_template_items;
CREATE POLICY "cti_update_org" ON checkin_template_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM checkin_templates ct
     WHERE ct.id = checkin_template_items.checkin_template_id
     AND ct.organisation_id = get_my_org_id()
     AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "cti_delete_org" ON checkin_template_items;
CREATE POLICY "cti_delete_org" ON checkin_template_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM checkin_templates ct
     WHERE ct.id = checkin_template_items.checkin_template_id
     AND ct.organisation_id = get_my_org_id()
     AND is_admin_or_staff())
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. COHORT SCHEDULE ADDITIONS
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS start_mode text NOT NULL DEFAULT 'scheduled' CHECK (start_mode IN ('immediate','scheduled'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS baseline_template_id uuid REFERENCES baseline_templates(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS checkin_template_id uuid REFERENCES checkin_templates(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS schedule_paused boolean NOT NULL DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS paused_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. COHORT FARMER OVERRIDES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cohort_farmer_overrides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id   uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  farmer_id   uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  is_paused   boolean NOT NULL DEFAULT true,
  paused_at   timestamptz,
  notes       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, farmer_id)
);

ALTER TABLE cohort_farmer_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfo_select_org" ON cohort_farmer_overrides;
CREATE POLICY "cfo_select_org" ON cohort_farmer_overrides FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id
     WHERE c.id = cohort_farmer_overrides.cohort_id AND p.organisation_id = get_my_org_id())
  );

DROP POLICY IF EXISTS "cfo_insert_org" ON cohort_farmer_overrides;
CREATE POLICY "cfo_insert_org" ON cohort_farmer_overrides FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id
     WHERE c.id = cohort_farmer_overrides.cohort_id AND p.organisation_id = get_my_org_id() AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "cfo_update_org" ON cohort_farmer_overrides;
CREATE POLICY "cfo_update_org" ON cohort_farmer_overrides FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id
     WHERE c.id = cohort_farmer_overrides.cohort_id AND p.organisation_id = get_my_org_id() AND is_admin_or_staff())
  );

DROP POLICY IF EXISTS "cfo_delete_org" ON cohort_farmer_overrides;
CREATE POLICY "cfo_delete_org" ON cohort_farmer_overrides FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cohorts c JOIN programs p ON p.id = c.program_id
     WHERE c.id = cohort_farmer_overrides.cohort_id AND p.organisation_id = get_my_org_id() AND is_admin_or_staff())
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. FARMER CHECKINS ADDITIONS
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE farmer_checkins ADD COLUMN IF NOT EXISTS checkin_template_id uuid REFERENCES checkin_templates(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE farmer_checkins ADD COLUMN IF NOT EXISTS verification_mode text NOT NULL DEFAULT 'farmer_then_agent' CHECK (verification_mode IN ('farmer_then_agent','agent_only'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE farmer_checkins ADD COLUMN IF NOT EXISTS agent_verified_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE farmer_checkins ADD COLUMN IF NOT EXISTS agent_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. SEED DEFAULT TEMPLATES
-- ═══════════════════════════════════════════════════════════════
INSERT INTO baseline_templates (organisation_id, title, description, crop_type, p1_items, p2_items, p3_items, p4_items, include_eci, eci_items)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Default Maize Baseline',
  'Standard baseline assessment for maize farmers',
  'maize',
  '[{"id":"farming_experience","label":"Farming Experience","max":6,"guidance":"0-1yr=1, 4+yr=2, 7+yr=3, 10+yr=4, 15+yr=5, 20+yr=6"},{"id":"weed_management","label":"Weed Management","max":6,"guidance":"Evidence of systematic weed control"},{"id":"proper_planting","label":"Proper Planting","max":6,"guidance":"Correct spacing, timely planting"},{"id":"fertilizer_use","label":"Fertilizer Use","max":6,"guidance":"Correct rate, time, and method"},{"id":"pest_disease","label":"Pest & Disease Control","max":6,"guidance":"Active scouting and responsive management"}]'::jsonb,
  '[{"id":"mulching","label":"Mulching","max":6,"guidance":"Mulch cover across majority of farm"},{"id":"composting","label":"Composting","max":6,"guidance":"Active compost pile or application"},{"id":"crop_rotation","label":"Crop Rotation","max":6,"guidance":"Rotation or intercropping practiced"},{"id":"water_harvesting","label":"Water Harvesting","max":6,"guidance":"Structures to retain rainfall"},{"id":"conservation_till","label":"Conservation Tillage","max":6,"guidance":"Minimal soil disturbance, avoids burning"}]'::jsonb,
  '[{"id":"attends_training","label":"Attends Training","max":5,"guidance":"Regular attendance at extension training"},{"id":"follows_agronomist","label":"Follows Agronomist","max":5,"guidance":"Can demonstrate application of advice"},{"id":"cooperative_visits","label":"Cooperative Visits","max":5,"guidance":"Active attendance at cooperative meetings"},{"id":"cooperative_member","label":"Cooperative Affiliation","max":5,"guidance":"Formally registered cooperative member"}]'::jsonb,
  '[{"id":"repayment_history","label":"Repayment History","max":8,"guidance":"No outstanding unpaid obligations"},{"id":"savings_habit","label":"Savings Habit","max":4,"guidance":"Active savings account or practice"},{"id":"additional_income","label":"Additional Income","max":4,"guidance":"Secondary occupation or verified income"},{"id":"offtaker_confirmed","label":"Offtaker Confirmed","max":4,"guidance":"Confirmed offtaker arrangement"}]'::jsonb,
  true,
  '[{"id":"income_debt","label":"Stable Income & Debt Burden","max":8,"guidance":"Stable income, no unmanageable debt"},{"id":"financial_stability","label":"Moderate Financial Stability","max":8,"guidance":"Owns productive assets or maintains savings"},{"id":"identity_eligibility","label":"Identity & Eligibility","max":8,"guidance":"Identity confirmed, meets program criteria"},{"id":"production_commitment","label":"Production Commitment","max":8,"guidance":"Clear production plan confirmed by agent"},{"id":"declaration_consent","label":"Declaration & Consent","max":8,"guidance":"Informed consent form signed"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM baseline_templates WHERE organisation_id = '00000000-0000-0000-0000-000000000001');

INSERT INTO checkin_templates (organisation_id, title, crop_type, season, week_number, description)
SELECT '00000000-0000-0000-0000-000000000001', 'Maize Week 1 - Land Preparation', 'maize', '2026A', 1, 'First week check-in for maize farmers'
WHERE NOT EXISTS (SELECT 1 FROM checkin_templates WHERE organisation_id = '00000000-0000-0000-0000-000000000001');

INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, sort_order)
SELECT ct.id, x.component, x.activity_code, x.label, x.description, x.sort_order
FROM checkin_templates ct,
LATERAL (VALUES
  ('agronomy','farming_experience','I prepared my land for planting','Land preparation completed this week',0),
  ('agronomy','weed_management','I managed weeds on my farm','Weed control activities carried out',1),
  ('agronomy','proper_planting','I planted at the correct spacing','Correct spacing and timely planting',2),
  ('climate_smart','mulching','I applied mulch to my farm','Mulch cover applied on majority of farm area',3),
  ('climate_smart','conservation_till','I practised conservation tillage','Minimal soil disturbance, avoids burning',4),
  ('advisory_commitment','attends_training','I attended training this week','Regular attendance at extension or GAP training',5),
  ('advisory_commitment','follows_agronomist','I followed the agronomist advice','Can demonstrate application of advice given',6),
  ('farm_enterprise','savings_habit','I maintained my savings practice','Active savings account or consistent practice',7),
  ('farm_enterprise','additional_income','I earned additional income','Secondary occupation or verified other income',8)
) AS x(component, activity_code, label, description, sort_order)
WHERE ct.organisation_id = '00000000-0000-0000-0000-000000000001'
  AND ct.title = 'Maize Week 1 - Land Preparation'
  AND NOT EXISTS (SELECT 1 FROM checkin_template_items cti WHERE cti.checkin_template_id = ct.id);

UPDATE cohorts SET
  baseline_template_id = (SELECT id FROM baseline_templates WHERE organisation_id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
  checkin_template_id = (SELECT id FROM checkin_templates WHERE organisation_id = '00000000-0000-0000-0000-000000000001' LIMIT 1)
WHERE id = 'c0000000-0000-0000-0000-000000000001';
