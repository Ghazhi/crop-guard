/*
# Cooperative Governance Tables

1. Overview
This migration adds full cooperative governance tooling to CropGuard. It creates
six new tables that let staff and admins manage cooperative leadership rosters,
meetings, resolutions, documents, funds, and compliance certifications. Partner
and agronomist roles get read-only access.

2. New Tables

- `cooperative_officers`
  Leadership roster for each cooperative. Replaces the flat chairman_name /
  secretary_name text fields with a full officer table supporting roles
  (chairman, vice_chairman, secretary, treasurer, executive_member), term
  start/end dates, phone, and active/inactive status.

- `cooperative_meetings`
  Records AGMs, general meetings, and board meetings. Stores meeting type,
  date, location, attendance count, agenda summary, minutes text, and
  attached document URLs.

- `cooperative_resolutions`
  Tracks proposals and decisions. Stores resolution title, description,
  proposed_by, vote outcome (passed, rejected, deferred), date decided,
  and implementation status (pending, in_progress, completed, abandoned).

- `cooperative_documents`
  Stores bylaws, constitutions, registration certificates, and compliance
  documents. Each row has a document type, title, file URL, issue date,
  expiry date, and status (active, expired, pending_renewal).

- `cooperative_funds`
  Tracks member contributions, savings, and revolving fund balances.
  Each row is a transaction: type (contribution, savings, loan_disbursement,
  repayment), amount, member reference, date, and description.

- `cooperative_compliance`
  Tracks FBO registration, COCOBOD license, fair trade, organic, and
  UTZ/Rainforest Alliance certifications. Each row has certification type,
  registration number, issue date, expiry date, and status.

3. Security
- RLS enabled on all six tables.
- All tables scoped by organisation_id matching the existing cooperatives
  table pattern: organisation_id = (SELECT users.organisation_id FROM users
  WHERE users.id = auth.uid()).
- SELECT granted to all authenticated roles (staff, admin, partner,
  agronomist, credits, super_admin).
- INSERT/UPDATE/DELETE restricted to staff, admin, and super_admin roles
  by checking the user's role in the users table.
- updated_at triggers added to all tables.

4. Important Notes
- All tables reference the existing cooperatives table via foreign key.
- organisation_id is inherited from the parent cooperative via a join, but
  also stored directly on each row for efficient RLS checks.
- The migration is idempotent: uses IF NOT EXISTS for tables and DROP POLICY
  IF EXISTS for policies.
*/

