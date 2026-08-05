-- ── Communities ─────────────────────────────────────────────
INSERT INTO communities (id, organisation_id, name, region_code, district, nearest_town, socioeconomic_status, income_streams, gps_lat, gps_lng, leader_name, leader_contact)
VALUES
  ('c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Adum','AH','Kumasi Metro','Kumasi','urban',ARRAY['farming','trading'],6.6884,-1.6244,'Nana Owusu','0241111222'),
  ('c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Mamponteng','AH','Kwabre East','Mamponteng','rural',ARRAY['farming','handicraft'],6.7150,-1.5800,'Nana Boateng','0242222333'),
  ('c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Ejisu','AH','Ejisu-Juaben','Ejisu','rural',ARRAY['farming'],6.7050,-1.4750,'Nana Agyeman','0243333444'),
  ('c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Techiman','BA','Techiman','Techiman','urban',ARRAY['farming','trading'],7.5833,-1.9333,'Nana Asare','0244444555'),
  ('c1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Wenchi','BA','Wenchi','Wenchi','rural',ARRAY['farming'],7.7500,-2.1000,'Nana Frimpong','0245555666')
ON CONFLICT (id) DO NOTHING;

-- ── Farmers (18 new + 2 existing = 20 total) ────────────────
INSERT INTO farmers (id, organisation_id, national_id, full_name, phone, gender, region_code, district, community, total_farm_size_ha, primary_crop, is_verified, current_fri_score, risk_category, years_farm_experience, acres_cultivated, owns_tractor, owns_house, marital_status, children_count, is_draft, community_id, program_id, cohort_id_ref)
VALUES
  ('f0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','GHA-0000000003','Kwame Asante','0243333003','male','AH','Ejisu-Juaben','Ejisu',4.5,'maize',true,62,'low',12,11.0,false,true,'married',3,false,'c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','GHA-0000000004','Akosua Frimpong','0243333004','female','AH','Kumasi Metro','Adum',2.0,'maize',true,55,'low',8,5.0,false,false,'married',2,false,'c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','GHA-0000000005','Yaw Boateng','0243333005','male','AH','Kwabre East','Mamponteng',6.0,'maize',false,38,'medium',15,15.0,true,true,'married',4,false,'c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','GHA-0000000006','Abena Owusu','0243333006','female','AH','Ejisu-Juaben','Ejisu',3.0,'maize',true,48,'medium',10,7.5,false,true,'single',1,false,'c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','GHA-0000000007','Kofi Mensah','0243333007','male','BA','Techiman','Techiman',8.0,'maize',true,71,'low',20,20.0,true,true,'married',5,false,'c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','GHA-0000000008','Ama Serwaa','0243333008','female','BA','Techiman','Techiman',2.5,'maize',false,42,'medium',6,6.0,false,false,'married',2,false,'c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','GHA-0000000009','Kwabena Agyeman','0243333009','male','BA','Wenchi','Wenchi',5.5,'maize',true,58,'low',14,13.5,true,true,'married',3,false,'c1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','GHA-0000000010','Adwoa Nyamekye','0243333010','female','BA','Wenchi','Wenchi',1.5,'maize',false,28,'high',5,3.5,false,false,'single',0,false,'c1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','GHA-0000000011','Kojo Asare','0243333011','male','AH','Kumasi Metro','Adum',3.5,'maize',true,65,'low',11,8.5,false,true,'married',4,false,'c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','GHA-0000000012','Esi Darko','0243333012','female','AH','Kwabre East','Mamponteng',2.0,'maize',false,35,'medium',7,5.0,false,false,'married',2,false,'c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','GHA-0000000013','Nana Kwame Tuffuor','0243333013','male','AH','Ejisu-Juaben','Ejisu',7.0,'maize',true,68,'low',18,17.0,true,true,'married',6,false,'c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','GHA-0000000014','Akua Asantewaa','0243333014','female','BA','Techiman','Techiman',3.0,'maize',true,52,'low',9,7.0,false,true,'married',3,false,'c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','GHA-0000000015','Emmanuel Osei','0243333015','male','BA','Wenchi','Wenchi',4.0,'maize',false,45,'medium',10,10.0,false,true,'married',2,false,'c1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-000000000001','GHA-0000000016','Grace Appiah','0243333016','female','AH','Kumasi Metro','Adum',1.0,'maize',false,22,'critical',4,2.5,false,false,'single',1,false,'c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-000000000001','GHA-0000000017','Samuel Adjei','0243333017','male','AH','Ejisu-Juaben','Ejisu',5.0,'maize',true,60,'low',13,12.0,true,true,'married',4,false,'c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-000000000001','GHA-0000000018','Beatrice Acheampong','0243333018','female','BA','Techiman','Techiman',2.5,'maize',false,40,'medium',8,6.0,false,false,'married',3,false,'c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-000000000001','GHA-0000000019','Daniel Owusu-Ansah','0243333019','male','BA','Wenchi','Wenchi',6.0,'maize',true,64,'low',16,14.5,true,true,'married',5,false,'c1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','GHA-0000000020','Linda Aboagye','0243333020','female','AH','Kwabre East','Mamponteng',1.5,'maize',false,25,'high',3,3.5,false,false,'single',0,false,'c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  current_fri_score = EXCLUDED.current_fri_score,
  risk_category = EXCLUDED.risk_category,
  is_verified = EXCLUDED.is_verified;

-- Update existing farmers with FRI scores and risk categories
UPDATE farmers SET current_fri_score = 58, risk_category = 'low', community_id = 'c1000000-0000-0000-0000-000000000001', program_id = '00000000-0000-0000-0000-000000000010', cohort_id_ref = 'c0000000-0000-0000-0000-000000000001' WHERE id = 'f0000000-0000-0000-0000-000000000001';
UPDATE farmers SET current_fri_score = 44, risk_category = 'medium', community_id = 'c1000000-0000-0000-0000-000000000002', program_id = '00000000-0000-0000-0000-000000000010', cohort_id_ref = 'c0000000-0000-0000-0000-000000000001' WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- ── Farm Details ────────────────────────────────────────────
INSERT INTO farm_details (farmer_id, name, size_ha, crop_type, region_code, district, community, soil_type, irrigation, latitude, longitude)
SELECT
  f.id,
  f.full_name || '''s Farm',
  f.total_farm_size_ha,
  f.primary_crop::crop_type,
  f.region_code,
  f.district,
  f.community,
  CASE WHEN random() > 0.5 THEN 'loamy' ELSE 'sandy_loam' END,
  random() > 0.7,
  6.6 + (random() - 0.5) * 0.2,
  -1.6 + (random() - 0.5) * 0.2
FROM farmers f
WHERE NOT EXISTS (SELECT 1 FROM farm_details fd WHERE fd.farmer_id = f.id);

-- ── Enrollments ─────────────────────────────────────────────
INSERT INTO enrollments (farmer_id, program_id, cohort_id, agent_id, status, enrolled_at)
SELECT
  f.id,
  '00000000-0000-0000-0000-000000000010',
  'c0000000-0000-0000-0000-000000000001',
  '7041009c-548c-46c4-bb2b-520274546109',
  CASE
    WHEN f.id IN ('f0000000-0000-0000-0000-000000000016','f0000000-0000-0000-0000-000000000020') THEN 'suspended'::enrollment_status
    WHEN f.id IN ('f0000000-0000-0000-0000-000000000010') THEN 'withdrawn'::enrollment_status
    ELSE 'active'::enrollment_status
  END,
  f.created_at
FROM farmers f
WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.farmer_id = f.id);

-- ── Verifications ──────────────────────────────────────────
INSERT INTO verifications (farmer_id, agent_id, type, status, completed_at, score, notes)
SELECT
  f.id,
  '7041009c-548c-46c4-bb2b-520274546109',
  'kyc',
  CASE WHEN f.is_verified THEN 'completed'::verification_status ELSE 'pending'::verification_status END,
  CASE WHEN f.is_verified THEN f.updated_at ELSE NULL END,
  CASE WHEN f.is_verified THEN 85 + floor(random() * 15)::int ELSE NULL END,
  CASE WHEN f.is_verified THEN 'KYC verified with Ghana Card and farm visit.' ELSE NULL END
FROM farmers f
WHERE NOT EXISTS (SELECT 1 FROM verifications v WHERE v.farmer_id = f.id);

-- ── FRI Scores (fri_scores table) ──────────────────────────
INSERT INTO fri_scores (farmer_id, enrollment_id, score, category, method, rainfall_deviation, soil_moisture_index, pest_pressure, disease_incidence, input_compliance, confidence, component_scores, computed_at)
SELECT
  f.id,
  e.id,
  COALESCE(f.current_fri_score, 40),
  COALESCE(f.risk_category, 'medium'::risk_category),
  'weighted_sum'::fri_method,
  (random() * 20 - 10)::numeric(5,2),
  (0.3 + random() * 0.5)::numeric(5,2),
  (random() * 0.4)::numeric(5,2),
  (random() * 0.3)::numeric(5,2),
  (0.5 + random() * 0.4)::numeric(5,2),
  (0.7 + random() * 0.3)::numeric(5,2),
  jsonb_build_object('rainfall', (random()*20-10)::int, 'soil', (random()*100)::int, 'pest', (random()*40)::int, 'disease', (random()*30)::int, 'compliance', (50+random()*40)::int),
  now() - (random() * 30)::int * interval '1 day'
FROM farmers f
JOIN enrollments e ON e.farmer_id = f.id
WHERE NOT EXISTS (SELECT 1 FROM fri_scores fs WHERE fs.farmer_id = f.id);

-- ── Farmer FRI Scores (farmer_fri_scores table) ─────────────
INSERT INTO farmer_fri_scores (farmer_id, enrollment_id, organisation_id, week_number, total_score, p1_score, p2_score, p3_score, p4_score, eci_score, credit_score, zone, score_status, is_provisional, baseline_score, recommendation, raw_responses, created_at)
SELECT
  f.id,
  e.id,
  '00000000-0000-0000-0000-000000000001',
  (floor(random() * 8) + 1)::int,
  COALESCE(f.current_fri_score, 40)::numeric,
  (COALESCE(f.current_fri_score, 40) - 5 + floor(random() * 10))::numeric,
  (COALESCE(f.current_fri_score, 40) - 3 + floor(random() * 8))::numeric,
  (COALESCE(f.current_fri_score, 40) - 8 + floor(random() * 12))::numeric,
  (COALESCE(f.current_fri_score, 40) + 2 - floor(random() * 6))::numeric,
  (COALESCE(f.current_fri_score, 40) + 5 - floor(random() * 10))::numeric,
  COALESCE(f.current_fri_score, 40) + floor(random() * 20)::int - 10,
  CASE
    WHEN f.current_fri_score >= 60 THEN 'green'
    WHEN f.current_fri_score >= 40 THEN 'yellow'
    WHEN f.current_fri_score >= 25 THEN 'orange'
    ELSE 'red'
  END,
  'final',
  false,
  (COALESCE(f.current_fri_score, 40) - 3)::numeric,
  CASE
    WHEN f.current_fri_score >= 60 THEN 'Maintain current practices. Eligible for credit expansion.'
    WHEN f.current_fri_score >= 40 THEN 'Monitor closely. Consider input support program.'
    WHEN f.current_fri_score >= 25 THEN 'Intervention recommended. Enroll in training program.'
    ELSE 'Critical risk. Immediate field advisory required.'
  END,
  '{}'::jsonb,
  now() - (random() * 30)::int * interval '1 day'
FROM farmers f
JOIN enrollments e ON e.farmer_id = f.id
WHERE f.current_fri_score IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM farmer_fri_scores fs WHERE fs.farmer_id = f.id);

-- ── Farmer Check-ins ───────────────────────────────────────
INSERT INTO farmer_checkins (farmer_id, organisation_id, week_number, status, help_requested, challenge_notes, is_verified, verified_at, verified_by, created_at)
SELECT
  f.id,
  '00000000-0000-0000-0000-000000000001',
  (floor(random() * 4) + 1)::int,
  CASE WHEN random() > 0.15 THEN 'submitted' ELSE 'draft' END,
  random() > 0.7,
  CASE WHEN random() > 0.7 THEN 'Pests observed on maize leaves.' ELSE NULL END,
  random() > 0.5,
  CASE WHEN random() > 0.5 THEN now() - (random() * 14)::int * interval '1 day' ELSE NULL END,
  CASE WHEN random() > 0.5 THEN '7041009c-548c-46c4-bb2b-520274546109'::uuid ELSE NULL END,
  now() - (random() * 21)::int * interval '1 day'
FROM farmers f
WHERE f.id IN (
  SELECT farmer_id FROM enrollments WHERE status = 'active'
)
AND NOT EXISTS (SELECT 1 FROM farmer_checkins fc WHERE fc.farmer_id = f.id)
LIMIT 12;

-- ── Interventions ───────────────────────────────────────────
INSERT INTO interventions (farmer_id, enrollment_id, agent_id, type, description, status, scheduled_at, completed_at, outcome)
SELECT
  f.id,
  e.id,
  '7041009c-548c-46c4-bb2b-520274546109',
  CASE (floor(random() * 4))::int
    WHEN 0 THEN 'field_advisory'::intervention_type
    WHEN 1 THEN 'input_distribution'::intervention_type
    WHEN 2 THEN 'training'::intervention_type
    ELSE 'credit_facilitation'::intervention_type
  END,
  CASE (floor(random() * 4))::int
    WHEN 0 THEN 'Field visit to assess crop health and pest pressure.'
    WHEN 1 THEN 'Distributed improved maize seeds and fertilizer inputs.'
    WHEN 2 THEN 'Training session on climate-smart agriculture practices.'
    ELSE 'Facilitated credit application for farm expansion.'
  END,
  CASE
    WHEN f.current_fri_score < 30 THEN 'completed'
    WHEN f.current_fri_score < 50 THEN 'in_progress'
    ELSE 'planned'
  END,
  now() + (floor(random() * 14))::int * interval '1 day',
  CASE WHEN f.current_fri_score < 30 THEN now() - (floor(random() * 7))::int * interval '1 day' ELSE NULL END,
  CASE WHEN f.current_fri_score < 30 THEN 'Intervention completed successfully. Farmer showing improvement.' ELSE NULL END
FROM farmers f
JOIN enrollments e ON e.farmer_id = f.id
WHERE f.current_fri_score IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM interventions i WHERE i.farmer_id = f.id)
LIMIT 10;
