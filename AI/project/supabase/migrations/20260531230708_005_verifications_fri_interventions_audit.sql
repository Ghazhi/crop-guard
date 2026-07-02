/*
  # Core Tables: verifications, fri_scores, baseline_assessments, interventions,
                 field_reports, norvi_outputs, risk_flags, audit_logs
*/

CREATE TABLE IF NOT EXISTS verifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'kyc',
  status          verification_status NOT NULL DEFAULT 'pending',
  scheduled_at    timestamptz,
  completed_at    timestamptz,
  score           integer,
  notes           text,
  evidence_urls   text[] NOT NULL DEFAULT '{}',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_farmer ON verifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_verifications_agent  ON verifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_type   ON verifications(type);

CREATE TABLE IF NOT EXISTS verification_activities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id  uuid NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  step             text NOT NULL DEFAULT '',
  status           verification_status NOT NULL DEFAULT 'pending',
  notes            text,
  evidence_urls    text[] NOT NULL DEFAULT '{}',
  completed_at     timestamptz,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verif_activities_verif  ON verification_activities(verification_id);
CREATE INDEX IF NOT EXISTS idx_verif_activities_status ON verification_activities(status);

CREATE TABLE IF NOT EXISTS fri_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  enrollment_id       uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  score               integer NOT NULL CHECK (score >= 0 AND score <= 100),
  category            risk_category NOT NULL,
  method              fri_method NOT NULL DEFAULT 'weighted_sum',
  rainfall_deviation  numeric(8,4),
  soil_moisture_index numeric(6,2),
  pest_pressure       numeric(5,2),
  disease_incidence   numeric(5,2),
  input_compliance    numeric(5,4),
  confidence          numeric(5,4),
  component_scores    jsonb NOT NULL DEFAULT '{}',
  computed_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fri_farmer      ON fri_scores(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fri_enrollment  ON fri_scores(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fri_computed    ON fri_scores(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fri_category    ON fri_scores(category);

CREATE TABLE IF NOT EXISTS baseline_assessments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id         uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  farmer_id             uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  agent_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_type             crop_type NOT NULL DEFAULT 'maize',
  growth_stage          integer NOT NULL DEFAULT 0 CHECK (growth_stage >= 0 AND growth_stage <= 10),
  expected_yield_kg_ha  numeric(10,2),
  soil_ph               numeric(4,2),
  irrigation_available  boolean NOT NULL DEFAULT false,
  inputs_used           jsonb NOT NULL DEFAULT '{}',
  photo_urls            text[] NOT NULL DEFAULT '{}',
  assessed_at           timestamptz NOT NULL DEFAULT now(),
  metadata              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_baseline_unique  ON baseline_assessments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_baseline_farmer         ON baseline_assessments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_baseline_agent          ON baseline_assessments(agent_id);

CREATE TABLE IF NOT EXISTS interventions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  enrollment_id  uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  agent_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           intervention_type NOT NULL DEFAULT 'field_advisory',
  description    text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'planned',
  scheduled_at   timestamptz,
  completed_at   timestamptz,
  outcome        text,
  photo_urls     text[] NOT NULL DEFAULT '{}',
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_farmer     ON interventions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_interventions_agent      ON interventions(agent_id);
CREATE INDEX IF NOT EXISTS idx_interventions_enrollment ON interventions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_interventions_type       ON interventions(type);
CREATE INDEX IF NOT EXISTS idx_interventions_status     ON interventions(status);

CREATE TABLE IF NOT EXISTS field_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id    uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  cohort_id     uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  report_type   text NOT NULL DEFAULT 'weekly',
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  content       text NOT NULL DEFAULT '',
  attachments   text[] NOT NULL DEFAULT '{}',
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_agent   ON field_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_program ON field_reports(program_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_cohort  ON field_reports(cohort_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_period  ON field_reports(period_start, period_end);

CREATE TABLE IF NOT EXISTS norvi_outputs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id        uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  farm_id          uuid REFERENCES farm_details(id) ON DELETE SET NULL,
  checkin_id       uuid REFERENCES weekly_checkins(id) ON DELETE SET NULL,
  image_urls       text[] NOT NULL DEFAULT '{}',
  prompt_summary   text,
  diagnosis        text NOT NULL DEFAULT '',
  severity         risk_category NOT NULL DEFAULT 'low',
  recommendations  text[] NOT NULL DEFAULT '{}',
  confidence       numeric(5,4),
  model_version    text NOT NULL DEFAULT '',
  processed_at     timestamptz NOT NULL DEFAULT now(),
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_norvi_farmer    ON norvi_outputs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_norvi_checkin   ON norvi_outputs(checkin_id);
CREATE INDEX IF NOT EXISTS idx_norvi_severity  ON norvi_outputs(severity);
CREATE INDEX IF NOT EXISTS idx_norvi_processed ON norvi_outputs(processed_at DESC);

CREATE TABLE IF NOT EXISTS risk_flags (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id      uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  enrollment_id  uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  flag_type      text NOT NULL DEFAULT '',
  severity       risk_category NOT NULL DEFAULT 'medium',
  description    text NOT NULL DEFAULT '',
  triggered_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  is_resolved    boolean NOT NULL DEFAULT false,
  resolved_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_flags_farmer     ON risk_flags(farmer_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_enrollment ON risk_flags(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_severity   ON risk_flags(severity);
CREATE INDEX IF NOT EXISTS idx_risk_flags_resolved   ON risk_flags(is_resolved);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  table_name  text,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor     ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_table     ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record    ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_logs(created_at DESC);

ALTER TABLE verifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fri_scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE norvi_outputs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
