/*
  # Core Tables: organisations, users, programs, cohorts

  1. New Tables
    - `organisations` — financial institutions and NGO partners
      - id, name, type, country, contact_email, contact_phone, logo_url, is_active, metadata
    - `users` — portal users extending auth.users
      - id (fk auth.users), organisation_id, role, full_name, phone, region_code, gender,
        avatar_url, preferred_language, is_active, last_login_at
    - `programs` — crop-season insurance/credit programs
      - id, organisation_id, name, description, crop_season, crop_types, regions,
        start_date, end_date, target_enrollment, is_active, settings
    - `cohorts` — sub-groups within a program (by region or district)
      - id, program_id, name, region_code, district, agent_id, target_count, is_active

  2. Security
    - RLS enabled on all tables (policies in next migration)

  3. Indexes
    - organisations: name, type
    - users: role, organisation_id, region_code
    - programs: organisation_id, is_active
    - cohorts: program_id, region_code, agent_id
*/

-- organisations
CREATE TABLE IF NOT EXISTS organisations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL DEFAULT 'financial_institution',
  country         text NOT NULL DEFAULT 'GH',
  contact_email   text,
  contact_phone   text,
  logo_url        text,
  is_active       boolean NOT NULL DEFAULT true,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organisations_name ON organisations USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organisations_type ON organisations(type);

-- users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id     uuid REFERENCES organisations(id) ON DELETE SET NULL,
  role                user_role NOT NULL DEFAULT 'farmer',
  full_name           text NOT NULL DEFAULT '',
  phone               text,
  region_code         region_code,
  gender              gender,
  avatar_url          text,
  preferred_language  text NOT NULL DEFAULT 'en',
  is_active           boolean NOT NULL DEFAULT true,
  last_login_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org         ON users(organisation_id);
CREATE INDEX IF NOT EXISTS idx_users_region      ON users(region_code);
CREATE INDEX IF NOT EXISTS idx_users_full_name   ON users USING gin(full_name gin_trgm_ops);

-- programs
CREATE TABLE IF NOT EXISTS programs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  crop_season         text NOT NULL DEFAULT '',
  crop_types          crop_type[] NOT NULL DEFAULT '{}',
  regions             region_code[] NOT NULL DEFAULT '{}',
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  target_enrollment   integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  settings            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_org      ON programs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_programs_active   ON programs(is_active);
CREATE INDEX IF NOT EXISTS idx_programs_name     ON programs USING gin(name gin_trgm_ops);

-- cohorts
CREATE TABLE IF NOT EXISTS cohorts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  region_code     region_code NOT NULL,
  district        text NOT NULL DEFAULT '',
  agent_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  target_count    integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_program ON cohorts(program_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_region  ON cohorts(region_code);
CREATE INDEX IF NOT EXISTS idx_cohorts_agent   ON cohorts(agent_id);

-- RLS (enable; policies in separate migration)
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts       ENABLE ROW LEVEL SECURITY;
