/*
# Add agent verification columns to farmer_checkin_responses + backfill existing verified check-in

## Problem
The agent verification flow writes to four columns (agent_response, evidence_url, verified_at, pillar)
that do not exist on farmer_checkin_responses. As a result, verified check-ins end up with zero
response rows and no FRI score.

## Changes

### 1. New columns on farmer_checkin_responses
- `agent_response` (text) — agent verdict: 'verified' | 'not_verified' | 'under_review'
- `evidence_url`  (text) — public URL of evidence photo
- `verified_at`   (timestamptz) — when the agent verified this row
- `pillar`        (text) — pillar key p1/p2/p3/p4, denormalised for easier querying

### 2. Backfill existing verified check-in (Alice Woode, week 1, agent-only)
- 18 response rows from week-1 template items, all marked verified
- farmer_fri_scores row: total=100, p1=30, p2=30, p3=20, p4=20, zone='Resilience Leader'
  (checkin_id set to NULL because farmer_fri_scores.checkin_id FK references weekly_checkins,
   not farmer_checkins — a pre-existing schema mismatch)
- farmers.current_fri_score updated to 100

### 3. RLS
No new tables; existing policies cover the new columns.

## Idempotent
Column adds use IF NOT EXISTS; backfills check for existing rows first.
*/

-- 1. Add missing columns
ALTER TABLE farmer_checkin_responses
  ADD COLUMN IF NOT EXISTS agent_response text,
  ADD COLUMN IF NOT EXISTS evidence_url  text,
  ADD COLUMN IF NOT EXISTS verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS pillar         text;

-- 2. Backfill response rows for the existing verified check-in
INSERT INTO farmer_checkin_responses (checkin_id, activity_code, pillar, farmer_response, is_flagged, agent_response, verified_at, photo_url)
SELECT
  'f993b9e4-3c44-4e66-8450-de527992cc79',
  cti.activity_code,
  CASE cti.component
    WHEN 'agronomy'            THEN 'p1'
    WHEN 'climate_smart'       THEN 'p2'
    WHEN 'advisory_commitment' THEN 'p3'
    WHEN 'farm_enterprise'     THEN 'p4'
    ELSE 'p1'
  END,
  'yes',
  false,
  'verified',
  '2026-08-01 19:26:05.043+00',
  NULL
FROM checkin_template_items cti
WHERE cti.checkin_template_id = 'bc56e304-8187-4477-a99c-024c843bc6cb'
  AND cti.week_number = 1
  AND cti.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM farmer_checkin_responses fcr
    WHERE fcr.checkin_id = 'f993b9e4-3c44-4e66-8450-de527992cc79'
      AND fcr.activity_code = cti.activity_code
  );

-- 3. Backfill FRI score (checkin_id = NULL due to FK referencing weekly_checkins, not farmer_checkins)
INSERT INTO farmer_fri_scores (
  farmer_id, enrollment_id, checkin_id, organisation_id,
  week_number, total_score, p1_score, p2_score, p3_score, p4_score,
  zone, is_provisional, score_status, crop_type
)
SELECT
  'c6e093d9-c1eb-4911-9656-2699b27f7a5d',
  '9e21719d-eb01-454f-8daa-8aa121b91a94',
  NULL,
  '00000000-0000-0000-0000-000000000001',
  1,
  100, 30, 30, 20, 20,
  'Resilience Leader',
  false,
  'final',
  'cocoa'
WHERE NOT EXISTS (
  SELECT 1 FROM farmer_fri_scores
  WHERE farmer_id = 'c6e093d9-c1eb-4911-9656-2699b27f7a5d'
    AND week_number = 1
);

-- 4. Update farmer's current_fri_score
UPDATE farmers
SET current_fri_score = 100
WHERE id = 'c6e093d9-c1eb-4911-9656-2699b27f7a5d'
  AND current_fri_score IS NULL;
