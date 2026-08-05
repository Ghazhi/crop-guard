
-- All 12 weeks of items for "Soybeans Kudigona Check-in (12 Weeks)"
-- Week 1 content sourced from uploaded template image
-- Weeks 2-12 adapted from existing soybean template + post-harvest week added
DO $$
DECLARE
  tmpl_id uuid := 'c28feafa-d771-40b1-a472-42cf41a5d8e3';
BEGIN

-- ===================== WEEK 1: Land Preparation & Soil Health =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w1_agr_1', 'Site selection', 'I selected a site with loamy or sand-loamy soil and avoided clay soil for my soybean farm.', 1, 0, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_2', 'Manure application', 'I spread manure evenly for soil nutrients and to improve structure.', 1, 1, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_3', 'Minimum tillage', 'I used zero or minimum tillage to conserve the soil and reduce erosion.', 1, 2, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_4', 'Lining and pegging', 'I lined and pegged my farm to maintain proper plant distance (45cm x 5–10cm).', 1, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_1', 'Organic matter incorporation', 'I incorporated organic matter or compost into the soil to improve fertility.', 1, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_2', 'No burning', 'I avoided burning vegetation or crop residues on my soybean farm.', 1, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_3', 'Drainage site choice', 'I chose a site that avoids waterlogging, as soybeans are sensitive to excess moisture.', 1, 6, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_4', 'Soil conservation', 'I used soil conservation practices (minimum tillage) to protect the soil structure.', 1, 7, true),
  (tmpl_id, 'advisory_commitment', 'soy_w1_adv_1', 'Land preparation guidance', 'I received land preparation guidance from the field agronomist.', 1, 8, true),
  (tmpl_id, 'farm_enterprise', 'soy_w1_ent_1', 'Verified farm area', 'I prepared only the verified/registered farm area for planting.', 1, 9, true);

-- ===================== WEEK 2: Planting & Spacing =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w2_agr_1', 'Certified seed used', 'Is the farmer using certified or improved soybean variety seed?', 2, 0, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_2', 'Correct row spacing observed', 'Is row spacing within the recommended range (45–60 cm)?', 2, 1, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_3', 'Seed rate correct', 'Is the seeding rate within the recommended range (60–80 kg/ha)?', 2, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w2_csa_1', 'Planting aligned to forecast', 'Was planting timed to coincide with the onset of reliable rains?', 2, 3, true),
  (tmpl_id, 'advisory_commitment', 'soy_w2_adv_1', 'Followed planting advisory', 'Did the farmer follow the recommended soybean planting guidance?', 2, 4, true),
  (tmpl_id, 'farm_enterprise', 'soy_w2_ent_1', 'Inputs procured on time', 'Were all required inputs available at planting time?', 2, 5, true);

