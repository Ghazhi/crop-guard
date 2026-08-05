
-- Replace all items in "Soybeans Kudigona Check-in (12 Weeks)" with uploaded content
-- Component mapping: Agronomy→agronomy, CSA→climate_smart, Advisory→advisory_commitment, Discipline→farm_enterprise
DO $$
DECLARE
  tmpl_id uuid := 'c28feafa-d771-40b1-a472-42cf41a5d8e3';
BEGIN
  DELETE FROM checkin_template_items WHERE checkin_template_id = tmpl_id;

-- ===================== WEEK 1 – Land Preparation & Site Selection =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w1_agr_1', 'Site selection', 'I selected a site with loamy or sand-loamy soil and avoided clay soil for my soybean farm.', 1, 0, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_2', 'Manure application', 'I spread manure evenly for soil nutrients and to improve soil structure.', 1, 1, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_3', 'Minimum tillage', 'I used zero or minimum tillage to conserve the soil and reduce erosion.', 1, 2, true),
  (tmpl_id, 'agronomy', 'soy_w1_agr_4', 'Lining and pegging', 'I lined and pegged my farm to maintain proper planting distance (45 cm × 5–10 cm).', 1, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_1', 'Organic matter incorporation', 'I incorporated organic matter or compost into the soil to improve fertility.', 1, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_2', 'No burning', 'I avoided burning vegetation or crop residues on my soybean farm.', 1, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_3', 'Drainage site choice', 'I chose a site that avoids waterlogging, as soybean roots are sensitive to excess moisture.', 1, 6, true),
  (tmpl_id, 'climate_smart', 'soy_w1_csa_4', 'Soil conservation', 'I used soil conservation practices (minimum tillage) to protect the soil structure.', 1, 7, true),
  (tmpl_id, 'advisory_commitment', 'soy_w1_adv_1', 'Land preparation guidance', 'I received land preparation guidance from the field agent or agronomist.', 1, 8, true),
  (tmpl_id, 'farm_enterprise', 'soy_w1_ent_1', 'Verified farm area', 'I prepared only the verified/registered farm area for soybean planting.', 1, 9, true);

-- ===================== WEEK 2 – Seed Selection & Planting =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w2_agr_1', 'Pest-free seed selection', 'I selected soybean seeds that are pest-free and disease-free before planting.', 2, 0, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_2', 'Drought-tolerant varieties', 'I selected drought-tolerant soybean varieties suitable for my area (e.g., Favour).', 2, 1, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_3', 'Germination test', 'I conducted a germination test and confirmed a 90–100% germination rate.', 2, 2, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_4', 'Rhizobium inoculant', 'I treated soybean seeds with Rhizobium inoculant before planting to support nitrogen fixation.', 2, 3, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_5', 'Correct spacing', 'I planted seeds at the correct spacing (45 cm between rows, 5–10 cm between seeds).', 2, 4, true),
  (tmpl_id, 'agronomy', 'soy_w2_agr_6', 'Planting depth and moisture', 'I planted seeds at the right depth with adequate soil moisture in the planting hole.', 2, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w2_csa_1', 'Rainfall window planting', 'I planted after observing the right rainfall window and when soil moisture was adequate.', 2, 6, true),
  (tmpl_id, 'climate_smart', 'soy_w2_csa_2', 'Avoided off-window planting', 'I avoided planting too early or too late outside the recommended window.', 2, 7, true),
  (tmpl_id, 'advisory_commitment', 'soy_w2_adv_1', 'Pre-season planting guidance', 'I received the pre-season planting guidance from the field agent or agronomist.', 2, 8, true),
  (tmpl_id, 'farm_enterprise', 'soy_w2_ent_1', 'Certified seeds for verified farm', 'I used the certified and inoculated seeds provided for the intended, verified farm only.', 2, 9, true),
  (tmpl_id, 'farm_enterprise', 'soy_w2_ent_2', 'No seed diversion', 'I did not divert, sell, or misuse any seeds or inputs received.', 2, 10, true);

-- ===================== WEEK 3 – Germination Monitoring =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w3_agr_1', 'Germination check', 'I checked whether the soybean seeds have germinated (expected 5–8 days after planting).', 3, 0, true),
  (tmpl_id, 'agronomy', 'soy_w3_agr_2', 'Gap identification', 'I identified and reported any gaps or areas where germination failed.', 3, 1, true),
  (tmpl_id, 'agronomy', 'soy_w3_agr_3', 'Crop stand inspection', 'I allowed the field agent/agronomist to inspect the crop stand.', 3, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w3_csa_1', 'Early pest scouting', 'I scouted seedlings for early pest signs: bean beetles, aphids, caterpillars, or soil pests.', 3, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w3_csa_2', 'Disease symptom observation', 'I observed seedlings for disease symptoms (yellowing, rot, damping-off, mosaic virus).', 3, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w3_csa_3', 'Soil moisture check', 'I checked soil moisture and observed signs of waterlogging or poor root development.', 3, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w3_csa_4', 'Climate issue reporting', 'I reported any climate-related issue (heavy rains, drought, erosion) affecting germination.', 3, 6, true),
  (tmpl_id, 'advisory_commitment', 'soy_w3_adv_1', 'Follow-up advice', 'I received follow-up advice from the field team after planting.', 3, 7, true),
  (tmpl_id, 'farm_enterprise', 'soy_w3_ent_1', 'Honest planting report', 'I did not falsely report planting on land that was not verified or inspected.', 3, 8, true),
  (tmpl_id, 'farm_enterprise', 'soy_w3_ent_2', 'Early problem reporting', 'I reported any germination problem early to the field team.', 3, 9, true);

-- ===================== WEEK 4 – Weed Management =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w4_agr_1', 'Weed assessment', 'I checked the level and type of weeds present on my soybean farm.', 4, 0, true),
  (tmpl_id, 'agronomy', 'soy_w4_agr_2', 'First weeding completed', 'I completed the recommended first weeding (manual, hoe, or herbicide) as advised.', 4, 1, true),
  (tmpl_id, 'agronomy', 'soy_w4_agr_3', 'Timely weed control', 'I controlled weeds within 3 weeks of emergence to prevent yield loss.', 4, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w4_csa_1', 'Cultural methods first', 'I used cultural methods (hand weeding, hoeing) before resorting to chemicals.', 4, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w4_csa_2', 'Recommended herbicides', 'I used only recommended post-emergence herbicides and followed the label instructions.', 4, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w4_csa_3', 'Safe spraying conditions', 'I avoided spraying herbicides during strong wind or when runoff risk was high.', 4, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w4_csa_4', 'Chemical safety', 'I used chemicals safely and disposed of containers responsibly.', 4, 6, true),
  (tmpl_id, 'advisory_commitment', 'soy_w4_adv_1', 'Weed-control guidance', 'I received or followed weed-control guidance from the field agent.', 4, 7, true),
  (tmpl_id, 'farm_enterprise', 'soy_w4_ent_1', 'Input recording', 'I recorded or reported the herbicide or input I used.', 4, 8, true),
  (tmpl_id, 'farm_enterprise', 'soy_w4_ent_2', 'No input misuse', 'I did not misuse, sell, or replace recommended inputs without approval.', 4, 9, true);

-- ===================== WEEK 5 – Crop Growth Monitoring =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w5_agr_1', 'Growth assessment', 'I checked soybean crop growth, height, leaf colour, and general field condition.', 5, 0, true),
  (tmpl_id, 'agronomy', 'soy_w5_agr_2', 'Root nodule inspection', 'I inspected the root nodules for Rhizobium activity (healthy nodules are pink/red inside).', 5, 1, true),
  (tmpl_id, 'agronomy', 'soy_w5_agr_3', 'Pest scouting', 'I walked the farm and observed plants for pod borers, aphids, bean beetles, or stem damage.', 5, 2, true),
  (tmpl_id, 'agronomy', 'soy_w5_agr_4', 'Disease identification', 'I identified disease signs (rust, bacterial pustule, mosaic) and reported them to the field team.', 5, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w5_csa_1', 'Biological control first', 'I used biological or cultural methods before applying chemical control.', 5, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w5_csa_2', 'Soil health check', 'I checked for soil health signs: erosion, nutrient deficiency, or waterlogging.', 5, 5, true),
  (tmpl_id, 'climate_smart', 'soy_w5_csa_3', 'Climate stress observation', 'I observed drought or excess water effects on the crop and reported climate stress.', 5, 6, true),
  (tmpl_id, 'advisory_commitment', 'soy_w5_adv_1', 'Monitoring feedback', 'I received monitoring feedback from the field team and acted on the advice given.', 5, 7, true),
  (tmpl_id, 'farm_enterprise', 'soy_w5_ent_1', 'Farm accessibility', 'I kept the farm accessible for monitoring and inspection visits.', 5, 8, true);

-- ===================== WEEK 6 – Mid-Season Assessment =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w6_agr_1', 'Crop assessment', 'I allowed the crop to be assessed for crop stand, leaf colour, and general health.', 6, 0, true),
  (tmpl_id, 'agronomy', 'soy_w6_agr_2', 'Supplementary fertilizer', 'I applied any supplementary fertilizer (Phosphorus) only if recommended by the agronomist.', 6, 1, true),
  (tmpl_id, 'agronomy', 'soy_w6_agr_3', 'Fertilizer method', 'I followed the recommended method of any fertilizer application advised at this stage.', 6, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w6_csa_1', 'Pre-flowering scouting', 'I scouted for weeds, pests, or diseases requiring intervention before flowering.', 6, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w6_csa_2', 'Mulching assessment', 'I considered whether additional organic matter or mulching was needed for soil moisture.', 6, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w6_csa_3', 'Climate stress monitoring', 'I observed any dry spell, heavy rainfall, or climate stress affecting mid-season growth.', 6, 5, true),
  (tmpl_id, 'advisory_commitment', 'soy_w6_adv_1', 'Pre-flowering guidance', 'I received and followed guidance on what to do before the flowering and pod-filling stage.', 6, 6, true),
  (tmpl_id, 'farm_enterprise', 'soy_w6_ent_1', 'Problem reporting', 'I informed the field team about any problem that could affect yield, input use, or repayment.', 6, 7, true);

-- ===================== WEEK 7 – Flowering Stage =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w7_agr_1', 'Flowering confirmation', 'I observed the soybean crop entering the flowering stage and confirmed healthy blossom set.', 7, 0, true),
  (tmpl_id, 'agronomy', 'soy_w7_agr_2', 'Moisture during flowering', 'I ensured the crop had adequate moisture during flowering (critical growth stage).', 7, 1, true),
  (tmpl_id, 'agronomy', 'soy_w7_agr_3', 'Flower pest scouting', 'I scouted for flower-damaging pests: pod borers, bean pod bugs, or armyworms.', 7, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w7_csa_1', 'Pest control for flower set', 'I applied recommended pest control measures if pest pressure threatened the flower set.', 7, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w7_csa_2', 'Soil moisture monitoring', 'I monitored soil moisture and root health to support the pod initiation stage.', 7, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w7_csa_3', 'Weather impact reporting', 'I reported any drought, excessive heat, or heavy rainfall affecting the flowering stage.', 7, 5, true),
  (tmpl_id, 'advisory_commitment', 'soy_w7_adv_1', 'Flowering guidance', 'I received guidance on managing the flowering and early pod-setting stage.', 7, 6, true),
  (tmpl_id, 'farm_enterprise', 'soy_w7_ent_1', 'True progress update', 'I shared a true and current update on crop progress with the field team.', 7, 7, true);

-- ===================== WEEK 8 – Pod Filling =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w8_agr_1', 'Pod-filling stage', 'I observed the soybean crop entering the pod-filling stage (critical for yield).', 8, 0, true),
  (tmpl_id, 'agronomy', 'soy_w8_agr_2', 'Pod development check', 'I checked the pods for adequate development and monitored for pod shattering risk.', 8, 1, true),
  (tmpl_id, 'agronomy', 'soy_w8_agr_3', 'Pod pest scouting', 'I scouted for pod-sucking bugs, pod borers, or late-season aphid infestations.', 8, 2, true),
  (tmpl_id, 'agronomy', 'soy_w8_agr_4', 'IPM pest management', 'I used the recommended IPM methods to manage any pest found during pod filling.', 8, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w8_csa_1', 'Soil moisture for pod fill', 'I checked that soil moisture was sufficient to support good pod filling and seed development.', 8, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w8_csa_2', 'Weather event reporting', 'I reported any drought stress, excessive rains, or weather events affecting pod fill.', 8, 5, true),
  (tmpl_id, 'advisory_commitment', 'soy_w8_adv_1', 'Late-season advice', 'I remained reachable and responded to late-season crop advice from the field team.', 8, 6, true),
  (tmpl_id, 'farm_enterprise', 'soy_w8_ent_1', 'Honest harvest outlook', 'I gave an honest update on the expected harvest outlook to the field team.', 8, 7, true);

-- ===================== WEEK 9 – Pre-Harvest Assessment =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w9_agr_1', 'Pre-harvest yield estimate', 'I allowed the field team to conduct a pre-harvest yield estimate on my soybean farm.', 9, 0, true),
  (tmpl_id, 'agronomy', 'soy_w9_agr_2', 'Maturity signs check', 'I checked for crop maturity signs: yellowing leaves, dry pods, pod rattling.', 9, 1, true),
  (tmpl_id, 'agronomy', 'soy_w9_agr_3', 'Crop loss reporting', 'I reported any crop loss, damage, pod shattering risk, or harvest challenge.', 9, 2, true),
  (tmpl_id, 'agronomy', 'soy_w9_agr_4', 'Post-harvest soil discussion', 'I discussed post-harvest soil management with the field team (cover crops, residue use).', 9, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w9_csa_1', 'Weather risk assessment', 'I considered weather risks before planning the harvest timing.', 9, 4, true),
  (tmpl_id, 'advisory_commitment', 'soy_w9_adv_1', 'Pre-harvest advisory review', 'I participated in the pre-harvest advisory review with the field team.', 9, 5, true),
  (tmpl_id, 'farm_enterprise', 'soy_w9_ent_1', 'Realistic harvest outlook', 'I shared a realistic harvest outlook and communicated any concerns early.', 9, 6, true);

-- ===================== WEEK 10 – Harvest Preparation =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w10_agr_1', 'Maturity confirmation', 'I checked whether the soybean crop was mature and ready for harvest (90% of pods brown/dry).', 10, 0, true),
  (tmpl_id, 'agronomy', 'soy_w10_agr_2', 'Harvest before shattering', 'I planned to harvest before full pod shattering to reduce seed losses in the field.', 10, 1, true),
  (tmpl_id, 'agronomy', 'soy_w10_agr_3', 'Tools and storage prepared', 'I prepared harvesting tools (sickle, thresher) and storage facilities before harvest.', 10, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w10_csa_1', 'Residue management plan', 'I planned the management of soybean root residues and crop stalks after harvest.', 10, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w10_csa_2', 'Dry weather harvest timing', 'I planned harvest timing around dry weather conditions to avoid moisture damage.', 10, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w10_csa_3', 'Storage preparation', 'I prepared a clean, dry, ventilated storage or drying area to reduce spoilage.', 10, 5, true),
  (tmpl_id, 'advisory_commitment', 'soy_w10_adv_1', 'Harvest guidance received', 'I received guidance on harvesting, drying, threshing, and storage from the field team.', 10, 6, true),
  (tmpl_id, 'farm_enterprise', 'soy_w10_ent_1', 'Honest harvest reporting plan', 'I prepared to report harvest output honestly and accurately.', 10, 7, true),
  (tmpl_id, 'farm_enterprise', 'soy_w10_ent_2', 'Repayment obligations', 'I understood my repayment, input recovery, or contribution obligations.', 10, 8, true);

-- ===================== WEEK 11 – Harvest & Post-Harvest =====================
INSERT INTO checkin_template_items (checkin_template_id, component, activity_code, label, description, week_number, sort_order, is_active) VALUES
  (tmpl_id, 'agronomy', 'soy_w11_agr_1', 'Timely harvest', 'I completed the soybean harvest on time to avoid pod shattering losses.', 11, 0, true),
  (tmpl_id, 'agronomy', 'soy_w11_agr_2', 'Threshing and bagging', 'I threshed, cleaned, and bagged the harvested soybean properly.', 11, 1, true),
  (tmpl_id, 'agronomy', 'soy_w11_agr_3', 'Harvest quantity report', 'I reported the harvested quantity and quality to the field team accurately.', 11, 2, true),
  (tmpl_id, 'climate_smart', 'soy_w11_csa_1', 'Residue nitrogen return', 'I managed soybean residues and root nodules after harvest to return nitrogen to the soil.', 11, 3, true),
  (tmpl_id, 'climate_smart', 'soy_w11_csa_2', 'Post-harvest quality check', 'I checked for post-harvest quality problems (moisture, cracked seed, contamination).', 11, 4, true),
  (tmpl_id, 'climate_smart', 'soy_w11_csa_3', 'Proper drying and storage', 'I dried and stored produce properly to reduce spoilage, moisture damage, and contamination.', 11, 5, true),
  (tmpl_id, 'advisory_commitment', 'soy_w11_adv_1', 'Harvest review', 'I participated in harvest review or received post-harvest guidance from the field team.', 11, 6, true),
  (tmpl_id, 'farm_enterprise', 'soy_w11_ent_1', 'Honest harvest report', 'I reported the harvest quantity honestly and did not hide or understate output.', 11, 7, true),
  (tmpl_id, 'farm_enterprise', 'soy_w11_ent_2', 'Repayment records updated', 'I updated repayment, contribution, or input recovery records where applicable.', 11, 8, true);

END $$;
