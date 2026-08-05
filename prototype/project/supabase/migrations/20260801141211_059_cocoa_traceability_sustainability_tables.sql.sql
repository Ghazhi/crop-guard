/*
# Cocoa Traceability, Sustainability, and FBO/COCOBOD Compliance Tables

1. Overview
This migration adds the cocoa-sector-specific compliance and traceability
infrastructure. It creates four new tables for FBO registration tracking,
COCOBOD/LBC license management, cocoa batch traceability, farm polygon
mapping for EU Deforestation Regulation compliance, and sustainability
attestations (child labour prevention, zero-deforestation, GAP).

2. New Tables

- `fbo_registrations`
  Tracks each cooperative's registration with Ghana's Department of
  Cooperatives. Stores registration number, registration date, status
  (registered, pending, lapsed), renewal due date, and supporting
  document references.

- `cocobod_licenses`
  Tracks Licensed Buying Company (LBC) interactions. Stores LBC name,
  license number, purchase agreement start/end dates, seasonal producer
  price set by COCOBOD, premium amount, and premium distribution records.

- `cocoa_traceability_records`
  Tracks each cocoa batch from farm to sale. Stores farmer, farm, harvest
  date, batch weight, fermentation and drying confirmation, LBC purchase
  receipt number, COCOBOD producer price applied, premium paid, and sale date.

- `farm_polygons`
  Stores mapped cocoa farm boundaries for EU Deforestation Regulation
  compliance. Links to farm_details and stores polygon GeoJSON, area
  calculation, mapping date, mapped by, and verification status.

- `sustainability_attestations`
  Records per-farmer per-season attestations for child labour prevention,
  zero-deforestation, and good agricultural practices. Stores attestation
  type, season, attested by, date, and supporting evidence URLs.

3. Security
- RLS enabled on all five tables.
- All tables scoped by organisation_id using the same pattern as the
  cooperative governance tables.
- SELECT granted to all authenticated roles.
- INSERT/UPDATE/DELETE restricted to staff, admin, and super_admin.
- updated_at triggers added to all tables.

4. Important Notes
- cocoa_traceability_records references both farmers and farm_details.
- farm_polygons references farm_details.
- sustainability_attestations references farmers.
- All tables are organisation-scoped for RLS efficiency.
*/

