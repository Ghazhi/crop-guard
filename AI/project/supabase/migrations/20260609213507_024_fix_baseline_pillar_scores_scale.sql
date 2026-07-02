
-- Baseline pillar scores were incorrectly stored as 0-100 percentages.
-- Convert all week_number=0 rows to absolute scale: P1/P2 = 0-30, P3/P4 = 0-20.
UPDATE farmer_fri_scores
SET
  p1_score = ROUND((p1_score / 100.0) * 30),
  p2_score = ROUND((p2_score / 100.0) * 30),
  p3_score = ROUND((p3_score / 100.0) * 20),
  p4_score = ROUND((p4_score / 100.0) * 20)
WHERE week_number = 0
  AND (p1_score > 30 OR p2_score > 30 OR p3_score > 20 OR p4_score > 20);
