/*
  # Seed demo farmer records and link to auth users
*/

-- Seed two demo farmer records
INSERT INTO farmers (id, organisation_id, national_id, full_name, phone, gender, region_code, district, community, primary_crop, total_farm_size_ha, is_verified)
VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'GHA-0000000001',
    'Ama Mensah',
    '0241234567',
    'female',
    'AH',
    'Kumasi Metro',
    'Adum',
    'maize',
    2.5,
    true
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'GHA-0000000002',
    'Ama Konadu',
    '0551234568',
    'female',
    'AH',
    'Kwabre East',
    'Mamponteng',
    'maize',
    3.0,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Link farmer auth users to farmer records by phone
DO $$
DECLARE
  r RECORD;
  farmer_id_found uuid;
BEGIN
  FOR r IN
    SELECT id, raw_user_meta_data->>'phone' AS phone
    FROM auth.users
    WHERE raw_user_meta_data->>'role' = 'farmer'
      AND raw_user_meta_data->>'phone' IS NOT NULL
  LOOP
    SELECT id INTO farmer_id_found FROM farmers WHERE phone = r.phone LIMIT 1;
    IF farmer_id_found IS NOT NULL THEN
      UPDATE farmers SET user_id = r.id WHERE id = farmer_id_found AND (user_id IS NULL OR user_id != r.id);
    END IF;
  END LOOP;
END $$;

-- Seed agent profile rows for the two agent auth users
INSERT INTO agents (id, organisation_id, agent_code, region_codes, districts, is_active, target_farmers)
SELECT
  u.id,
  u.organisation_id,
  'AGT-' || UPPER(SUBSTRING(u.id::text, 1, 6)),
  ARRAY['AH']::region_code[],
  ARRAY['Kumasi Metro', 'Kwabre East'],
  true,
  50
FROM users u
WHERE u.role = 'agent'
  AND u.organisation_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (id) DO NOTHING;

-- Seed a demo cohort
INSERT INTO cohorts (id, program_id, name, region_code, district, target_count, is_active)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Kumasi Cohort A',
  'AH',
  'Kumasi Metro',
  100,
  true
)
ON CONFLICT (id) DO NOTHING;
