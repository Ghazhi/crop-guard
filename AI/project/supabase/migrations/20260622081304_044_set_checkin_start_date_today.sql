UPDATE cohorts
SET
  checkin_start_date  = '2026-06-22',
  checkin_window_days = 7,
  checkin_grace_days  = 2
WHERE checkin_start_date IS NULL;