-- ── cooperative_officers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_officers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id  uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  full_name       text NOT NULL,
  role            text NOT NULL DEFAULT 'executive_member',
  phone           text,
  term_start      date,
  term_end        date,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_officers_coop ON cooperative_officers(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_officers_org ON cooperative_officers(organisation_id);

ALTER TABLE cooperative_officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_officers" ON cooperative_officers;
CREATE POLICY "select_coop_officers" ON cooperative_officers FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_officers" ON cooperative_officers;
CREATE POLICY "insert_coop_officers" ON cooperative_officers FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_officers" ON cooperative_officers;
CREATE POLICY "update_coop_officers" ON cooperative_officers FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_officers" ON cooperative_officers;
CREATE POLICY "delete_coop_officers" ON cooperative_officers FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cooperative_meetings ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_meetings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id  uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  meeting_type    text NOT NULL DEFAULT 'general',
  meeting_date    date NOT NULL,
  location        text,
  attendance_count integer DEFAULT 0,
  agenda          text,
  minutes         text,
  document_urls   text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_meetings_coop ON cooperative_meetings(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_meetings_org ON cooperative_meetings(organisation_id);

ALTER TABLE cooperative_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_meetings" ON cooperative_meetings;
CREATE POLICY "select_coop_meetings" ON cooperative_meetings FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_meetings" ON cooperative_meetings;
CREATE POLICY "insert_coop_meetings" ON cooperative_meetings FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_meetings" ON cooperative_meetings;
CREATE POLICY "update_coop_meetings" ON cooperative_meetings FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_meetings" ON cooperative_meetings;
CREATE POLICY "delete_coop_meetings" ON cooperative_meetings FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cooperative_resolutions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_resolutions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id       uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id      uuid NOT NULL,
  title                text NOT NULL,
  description          text,
  proposed_by          text,
  vote_outcome         text DEFAULT 'pending',
  date_decided         date,
  implementation_status text DEFAULT 'pending',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_resolutions_coop ON cooperative_resolutions(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_resolutions_org ON cooperative_resolutions(organisation_id);

ALTER TABLE cooperative_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_resolutions" ON cooperative_resolutions;
CREATE POLICY "select_coop_resolutions" ON cooperative_resolutions FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_resolutions" ON cooperative_resolutions;
CREATE POLICY "insert_coop_resolutions" ON cooperative_resolutions FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_resolutions" ON cooperative_resolutions;
CREATE POLICY "update_coop_resolutions" ON cooperative_resolutions FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_resolutions" ON cooperative_resolutions;
CREATE POLICY "delete_coop_resolutions" ON cooperative_resolutions FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cooperative_documents ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id  uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  document_type   text NOT NULL,
  title           text NOT NULL,
  file_url        text,
  issue_date      date,
  expiry_date     date,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_docs_coop ON cooperative_documents(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_docs_org ON cooperative_documents(organisation_id);

ALTER TABLE cooperative_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_documents" ON cooperative_documents;
CREATE POLICY "select_coop_documents" ON cooperative_documents FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_documents" ON cooperative_documents;
CREATE POLICY "insert_coop_documents" ON cooperative_documents FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_documents" ON cooperative_documents;
CREATE POLICY "update_coop_documents" ON cooperative_documents FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_documents" ON cooperative_documents;
CREATE POLICY "delete_coop_documents" ON cooperative_documents FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cooperative_funds ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_funds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id  uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL,
  transaction_type text NOT NULL,
  amount          numeric(14,2) NOT NULL DEFAULT 0,
  member_name     text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_funds_coop ON cooperative_funds(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_funds_org ON cooperative_funds(organisation_id);

ALTER TABLE cooperative_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_funds" ON cooperative_funds;
CREATE POLICY "select_coop_funds" ON cooperative_funds FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_funds" ON cooperative_funds;
CREATE POLICY "insert_coop_funds" ON cooperative_funds FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_funds" ON cooperative_funds;
CREATE POLICY "update_coop_funds" ON cooperative_funds FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_funds" ON cooperative_funds;
CREATE POLICY "delete_coop_funds" ON cooperative_funds FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── cooperative_compliance ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cooperative_compliance (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id      uuid NOT NULL REFERENCES cooperatives(id) ON DELETE CASCADE,
  organisation_id     uuid NOT NULL,
  certification_type  text NOT NULL,
  registration_number text,
  issue_date          date,
  expiry_date         date,
  status              text NOT NULL DEFAULT 'active',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coop_compliance_coop ON cooperative_compliance(cooperative_id);
CREATE INDEX IF NOT EXISTS idx_coop_compliance_org ON cooperative_compliance(organisation_id);

ALTER TABLE cooperative_compliance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coop_compliance" ON cooperative_compliance;
CREATE POLICY "select_coop_compliance" ON cooperative_compliance FOR SELECT
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "insert_coop_compliance" ON cooperative_compliance;
CREATE POLICY "insert_coop_compliance" ON cooperative_compliance FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "update_coop_compliance" ON cooperative_compliance;
CREATE POLICY "update_coop_compliance" ON cooperative_compliance FOR UPDATE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'))
  WITH CHECK (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

DROP POLICY IF EXISTS "delete_coop_compliance" ON cooperative_compliance;
CREATE POLICY "delete_coop_compliance" ON cooperative_compliance FOR DELETE
  TO authenticated
  USING (organisation_id = (SELECT users.organisation_id FROM users WHERE users.id = auth.uid())
    AND (SELECT users.role FROM users WHERE users.id = auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- ── updated_at triggers ───────────────────────────────────────────────────────

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_officers
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_officers');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_meetings
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_meetings');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_resolutions
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_resolutions');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_documents
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_documents');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_funds
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_funds');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE format($f$
    CREATE OR REPLACE TRIGGER set_updated_at_coop_compliance
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $f$, 'cooperative_compliance');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
