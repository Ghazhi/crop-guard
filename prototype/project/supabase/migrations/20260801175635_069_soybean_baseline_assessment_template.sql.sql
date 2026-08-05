INSERT INTO baseline_templates (
  organisation_id,
  title,
  description,
  crop_type,
  p1_items,
  p2_items,
  p3_items,
  p4_items,
  include_eci,
  eci_items,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Soybean Baseline Assessment',
  'Baseline assessment for soybean farmers covering agronomy readiness, climate-smart agriculture, advisory commitment, farm enterprise discipline, and eligibility compliance.',
  'soybean',
  -- Section A: Agronomy Readiness (30%)
  '[{"id":"soy_farming_experience","max":6,"label":"Farming Experience","guidance":"Years of active soybean farming: 0-1yr=1, 4+yr=2, 7+yr=3, 10+yr=4, 15+yr=5, 20+yr=6"},{"id":"soy_weed_management","max":6,"label":"Weed Management","guidance":"Evidence of systematic weed control across current and prior soybean season"},{"id":"soy_proper_planting","max":6,"label":"Proper Planting","guidance":"Correct spacing, timely planting, variety appropriate for soybean season"},{"id":"soy_fertilizer_use","max":6,"label":"Fertilizer Use","guidance":"Applies fertilizer at correct rate, time, and method — evidence required"},{"id":"soy_pest_disease","max":6,"label":"Pest & Disease Control","guidance":"Active scouting and responsive management of soybean pests and diseases"}]'::jsonb,
  -- Section B: Climate-Smart Agriculture (CSA) Readiness (30%)
  '[{"id":"soy_mulching","max":6,"label":"Mulching","guidance":"Evidence of mulch cover across majority of active soybean farm area"},{"id":"soy_composting","max":6,"label":"Composting","guidance":"Active compost pile or evidence of compost application on soybean farm"},{"id":"soy_crop_rotation","max":6,"label":"Crop Rotation","guidance":"Planned or practiced rotation across at least one prior soybean season"},{"id":"soy_water_harvesting","max":6,"label":"Water Harvesting","guidance":"Physical structures or land management practices to retain rainfall on farm"},{"id":"soy_conservation_till","max":6,"label":"Conservation Tillage","guidance":"Minimal soil disturbance, avoids burning, retains crop residue"}]'::jsonb,
  -- Section C: Advisory & Farmer Commitment (20%)
  '[{"id":"soy_attends_training","max":5,"label":"Attends Training","guidance":"Regular attendance at soybean extension or GAP training in prior season"},{"id":"soy_follows_agronomist","max":5,"label":"Follows Agronomist Advice","guidance":"Can name advice received and demonstrate application on soybean farm"},{"id":"soy_cooperative_visits","max":5,"label":"Cooperative Visits","guidance":"Active attendance at cooperative meetings, not just membership"},{"id":"soy_cooperative_member","max":5,"label":"Cooperative Affiliation","guidance":"Formally registered member of a cooperative or soybean farmer group"}]'::jsonb,
  -- Section D: Farm Enterprise Discipline (20%)
  '[{"id":"soy_repayment_history","max":8,"label":"Repayment History","guidance":"No outstanding unpaid agricultural obligations — agent verifies"},{"id":"soy_savings_habit","max":4,"label":"Savings Habit","guidance":"Active savings account or demonstrated consistent savings practice"},{"id":"soy_additional_income","max":4,"label":"Additional Income","guidance":"Secondary occupation or other verified income beyond soybean crop"},{"id":"soy_offtaker_confirmed","max":4,"label":"Offtaker Confirmed","guidance":"Binary: confirmed offtaker arrangement = 4pts, none = 0pts"}]'::jsonb,
  true,
  -- Section E: Eligibility & Compliance Index (ECI)
  '[{"id":"soy_income_debt","max":8,"label":"Stable Income & Debt Burden","guidance":"Has stable soybean income and no unmanageable debt. Agent checks income sources and existing loan obligations."},{"id":"soy_financial_stability","max":8,"label":"Moderate Financial Stability","guidance":"Owns productive assets or maintains some savings. Agent observes household assets."},{"id":"soy_identity_eligibility","max":8,"label":"Identity and Eligibility","guidance":"Identity confirmed with valid documentation. Farmer meets age, crop, location, acreage program criteria."},{"id":"soy_production_commitment","max":8,"label":"Production Commitment","guidance":"Clear production plan: soybean crop type, farm acreage, program participation confirmed by agent."},{"id":"soy_declaration_consent","max":8,"label":"Declaration and Consent","guidance":"Informed consent form signed or thumb-printed. Farmer understands data collection and use."}]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;