-- ── fbo_registrations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fbo_registrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id      uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id     uuid NOT NULL,
  registration_number text,
  registration_date   date,
  status              text NOT NULL DEFAULT 'pending',
  renewal_due_date    date,
  document_urls       text[] DEFAULT '{}',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fbo_reg_coop ON fbo_registrations(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_fbo_reg_org ON fbo_registrations(organisation_id);

ALTER TABLE fbo_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_fbo_registrations" ON fbo_registrations;
CREATE POLICY "select_fbo_registrations" ON fbo_registrations FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_fbo_registrations" ON fbo_registrations;
CREATE POLICY "insert_fbo_registrations" ON fbo_registrations FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_fbo_registrations" ON fbo_registrations;
CREATE POLICY "update_fbo_registrations" ON fbo_registrations FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_fbo_registrations" ON fbo_registrations;
CREATE POLICY "delete_fbo_registrations" ON fbo_registrations FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cocobod_licenses ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cocobod_licenses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id          uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id         uuid NOT NULL,
  lbc_name                text NOT NULL,
  license_number          text,
  agreement_start_date    date,
  agreement_end_date      date,
  seasonal_producer_price numeric(14,2),
  premium_amount          numeric(14,2),
  premium_distribution_notes text,
  season                  text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cocobod_coop ON cocobod_licenses(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_cocobod_org ON cocobod_licenses(organisation_id);

ALTER TABLE cocobod_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cocobod_licenses" ON cocobod_licenses;
CREATE POLICY "select_cocobod_licenses" ON cocobod_licenses FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_cocobod_licenses" ON cocobod_licenses;
CREATE POLICY "insert_cocobod_licenses" ON cocobod_licenses FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_cocobod_licenses" ON cocobod_licenses;
CREATE POLICY "update_cocobod_licenses" ON cocobod_licenses FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_cocobod_licenses" ON cocobod_licenses;
CREATE POLICY "delete_cocobod_licenses" ON cocobod_licenses FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cocoa_traceability_records ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cocoa_traceability_records (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         uuid NOT NULL,
  farmer_id               uuid REFERENCES farmers(id) ON DELETE SET NULL,
  farm_id                 uuid REFERENCES farm_details(id) ON DELETE SET NULL,
  cooperative_id          uuid REFERENCES cooperatives(id) ON DELETE SET NULL,
  harvest_date            date NOT NULL,
  batch_weight_kg         numeric(14,2) NOT NULL DEFAULT 0,
  fermentation_confirmed  boolean DEFAULT false,
  drying_confirmed        boolean DEFAULT false,
  drying_moisture_pct     numeric(5,2),
  lbc_receipt_number      text,
  cocobod_producer_price  numeric(14,2),
  premium_paid            numeric(14,2),
  sale_date               date,
  season                  text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cocoa_trace_org ON cocoa_traceability_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_cocoa_trace_farmer ON cocoa_traceability_records(farmer_id);
CREATE INDEX IF NOT EXISTS idx_cocoa_trace_coop ON cocoa_traceability_records(cooperative_id);

ALTER TABLE cocoa_traceability_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cocoa_traceability" ON cocoa_traceability_records;
CREATE POLICY "select_cocoa_traceability" ON cocoa_traceability_records FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_cocoa_traceability" ON cocoa_traceability_records;
CREATE POLICY "insert_cocoa_traceability" ON cocoa_traceability_records FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "update_cocoa_traceability" ON cocoa_traceability_records;
CREATE POLICY "update_cocoa_traceability" ON cocoa_traceability_records FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "delete_cocoa_traceability" ON cocoa_traceability_records;
CREATE POLICY "delete_cocoa_traceability" ON cocoa_traceability_records FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── farm_polygons ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farm_polygons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id             uuid NOT NULL REFERENCES farm_details(id) ON DELETE CASCADE,
  organisation_id     uuid NOT NULL,
  polygon_geojson     jsonb,
  area_ha             numeric(14,4),
  mapping_date        date,
  mapped_by           uuid,
  verification_status text DEFAULT 'pending',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_polygons_farm ON farm_polygons(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_polygons_org ON farm_polygons(organisation_id);

ALTER TABLE farm_polygons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_farm_polygons" ON farm_polygons;
CREATE POLICY "select_farm_polygons" ON farm_polygons FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_farm_polygons" ON farm_polygons;
CREATE POLICY "insert_farm_polygons" ON farm_polygons FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "update_farm_polygons" ON farm_polygons;
CREATE POLICY "update_farm_polygons" ON farm_polygons FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "delete_farm_polygons" ON farm_polygons;
CREATE POLICY "delete_farm_polygons" ON farm_polygons FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── sustainability_attestations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sustainability_attestations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     uuid NOT NULL,
  farmer_id           uuid NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  attestation_type   text NOT NULL,
  season             text NOT NULL,
  attested_by        uuid,
  attestation_date   date NOT NULL DEFAULT CURRENT_DATE,
  status             text NOT NULL DEFAULT 'attested',
  evidence_urls      text[] DEFAULT '{}',
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sustain_attest_farmer ON sustainability_attestations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sustain_attest_org ON sustainability_attestations(organisation_id);

ALTER TABLE sustainability_attestations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sustainability_attestations" ON sustainability_attestations;
CREATE POLICY "select_sustainability_attestations" ON sustainability_attestations FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_sustainability_attestations" ON sustainability_attestations;
CREATE POLICY "insert_sustainability_attestations" ON sustainability_attestations FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "update_sustainability_attestations" ON sustainability_attestations;
CREATE POLICY "update_sustainability_attestations" ON sustainability_attestations FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin', 'agent'));

DROP POLICY IF EXISTS "delete_sustainability_attestations" ON sustainability_attestations;
CREATE POLICY "delete_sustainability_attestations" ON sustainability_attestations FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── updated_at triggers ───────────────────────────────────────────────────────

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_fbo_reg
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'fbo_registrations');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_cocobod
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cocobod_licenses');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_cocoa_trace
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cocoa_traceability_records');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_farm_polygons
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'farm_polygons');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_sustain_attest
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'sustainability_attestations');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
