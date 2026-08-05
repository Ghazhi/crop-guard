
-- Create "Soybeans Kudigona Check-in (12 Weeks)" template
INSERT INTO checkin_templates (id, organisation_id, title, crop_type, season, week_number, description, is_active)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'Soybeans Kudigona Check-in (12 Weeks)',
  'soybean',
  '2026',
  NULL,
  'Weekly check-in template for soybean farmers in Kudigona — 12 weeks',
  true
)
RETURNING id;
