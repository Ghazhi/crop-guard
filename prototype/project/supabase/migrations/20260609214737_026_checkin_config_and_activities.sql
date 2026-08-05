
-- 1. Add check-in configuration columns to cohorts
ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS checkin_start_date   date,
  ADD COLUMN IF NOT EXISTS checkin_window_days  integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS checkin_grace_days   integer NOT NULL DEFAULT 2;

-- 2. Create weekly_activity_config table (DB-driven activity definitions)
CREATE TABLE IF NOT EXISTS weekly_activity_config (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_code text        NOT NULL UNIQUE,
  pillar        text        NOT NULL CHECK (pillar IN ('p1','p2','p3','p4')),
  label         text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  sort_order    integer     NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wac_pillar    ON weekly_activity_config(pillar);
CREATE INDEX IF NOT EXISTS idx_wac_is_active ON weekly_activity_config(is_active);

ALTER TABLE weekly_activity_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wac_select" ON weekly_activity_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "wac_insert" ON weekly_activity_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('staff','admin')));
CREATE POLICY "wac_update" ON weekly_activity_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('staff','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('staff','admin')));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_weekly_activity_config') THEN
    CREATE TRIGGER set_updated_at_weekly_activity_config
      BEFORE UPDATE ON weekly_activity_config
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END $$;

-- 3. Seed the 18 default activities
INSERT INTO weekly_activity_config (activity_code, pillar, label, description, sort_order, is_active) VALUES
  ('farming_experience', 'p1', 'Farming Experience',    'Years of active farming this season',                  1,  true),
  ('weed_management',    'p1', 'Weed Management',        'Systematic weed control carried out this week',       2,  true),
  ('proper_planting',    'p1', 'Proper Planting',        'Correct spacing and timely planting maintained',      3,  true),
  ('fertilizer_use',     'p1', 'Fertilizer Use',         'Applied at correct rate, time, and method',           4,  true),
  ('pest_disease',       'p1', 'Pest & Disease Control', 'Active scouting and responsive management',           5,  true),
  ('mulching',           'p2', 'Mulching',               'Mulch cover applied on majority of farm area',        6,  true),
  ('composting',         'p2', 'Composting',             'Active compost pile or compost application',          7,  true),
  ('crop_rotation',      'p2', 'Crop Rotation',          'Rotation or intercropping practiced this season',     8,  true),
  ('water_harvesting',   'p2', 'Water Harvesting',       'Structures or practices to retain rainfall',          9,  true),
  ('conservation_till',  'p2', 'Conservation Tillage',   'Minimal soil disturbance, avoids burning',            10, true),
  ('attends_training',   'p3', 'Attends Training',       'Regular attendance at extension or GAP training',     11, true),
  ('follows_agronomist', 'p3', 'Follows Agronomist',     'Can demonstrate application of advice given',         12, true),
  ('cooperative_visits', 'p3', 'Cooperative Visits',     'Active attendance at cooperative meetings',           13, true),
  ('cooperative_member', 'p3', 'Cooperative Membership', 'Formally registered cooperative member',             14, true),
  ('repayment_history',  'p4', 'Repayment History',      'No outstanding unpaid agricultural obligations',      15, true),
  ('savings_habit',      'p4', 'Savings Habit',          'Active savings account or consistent practice',       16, true),
  ('additional_income',  'p4', 'Additional Income',      'Secondary occupation or verified other income',       17, true),
  ('offtaker_confirmed', 'p4', 'Offtaker Confirmed',     'Binary: confirmed offtaker arrangement',              18, true)
ON CONFLICT (activity_code) DO NOTHING;
