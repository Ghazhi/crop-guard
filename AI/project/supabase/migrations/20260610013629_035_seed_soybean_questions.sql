-- Seed full soybean weekly check-in questions (weeks 1–11)
DO $$
DECLARE org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN

INSERT INTO checkin_questions (organisation_id, crop_type, week_number, week_title, component, label, description, is_active, sort_order) VALUES
-- ── Soybean Week 1: Land Preparation & Inoculation
(org_id,'soybean',1,'Land Preparation & Inoculation','agronomy',            'Land ploughed and harrowed',      'Has the plot been ploughed and harrowed to a fine tilth?',                                            true, 1),
(org_id,'soybean',1,'Land Preparation & Inoculation','agronomy',            'Rhizobium inoculant used',        'Has the farmer treated seed with the correct Rhizobium inoculant?',                                  true, 2),
(org_id,'soybean',1,'Land Preparation & Inoculation','climate_smart',       'Residue incorporated',            'Has previous crop residue been incorporated to improve soil organic matter?',                         true, 3),
(org_id,'soybean',1,'Land Preparation & Inoculation','climate_smart',       'Drainage channels cleared',       'Are drainage channels functional to prevent waterlogging?',                                          true, 4),
(org_id,'soybean',1,'Land Preparation & Inoculation','advisory_commitment', 'Pre-season training attended',    'Did the farmer attend the pre-season soybean advisory session?',                                     true, 5),
(org_id,'soybean',1,'Land Preparation & Inoculation','farm_enterprise',     'Input budget prepared',           'Has the farmer prepared a budget for soybean inputs?',                                               true, 6),
-- ── Soybean Week 2: Planting & Spacing
(org_id,'soybean',2,'Planting & Spacing','agronomy',            'Certified seed used',             'Is the farmer using certified or improved soybean variety seed?',                                   true, 1),
(org_id,'soybean',2,'Planting & Spacing','agronomy',            'Correct row spacing observed',    'Is row spacing within the recommended range (45–60 cm)?',                                           true, 2),
(org_id,'soybean',2,'Planting & Spacing','agronomy',            'Seed rate correct',               'Is the seeding rate within the recommended range (60–80 kg/ha)?',                                  true, 3),
(org_id,'soybean',2,'Planting & Spacing','climate_smart',       'Planting aligned to forecast',    'Was planting timed to coincide with the onset of reliable rains?',                                  true, 4),
(org_id,'soybean',2,'Planting & Spacing','advisory_commitment', 'Followed planting advisory',      'Did the farmer follow the recommended soybean planting guidance?',                                  true, 5),
(org_id,'soybean',2,'Planting & Spacing','farm_enterprise',     'Inputs procured on time',         'Were all required inputs available at planting time?',                                               true, 6),
-- ── Soybean Week 3: Germination & Early Growth
(org_id,'soybean',3,'Germination & Early Growth','agronomy',            'Germination rate satisfactory',   'Has germination reached at least 80% of planted stands?',                                           true, 1),
(org_id,'soybean',3,'Germination & Early Growth','agronomy',            'Replanting of gaps done',         'Have gaps been replanted promptly?',                                                                 true, 2),
(org_id,'soybean',3,'Germination & Early Growth','climate_smart',       'Soil moisture adequate',          'Is soil moisture sufficient for early seedling establishment?',                                      true, 3),
(org_id,'soybean',3,'Germination & Early Growth','advisory_commitment', 'Early visit completed',           'Has the agent conducted a field visit to confirm stand establishment?',                              true, 4),
(org_id,'soybean',3,'Germination & Early Growth','farm_enterprise',     'Labour for replanting sourced',   'Was labour available promptly for gap filling?',                                                     true, 5),
-- ── Soybean Week 4: Weed Management
(org_id,'soybean',4,'Weed Management','agronomy',            'First weeding completed',         'Has the plot been weeded at the V1–V3 growth stage?',                                                true, 1),
(org_id,'soybean',4,'Weed Management','agronomy',            'Herbicide applied correctly',     'If herbicide was used, was the correct product applied at the right rate?',                          true, 2),
(org_id,'soybean',4,'Weed Management','climate_smart',       'Mulching applied',                'Has the farmer applied mulch to conserve moisture and suppress weeds?',                               true, 3),
(org_id,'soybean',4,'Weed Management','advisory_commitment', 'Weed scouting done with agent',   'Did the farmer and agent conduct a joint weed assessment?',                                          true, 4),
(org_id,'soybean',4,'Weed Management','farm_enterprise',     'Weeding cost recorded',           'Has the cost of weeding (labour + herbicide) been recorded?',                                       true, 5),
-- ── Soybean Week 5: Pest & Disease Scouting
(org_id,'soybean',5,'Pest & Disease Scouting','agronomy',            'Soybean aphid scouted',           'Has the farmer checked for aphid infestations (threshold: >250/plant)?',                             true, 1),
(org_id,'soybean',5,'Pest & Disease Scouting','agronomy',            'Appropriate pest control used',   'If pests are detected, was the recommended control measure applied?',                               true, 2),
(org_id,'soybean',5,'Pest & Disease Scouting','agronomy',            'Bacterial pustule / rust checked','Are any foliar disease symptoms (bacterial pustule, Asian soybean rust) visible?',                  true, 3),
(org_id,'soybean',5,'Pest & Disease Scouting','climate_smart',       'Field hygiene maintained',        'Has the farmer removed and destroyed heavily infected plant material?',                               true, 4),
(org_id,'soybean',5,'Pest & Disease Scouting','advisory_commitment', 'Pest report submitted to agent',  'Has the farmer reported any pest/disease outbreaks to the agent?',                                  true, 5),
(org_id,'soybean',5,'Pest & Disease Scouting','farm_enterprise',     'Pest control cost recorded',      'Have the costs of pest and disease management been recorded?',                                      true, 6),
-- ── Soybean Week 6: Flowering & Nodule Development
(org_id,'soybean',6,'Flowering & Nodule Development','agronomy',            'Flowering commenced',             'Has the crop reached the R1 (first flower) growth stage?',                                          true, 1),
(org_id,'soybean',6,'Flowering & Nodule Development','agronomy',            'Nodule development assessed',     'Are effective (pink/red interior) nodules present on roots?',                                       true, 2),
(org_id,'soybean',6,'Flowering & Nodule Development','climate_smart',       'Moisture stress managed',         'Is the farmer managing moisture during the critical flowering period?',                             true, 3),
(org_id,'soybean',6,'Flowering & Nodule Development','advisory_commitment', 'Flowering progress reported',     'Has the farmer updated the agent on crop flowering progress?',                                      true, 4),
(org_id,'soybean',6,'Flowering & Nodule Development','farm_enterprise',     'Yield estimation started',        'Has the farmer begun a preliminary yield estimate based on flower set?',                           true, 5),
-- ── Soybean Week 7: Pod Setting
(org_id,'soybean',7,'Pod Setting','agronomy',            'Pod set uniform',                 'Are pods setting uniformly across the plot (R3–R4 stage)?',                                         true, 1),
(org_id,'soybean',7,'Pod Setting','agronomy',            'Pod borers scouted',              'Has the farmer checked for pod-boring insects?',                                                     true, 2),
(org_id,'soybean',7,'Pod Setting','climate_smart',       'Drought stress mitigated',        'Is the farmer managing any drought stress during pod set?',                                          true, 3),
(org_id,'soybean',7,'Pod Setting','advisory_commitment', 'Pod-set advisory received',       'Has the agent provided guidance on managing the pod-set period?',                                   true, 4),
(org_id,'soybean',7,'Pod Setting','farm_enterprise',     'Labour plan for harvest prepared', 'Has the farmer planned labour requirements for the upcoming harvest?',                              true, 5),
-- ── Soybean Week 8: Grain Fill
(org_id,'soybean',8,'Grain Fill','agronomy',            'Grain fill satisfactory',         'Are seeds developing fully within pods (R5–R6 stage)?',                                             true, 1),
(org_id,'soybean',8,'Grain Fill','agronomy',            'Late-season disease checked',     'Has the farmer scouted for late-season foliar diseases?',                                           true, 2),
(org_id,'soybean',8,'Grain Fill','climate_smart',       'Water stress managed',            'Is the farmer managing water or heat stress during grain fill?',                                    true, 3),
(org_id,'soybean',8,'Grain Fill','advisory_commitment', 'Grain fill advisory received',    'Has the agent provided guidance on managing the grain-fill period?',                                true, 4),
(org_id,'soybean',8,'Grain Fill','farm_enterprise',     'Input expenditure updated',       'Has total input expenditure been updated in farm records?',                                         true, 5),
-- ── Soybean Week 9: Pre-Harvest Assessment
(org_id,'soybean',9,'Pre-Harvest Assessment','agronomy',            'Crop maturity assessed',          'Has the farmer checked pod colour and leaf senescence (R7–R8 stage)?',                              true, 1),
(org_id,'soybean',9,'Pre-Harvest Assessment','agronomy',            'Field drying underway',           'Is the crop field-drying adequately before harvest?',                                               true, 2),
(org_id,'soybean',9,'Pre-Harvest Assessment','climate_smart',       'Harvest timing adjusted for weather','Is the farmer adjusting harvest timing based on weather forecast?',                              true, 3),
(org_id,'soybean',9,'Pre-Harvest Assessment','advisory_commitment', 'Harvest date confirmed with agent','Has the farmer confirmed the harvest date with the agent?',                                      true, 4),
(org_id,'soybean',9,'Pre-Harvest Assessment','farm_enterprise',     'Market arrangements made',        'Has the farmer identified a buyer or market channel for the harvest?',                              true, 5),
-- ── Soybean Week 10: Harvesting
(org_id,'soybean',10,'Harvesting','agronomy',            'Harvest method appropriate',     'Is the farmer using the correct harvesting method to minimise pod shatter?',                         true, 1),
(org_id,'soybean',10,'Harvesting','agronomy',            'Losses minimised',               'Are harvest losses (pod shatter, threshing losses) being kept below threshold?',                    true, 2),
(org_id,'soybean',10,'Harvesting','climate_smart',       'Weather window used',            'Was harvesting timed during a dry weather window?',                                                 true, 3),
(org_id,'soybean',10,'Harvesting','advisory_commitment', 'Harvest data shared with agent', 'Has the farmer reported actual yield data to the agent?',                                           true, 4),
(org_id,'soybean',10,'Harvesting','farm_enterprise',     'Yield recorded',                 'Has the total yield (bags or kg) been recorded in the farm record book?',                           true, 5),
-- ── Soybean Week 11: Post-Harvest & Storage
(org_id,'soybean',11,'Post-Harvest & Storage','agronomy',            'Grain dried to safe moisture',   'Has grain been dried to 12% moisture content or below before storage?',                             true, 1),
(org_id,'soybean',11,'Post-Harvest & Storage','agronomy',            'Grain stored appropriately',     'Is grain stored in a clean, pest-free facility or hermetic bag?',                                  true, 2),
(org_id,'soybean',11,'Post-Harvest & Storage','climate_smart',       'Storage method climate-smart',   'Is the farmer using hermetic storage to reduce post-harvest losses?',                               true, 3),
(org_id,'soybean',11,'Post-Harvest & Storage','advisory_commitment', 'Post-harvest debrief completed', 'Has the farmer attended or participated in the post-season debrief?',                              true, 4),
(org_id,'soybean',11,'Post-Harvest & Storage','farm_enterprise',     'Gross margin calculated',        'Has the farmer calculated gross margin (revenue minus input costs)?',                              true, 5),
(org_id,'soybean',11,'Post-Harvest & Storage','farm_enterprise',     'Next-season plan started',       'Has the farmer begun planning inputs and variety selection for next season?',                      true, 6);

END $$;
