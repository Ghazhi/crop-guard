-- Normalize legacy color-based zone values to proper Resilience zone labels
-- Based on §5.4 score thresholds: 80+ Leader, 60-79 Builder, 40-59 Learner, 0-39 Starter
UPDATE farmer_fri_scores SET zone = 'Resilience Leader'  WHERE total_score >= 80;
UPDATE farmer_fri_scores SET zone = 'Resilience Builder' WHERE total_score >= 60 AND total_score < 80;
UPDATE farmer_fri_scores SET zone = 'Resilience Learner' WHERE total_score >= 40 AND total_score < 60;
UPDATE farmer_fri_scores SET zone = 'Resilience Starter' WHERE total_score < 40;
