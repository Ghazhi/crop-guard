/*
  # Core Tables: enrollments, weekly_checkins, checkin_activities
*/

CREATE TABLE IF NOT EXISTS enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  program_id          uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  cohort_id           uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  agent_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  status              enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  graduated_at        timestamptz,
  withdrawn_at        timestamptz,
  withdrawal_reason   text,
  notes               text,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_unique ON enrollments(farmer_id, program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_farmer   ON enrollments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_program  ON enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort   ON enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_agent    ON enrollments(agent_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status   ON enrollments(status);

CREATE TABLE IF NOT EXISTS enrollments_opp (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id           uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  farmer_id               uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  product_type            text NOT NULL DEFAULT 'insurance',
  status                  text NOT NULL DEFAULT 'draft',
  coverage_amount_ghs     numeric(12,2),
  premium_ghs             numeric(12,2),
  principal_ghs           numeric(12,2),
  interest_rate           numeric(6,4),
  term_months             integer,
  start_date              date,
  end_date                date,
  policy_number           text UNIQUE,
  loan_number             text UNIQUE,
  disbursed_at            timestamptz,
  due_date                date,
  outstanding_balance_ghs numeric(12,2),
  issued_by               uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata                jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enroll_opp_enrollment ON enrollments_opp(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enroll_opp_farmer     ON enrollments_opp(farmer_id);
CREATE INDEX IF NOT EXISTS idx_enroll_opp_status     ON enrollments_opp(status);
CREATE INDEX IF NOT EXISTS idx_enroll_opp_product    ON enrollments_opp(product_type);

CREATE TABLE IF NOT EXISTS weekly_checkins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  farmer_id      uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  agent_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id      uuid REFERENCES cohorts(id) ON DELETE SET NULL,
  week_number    integer NOT NULL,
  season_week    text NOT NULL DEFAULT '',
  status         checkin_status NOT NULL DEFAULT 'draft',
  submitted_at   timestamptz,
  approved_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at    timestamptz,
  notes          text,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_unique ON weekly_checkins(enrollment_id, week_number);
CREATE INDEX IF NOT EXISTS idx_checkins_enrollment ON weekly_checkins(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_agent      ON weekly_checkins(agent_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status     ON weekly_checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_week       ON weekly_checkins(week_number);

CREATE TABLE IF NOT EXISTS checkin_activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id    uuid NOT NULL REFERENCES weekly_checkins(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT '',
  description   text,
  quantity      numeric(10,2),
  unit          text,
  photo_urls    text[] NOT NULL DEFAULT '{}',
  gps_lat       double precision,
  gps_lng       double precision,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkin_activities_checkin ON checkin_activities(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_activities_type    ON checkin_activities(activity_type);

ALTER TABLE enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments_opp   ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_activities ENABLE ROW LEVEL SECURITY;
