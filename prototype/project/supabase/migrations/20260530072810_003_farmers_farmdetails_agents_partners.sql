/*
  # Core Tables: farmers, farm_details, agents, partners

  1. New Tables
    - `farmers` — primary beneficiary record
      - id, user_id, organisation_id, national_id, full_name, phone, dob, gender,
        region_code, district, community, gps_address, photo_url, biometric_ref,
        total_farm_size_ha, primary_crop, current_fri_score, risk_category,
        is_verified, verified_by, verified_at, metadata
    - `farm_details` — one or more farms per farmer
      - id, farmer_id, name, size_ha, crop_type, region_code, district, community,
        latitude, longitude, polygon_geojson, soil_type, irrigation, metadata
    - `agents` — field agent profiles
      - id (fk users), organisation_id, agent_code, supervisor_id, region_codes,
        districts, is_active, target_farmers, certified_crops
    - `partners` — third-party input/service partners
      - id, organisation_id, name, type, contact_name, contact_phone, contact_email,
        regions, is_active, metadata

  2. Security
    - RLS enabled on all four tables

  3. Indexes
    - farmers: national_id, region_code, full_name (trgm), risk_category
    - farm_details: farmer_id, region_code, crop_type
    - agents: organisation_id, region_codes (GIN), is_active
    - partners: organisation_id, type
*/

-- farmers
CREATE TABLE IF NOT EXISTS farmers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  organisation_id     uuid REFERENCES organisations(id) ON DELETE SET NULL,
  national_id         text NOT NULL,
  full_name           text NOT NULL,
  phone               text NOT NULL DEFAULT '',
  date_of_birth       date,
  gender              gender,
  region_code         region_code NOT NULL,
  district            text NOT NULL DEFAULT '',
  community           text NOT NULL DEFAULT '',
  gps_address         text,
  photo_url           text,
  biometric_ref       text,
  total_farm_size_ha  numeric(8,2) NOT NULL DEFAULT 0,
  primary_crop        crop_type NOT NULL DEFAULT 'maize',
  current_fri_score   integer,
  risk_category       risk_category,
  is_verified         boolean NOT NULL DEFAULT false,
  verified_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at         timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_national_id ON farmers(national_id);
CREATE INDEX IF NOT EXISTS idx_farmers_region      ON farmers(region_code);
CREATE INDEX IF NOT EXISTS idx_farmers_risk        ON farmers(risk_category);
CREATE INDEX IF NOT EXISTS idx_farmers_full_name   ON farmers USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_farmers_org         ON farmers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_farmers_fri         ON farmers(current_fri_score);

-- farm_details
CREATE TABLE IF NOT EXISTS farm_details (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id        uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name             text NOT NULL DEFAULT '',
  size_ha          numeric(8,2) NOT NULL DEFAULT 0,
  crop_type        crop_type NOT NULL DEFAULT 'maize',
  region_code      region_code NOT NULL,
  district         text NOT NULL DEFAULT '',
  community        text NOT NULL DEFAULT '',
  latitude         double precision,
  longitude        double precision,
  polygon_geojson  jsonb,
  soil_type        text,
  irrigation       boolean NOT NULL DEFAULT false,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_details_farmer    ON farm_details(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_details_region    ON farm_details(region_code);
CREATE INDEX IF NOT EXISTS idx_farm_details_crop      ON farm_details(crop_type);

-- agents
CREATE TABLE IF NOT EXISTS agents (
  id               uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organisation_id  uuid REFERENCES organisations(id) ON DELETE SET NULL,
  agent_code       text UNIQUE NOT NULL,
  supervisor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  region_codes     region_code[] NOT NULL DEFAULT '{}',
  districts        text[] NOT NULL DEFAULT '{}',
  is_active        boolean NOT NULL DEFAULT true,
  target_farmers   integer NOT NULL DEFAULT 0,
  certified_crops  crop_type[] NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_org           ON agents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_agents_region_codes  ON agents USING gin(region_codes);
CREATE INDEX IF NOT EXISTS idx_agents_active        ON agents(is_active);

-- partners
CREATE TABLE IF NOT EXISTS partners (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid REFERENCES organisations(id) ON DELETE SET NULL,
  name             text NOT NULL,
  type             text NOT NULL DEFAULT 'input_supplier',
  contact_name     text,
  contact_phone    text,
  contact_email    text,
  regions          region_code[] NOT NULL DEFAULT '{}',
  is_active        boolean NOT NULL DEFAULT true,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_org    ON partners(organisation_id);
CREATE INDEX IF NOT EXISTS idx_partners_type   ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_name   ON partners USING gin(name gin_trgm_ops);

ALTER TABLE farmers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners     ENABLE ROW LEVEL SECURITY;