-- ===================== WEEK 3: Germination & Early Growth =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w3_agr_1', 'Germination rate satisfactory', 'Has germination reached at least 80% of planted stands?', 3, 0, true),
  (tmpl_id, 'agronomy', 'soy_w3_agr_2', 'Replanting of gaps done', 'Have gaps been replanted promptly?', 3, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w3_csa_1', 'Soil moisture adequate', 'Is soil moisture sufficient for early seedling establishment?', 3, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w3_adv_1', 'Early visit completed', 'Has the agent conducted a field visit to confirm stand establishment?', 3, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w3_ent_1', 'Labour for replanting sourced', 'Was labour available promptly for gap filling?', 3, 4, true);

-- ===================== WEEK 4: Weed Management =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w4_agr_1', 'First weeding completed', 'Has the plot been weeded at the V1–V3 growth stage?', 4, 0, true),
  (tmpl_id, 'agronomy', 'soy_w4_agr_2', 'Herbicide applied correctly', 'If herbicide was used, was the correct product applied at the right rate?', 4, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w4_csa_1', 'Mulching applied', 'Has the farmer applied mulch to conserve moisture and suppress weeds?', 4, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w4_adv_1', 'Weed scouting done with agent', 'Did the farmer and agent conduct a joint weed assessment?', 4, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w4_ent_1', 'Weeding cost recorded', 'Has the cost of weeding (labour + herbicide) been recorded?', 4, 4, true);

-- ===================== WEEK 5: Pest & Disease Scouting =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w5_agr_1', 'Soybean aphid scouted', 'Has the farmer checked for aphid infestations (threshold: >250/plant)?', 5, 0, true),
  (tmpl_id, 'agronomy', 'soy_w5_agr_2', 'Appropriate pest control used', 'If pests are detected, was the recommended control measure applied?', 5, 1, true),
  (tmpl_id, 'agronomy', 'soy_w5_agr_3', 'Bacterial pustule / rust checked', 'Are any foliar disease symptoms (bacterial pustule, Asian soybean rust) visible?', 5, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w5_csa_1', 'Field hygiene maintained', 'Has the farmer removed and destroyed heavily infected plant material?', 5, 3, true),
  (tmpl_id, 'advisory_commitment', 'soy_w5_adv_1', 'Pest report submitted to agent', 'Has the farmer reported any pest/disease outbreaks to the agent?', 5, 4, true),
  (tmpl_id, 'farm_enterprise', 'soy_w5_ent_1', 'Pest control cost recorded', 'Have the costs of pest and disease management been recorded?', 5, 5, true);

-- ===================== WEEK 6: Flowering & Nodule Development =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w6_agr_1', 'Flowering commenced', 'Has the crop reached the R1 (first flower) growth stage?', 6, 0, true),
  (tmpl_id, 'agronomy', 'soy_w6_agr_2', 'Nodule development assessed', 'Are effective (pink/red interior) nodules present on roots?', 6, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w6_csa_1', 'Moisture stress managed', 'Is the farmer managing moisture during the critical flowering period?', 6, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w6_adv_1', 'Flowering progress reported', 'Has the farmer updated the agent on crop flowering progress?', 6, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w6_ent_1', 'Yield estimation started', 'Has the farmer begun a preliminary yield estimate based on flower set?', 6, 4, true);

-- ===================== WEEK 7: Pod Setting =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w7_agr_1', 'Pod set uniform', 'Are pods setting uniformly across the plot (R3–R4 stage)?', 7, 0, true),
  (tmpl_id, 'agronomy', 'soy_w7_agr_2', 'Pod borers scouted', 'Has the farmer checked for pod-boring insects?', 7, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w7_csa_1', 'Drought stress mitigated', 'Is the farmer managing any drought stress during pod set?', 7, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w7_adv_1', 'Pod-set advisory received', 'Has the agent provided guidance on managing the pod-set period?', 7, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w7_ent_1', 'Labour plan for harvest prepared', 'Has the farmer planned labour requirements for the upcoming harvest?', 7, 4, true);

-- ===================== WEEK 8: Grain Fill =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w8_agr_1', 'Grain fill satisfactory', 'Are seeds developing fully within pods (R5–R6 stage)?', 8, 0, true),
  (tmpl_id, 'agronomy', 'soy_w8_agr_2', 'Late-season disease checked', 'Has the farmer scouted for late-season foliar diseases?', 8, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w8_csa_1', 'Water stress managed', 'Is the farmer managing water or heat stress during grain fill?', 8, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w8_adv_1', 'Grain fill advisory received', 'Has the agent provided guidance on managing the grain-fill period?', 8, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w8_ent_1', 'Input expenditure updated', 'Has total input expenditure been updated in farm records?', 8, 4, true);

-- ===================== WEEK 9: Pre-Harvest Assessment =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w9_agr_1', 'Crop maturity assessed', 'Has the farmer checked pod colour and leaf senescence (R7–R8 stage)?', 9, 0, true),
  (tmpl_id, 'agronomy', 'soy_w9_agr_2', 'Field drying underway', 'Is the crop field-drying adequately before harvest?', 9, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w9_csa_1', 'Harvest timing adjusted for weather', 'Is the farmer adjusting harvest timing based on weather forecast?', 9, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w9_adv_1', 'Harvest date confirmed with agent', 'Has the farmer confirmed the harvest date with the agent?', 9, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w9_ent_1', 'Market arrangements made', 'Has the farmer identified a buyer or market channel for the harvest?', 9, 4, true);

-- ===================== WEEK 10: Harvesting =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w10_agr_1', 'Harvest method appropriate', 'Is the farmer using the correct harvesting method to minimise pod shatter?', 10, 0, true),
  (tmpl_id, 'agronomy', 'soy_w10_agr_2', 'Losses minimised', 'Are harvest losses (pod shatter, threshing losses) being kept below threshold?', 10, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w10_csa_1', 'Weather window used', 'Was harvesting timed during a dry weather window?', 10, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w10_adv_1', 'Harvest data shared with agent', 'Has the farmer reported actual yield data to the agent?', 10, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w10_ent_1', 'Yield recorded', 'Has the total yield (bags or kg) been recorded in the farm record book?', 10, 4, true);

-- ===================== WEEK 11: Post-Harvest & Storage =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w11_agr_1', 'Grain dried to safe moisture', 'Has grain been dried to 12% moisture content or below before storage?', 11, 0, true),
  (tmpl_id, 'agronomy', 'soy_w11_agr_2', 'Grain stored appropriately', 'Is grain stored in a clean, pest-free facility or hermetic bag?', 11, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w11_csa_1', 'Storage method climate-smart', 'Is the farmer using hermetic storage to reduce post-harvest losses?', 11, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w11_adv_1', 'Post-harvest debrief completed', 'Has the farmer attended or participated in the post-season debrief?', 11, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w11_ent_1', 'Gross margin calculated', 'Has the farmer calculated gross margin (revenue minus input costs)?', 11, 4, true);

-- ===================== WEEK 12: Season Review & Next-Season Planning =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w12_agr_1', 'Seed variety reviewed', 'Has the farmer reviewed the performance of the soybean variety used this season?', 12, 0, true),
  (tmpl_id, 'agronomy', 'soy_w12_agr_2', 'Soil health assessed', 'Has the farmer assessed soil health after the soybean harvest (nitrogen fixation benefit)?', 12, 1, true),
  (tmpl_id, 'climate_smart', 'soy_w12_csa_1', 'Crop rotation planned', 'Has the farmer planned a crop rotation to benefit from soybean nitrogen fixation?', 12, 2, true),
  (tmpl_id, 'advisory_commitment', 'soy_w12_adv_1', 'Season review with agent', 'Has the farmer conducted a season review with the agent to discuss lessons learned?', 12, 3, true),
  (tmpl_id, 'farm_enterprise', 'soy_w12_ent_1', 'Next-season plan started', 'Has the farmer begun planning inputs and variety selection for next season?', 12, 4, true),
  (tmpl_id, 'farm_enterprise', 'soy_w12_ent_2', 'Records finalised', 'Has the farmer finalised all farm records for the season?', 12, 5, true);

END $$;
