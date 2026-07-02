
ALTER TABLE baseline_assessments
  ADD COLUMN IF NOT EXISTS p1           jsonb         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS p2           jsonb         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS p3           jsonb         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS p4           jsonb         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eci          jsonb         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_score  integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone         text          NOT NULL DEFAULT 'Resilience Starter';
