/*
# Finance Module — Petty Cash, Fund Requests & Team Role

## Summary
Introduces the "team" user role and a complete internal finance management schema:
petty cash accounts, transaction ledger, fund request workflow, and line items.

## New Role
- Adds `team` to the `user_role` enum for internal finance team members.

## New Tables

### 1. petty_cash_accounts
Stores petty cash fund registers per organisation.
- id, organisation_id, name, description, balance (auto-maintained), currency, is_active, created_by, created_at, updated_at

### 2. petty_cash_transactions
Individual income or expense entries recorded against a petty cash account.
- id, account_id, organisation_id, type (income | expense), category, description, amount, receipt_url, transaction_date, recorded_by, notes, created_at, updated_at

### 3. fund_requests
Requests for funds submitted by team members, moving through an approval workflow.
- id, organisation_id, title, description, requested_by, total_amount, currency
- status: draft → pending → approved | rejected → paid
- priority: low | medium | high | urgent
- purpose_category, needed_by_date, approved_by, approved_at, rejection_reason, paid_at, payment_reference, notes

### 4. fund_request_items
Line-item breakdown for each fund request.
- id, request_id, description, quantity, unit_cost
- total_cost (generated column = quantity × unit_cost)

## Security (RLS)
- All four tables have RLS enabled.
- All authenticated users in the same organisation can read, create, and update records
  (scoped by organisation_id extracted from JWT app_metadata).
- Deletes similarly scoped to same-org authenticated users.
- fund_request_items policies check parent fund_requests for org membership.

## Notes
- balance column on petty_cash_accounts is updated at the application layer after each transaction.
- total_cost on fund_request_items is a GENERATED ALWAYS AS (stored) computed column.
*/

-- Add team role to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'team';

-- ── petty_cash_accounts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS petty_cash_accounts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  balance         numeric(12,2) NOT NULL DEFAULT 0,
  currency        text        NOT NULL DEFAULT 'GHS',
  is_active       boolean     NOT NULL DEFAULT true,
  created_by      uuid        REFERENCES users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_accounts_org ON petty_cash_accounts(organisation_id);

ALTER TABLE petty_cash_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_petty_cash_accounts" ON petty_cash_accounts;
CREATE POLICY "org_select_petty_cash_accounts" ON petty_cash_accounts FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_insert_petty_cash_accounts" ON petty_cash_accounts;
CREATE POLICY "org_insert_petty_cash_accounts" ON petty_cash_accounts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_update_petty_cash_accounts" ON petty_cash_accounts;
CREATE POLICY "org_update_petty_cash_accounts" ON petty_cash_accounts FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_delete_petty_cash_accounts" ON petty_cash_accounts;
CREATE POLICY "org_delete_petty_cash_accounts" ON petty_cash_accounts FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

-- ── petty_cash_transactions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid        NOT NULL REFERENCES petty_cash_accounts(id) ON DELETE CASCADE,
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  type             text        NOT NULL CHECK (type IN ('income', 'expense')),
  category         text        NOT NULL,
  description      text        NOT NULL,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  receipt_url      text,
  transaction_date date        NOT NULL DEFAULT CURRENT_DATE,
  recorded_by      uuid        REFERENCES users(id),
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_account ON petty_cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_org     ON petty_cash_transactions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_date    ON petty_cash_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_tx_type    ON petty_cash_transactions(type);

ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_petty_cash_tx" ON petty_cash_transactions;
CREATE POLICY "org_select_petty_cash_tx" ON petty_cash_transactions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_insert_petty_cash_tx" ON petty_cash_transactions;
CREATE POLICY "org_insert_petty_cash_tx" ON petty_cash_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_update_petty_cash_tx" ON petty_cash_transactions;
CREATE POLICY "org_update_petty_cash_tx" ON petty_cash_transactions FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_delete_petty_cash_tx" ON petty_cash_transactions;
CREATE POLICY "org_delete_petty_cash_tx" ON petty_cash_transactions FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

-- ── fund_requests ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fund_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  requested_by      uuid        REFERENCES users(id),
  total_amount      numeric(12,2) NOT NULL DEFAULT 0,
  currency          text        NOT NULL DEFAULT 'GHS',
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid')),
  priority          text        NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  purpose_category  text        NOT NULL DEFAULT 'general',
  needed_by_date    date,
  approved_by       uuid        REFERENCES users(id),
  approved_at       timestamptz,
  rejection_reason  text,
  paid_at           timestamptz,
  payment_reference text,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_requests_org    ON fund_requests(organisation_id);
CREATE INDEX IF NOT EXISTS idx_fund_requests_status ON fund_requests(status);
CREATE INDEX IF NOT EXISTS idx_fund_requests_by     ON fund_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_fund_requests_date   ON fund_requests(created_at DESC);

ALTER TABLE fund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_fund_requests" ON fund_requests;
CREATE POLICY "org_select_fund_requests" ON fund_requests FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_insert_fund_requests" ON fund_requests;
CREATE POLICY "org_insert_fund_requests" ON fund_requests FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_update_fund_requests" ON fund_requests;
CREATE POLICY "org_update_fund_requests" ON fund_requests FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

DROP POLICY IF EXISTS "org_delete_fund_requests" ON fund_requests;
CREATE POLICY "org_delete_fund_requests" ON fund_requests FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = organisation_id);

-- ── fund_request_items ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fund_request_items (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid          NOT NULL REFERENCES fund_requests(id) ON DELETE CASCADE,
  description text          NOT NULL,
  quantity    numeric(10,2) NOT NULL DEFAULT 1,
  unit_cost   numeric(12,2) NOT NULL DEFAULT 0,
  total_cost  numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at  timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_request_items_req ON fund_request_items(request_id);

ALTER TABLE fund_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_fund_request_items" ON fund_request_items;
CREATE POLICY "org_select_fund_request_items" ON fund_request_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fund_requests fr
      WHERE fr.id = fund_request_items.request_id
        AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = fr.organisation_id
    )
  );

DROP POLICY IF EXISTS "org_insert_fund_request_items" ON fund_request_items;
CREATE POLICY "org_insert_fund_request_items" ON fund_request_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fund_requests fr
      WHERE fr.id = fund_request_items.request_id
        AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = fr.organisation_id
    )
  );

DROP POLICY IF EXISTS "org_update_fund_request_items" ON fund_request_items;
CREATE POLICY "org_update_fund_request_items" ON fund_request_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fund_requests fr
      WHERE fr.id = fund_request_items.request_id
        AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = fr.organisation_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fund_requests fr
      WHERE fr.id = fund_request_items.request_id
        AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = fr.organisation_id
    )
  );

DROP POLICY IF EXISTS "org_delete_fund_request_items" ON fund_request_items;
CREATE POLICY "org_delete_fund_request_items" ON fund_request_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fund_requests fr
      WHERE fr.id = fund_request_items.request_id
        AND (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid = fr.organisation_id
    )
  );
