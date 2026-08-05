ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS training_start_date date,
  ADD COLUMN IF NOT EXISTS training_window_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS training_grace_days  integer NOT NULL DEFAULT 2;
