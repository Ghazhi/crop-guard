-- Update maize question descriptions with full advisory text
DO $$
DECLARE org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN

-- Week 1
UPDATE checkin_questions SET description = 'Has the farmer ploughed or tilled the plot to the recommended depth?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Ploughing completed';
UPDATE checkin_questions SET description = 'Has a soil test been done this season?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Soil test conducted';
UPDATE checkin_questions SET description = 'Has crop residue from the previous season been incorporated or managed?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Residue management practiced';
UPDATE checkin_questions SET description = 'Are erosion-control structures present on sloping land?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Contour ridges / bunds in place';
UPDATE checkin_questions SET description = 'Did the farmer attend the pre-season advisory session?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Attended pre-season training';
UPDATE checkin_questions SET description = 'Has the farmer prepared a budget for inputs this season?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 1 AND label = 'Input budget prepared';

-- Week 2
UPDATE checkin_questions SET description = 'Is the farmer using certified or improved variety seed?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Certified seed used';
UPDATE checkin_questions SET description = 'Is the planting density within the recommended range (25,000–35,000 plants/ha)?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Seed rate correct';
UPDATE checkin_questions SET description = 'Has seed been planted at the recommended depth (5–7 cm)?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Planting depth observed';
UPDATE checkin_questions SET description = 'Was planting timed according to the seasonal rainfall forecast?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Planting aligned to forecast';
UPDATE checkin_questions SET description = 'Did the farmer follow the recommended planting guidance?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Followed planting advisory';
UPDATE checkin_questions SET description = 'Were all required inputs available at planting time?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 2 AND label = 'Inputs procured on time';

-- Week 3
UPDATE checkin_questions SET description = 'Has germination reached at least 80% of planted stands?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 3 AND label = 'Germination rate satisfactory';
UPDATE checkin_questions SET description = 'Have gaps or missing stands been replanted within 5 days?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 3 AND label = 'Gaps filled (replanting done)';
UPDATE checkin_questions SET description = 'Is soil moisture sufficient for early seedling establishment?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 3 AND label = 'Soil moisture adequate';
UPDATE checkin_questions SET description = 'Has the agent conducted a field visit to confirm stand establishment?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 3 AND label = 'Early visit completed';
UPDATE checkin_questions SET description = 'Was labour available promptly for gap filling?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 3 AND label = 'Labour for replanting sourced';

-- Week 4
UPDATE checkin_questions SET description = 'Has the recommended basal fertiliser (e.g. NPK) been applied?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Basal fertiliser applied';
UPDATE checkin_questions SET description = 'Was fertiliser applied at the recommended rate per hectare?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Application rate correct';
UPDATE checkin_questions SET description = 'Was fertiliser banded or placed correctly to avoid crop burn?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Fertiliser placement correct';
UPDATE checkin_questions SET description = 'Was fertiliser applied before or just after rainfall to reduce volatilisation?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Application timed with rain';
UPDATE checkin_questions SET description = 'Did the farmer apply the fertiliser type recommended by the agent?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Fertiliser advisory followed';
UPDATE checkin_questions SET description = 'Has the cost of fertiliser been entered in the farm record book?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 4 AND label = 'Fertiliser cost recorded';

-- Week 5
UPDATE checkin_questions SET description = 'Has the plot been weeded before the crop reaches the 3–4 leaf stage?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 5 AND label = 'First weeding completed';
UPDATE checkin_questions SET description = 'If herbicide was used, was it applied at the correct rate and timing?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 5 AND label = 'Herbicide applied correctly';
UPDATE checkin_questions SET description = 'Has the farmer applied mulch to suppress weeds and retain moisture?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 5 AND label = 'Mulching applied';
UPDATE checkin_questions SET description = 'Did the farmer and agent conduct a joint weed assessment?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 5 AND label = 'Weed scouting done with agent';
UPDATE checkin_questions SET description = 'Has the cost of weeding (labour + herbicide) been recorded?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 5 AND label = 'Weed cost recorded';

-- Week 6
UPDATE checkin_questions SET description = 'Has the farmer checked for Fall Armyworm (FAW) egg masses and damage?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'FAW scouted';
UPDATE checkin_questions SET description = 'If pests are detected, was the recommended control measure applied?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'Appropriate pest control used';
UPDATE checkin_questions SET description = 'Are any foliar disease symptoms (e.g. grey leaf spot, streak virus) visible?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'Disease symptoms observed';
UPDATE checkin_questions SET description = 'Has the farmer removed and destroyed heavily infected plant material?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'Field hygiene maintained';
UPDATE checkin_questions SET description = 'Has the farmer reported any pest/disease outbreaks to the agent?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'Pest report submitted to agent';
UPDATE checkin_questions SET description = 'Have the costs of pest and disease management been recorded?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 6 AND label = 'Pest control cost recorded';

-- Week 7
UPDATE checkin_questions SET description = 'Has urea or CAN been applied as top-dressing?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 7 AND label = 'Top-dressing applied';
UPDATE checkin_questions SET description = 'Has the farmer checked for zinc or sulphur deficiency symptoms?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 7 AND label = 'Micronutrient deficiency checked';
UPDATE checkin_questions SET description = 'Is the farmer managing moisture stress during rapid growth phase?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 7 AND label = 'Irrigation/moisture managed';
UPDATE checkin_questions SET description = 'Did the farmer follow the recommended top-dressing guidance?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 7 AND label = 'Nutrient advisory implemented';
UPDATE checkin_questions SET description = 'Has total input expenditure been updated in farm records?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 7 AND label = 'Input expenditure updated';

-- Week 8
UPDATE checkin_questions SET description = 'Has the crop reached tasselling stage uniformly across the plot?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 8 AND label = 'Tasselling observed';
UPDATE checkin_questions SET description = 'Is silk emergence synchronised with tassel pollen shed?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 8 AND label = 'Silk emergence uniform';
UPDATE checkin_questions SET description = 'Is the crop receiving adequate moisture during the critical flowering window?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 8 AND label = 'Moisture stress managed';
UPDATE checkin_questions SET description = 'Has the farmer updated the agent on crop flowering progress?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 8 AND label = 'Flowering progress reported';
UPDATE checkin_questions SET description = 'Has the farmer begun a preliminary yield estimate based on cob set?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 8 AND label = 'Yield estimation started';

-- Week 9
UPDATE checkin_questions SET description = 'Are cobs developing uniformly with good grain fill?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 9 AND label = 'Cob development satisfactory';
UPDATE checkin_questions SET description = 'Has the farmer scouted for late-season diseases (e.g. ear rot, aflatoxin risk)?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 9 AND label = 'Late-season disease checked';
UPDATE checkin_questions SET description = 'Is the farmer managing any water or heat stress during grain fill?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 9 AND label = 'Water stress mitigated';
UPDATE checkin_questions SET description = 'Has the agent provided guidance on managing the grain-fill period?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 9 AND label = 'Grain fill advisory received';
UPDATE checkin_questions SET description = 'Has the farmer planned labour requirements for the upcoming harvest?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 9 AND label = 'Labour plan for harvest prepared';

-- Week 10
UPDATE checkin_questions SET description = 'Has the farmer checked husk colour, black layer formation, or kernel hardness?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 10 AND label = 'Crop maturity assessed';
UPDATE checkin_questions SET description = 'Is the crop being field-dried adequately before harvest?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 10 AND label = 'Drying in field underway';
UPDATE checkin_questions SET description = 'Is the farmer adjusting harvest timing based on weather forecast?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 10 AND label = 'Harvest timing adjusted for weather';
UPDATE checkin_questions SET description = 'Has the farmer confirmed the harvest date with the agent?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 10 AND label = 'Harvest date confirmed with agent';
UPDATE checkin_questions SET description = 'Has the farmer identified a buyer or market channel for the harvest?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 10 AND label = 'Market arrangements made';

-- Week 11
UPDATE checkin_questions SET description = 'Is the farmer using the correct harvesting method (manual or mechanical)?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 11 AND label = 'Harvest method appropriate';
UPDATE checkin_questions SET description = 'Are harvest losses being kept below the recommended threshold?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 11 AND label = 'Losses minimised';
UPDATE checkin_questions SET description = 'Was harvesting timed during a dry weather window?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 11 AND label = 'Weather window used';
UPDATE checkin_questions SET description = 'Has the farmer reported actual yield data to the agent?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 11 AND label = 'Harvest data shared with agent';
UPDATE checkin_questions SET description = 'Has the total yield (bags or kg) been recorded in the farm record book?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 11 AND label = 'Yield recorded';

-- Week 12
UPDATE checkin_questions SET description = 'Has grain been dried to 13% moisture content or below before storage?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Grain dried to safe moisture';
UPDATE checkin_questions SET description = 'Is grain stored in a clean, pest-free facility or hermetic bag?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Grain stored appropriately';
UPDATE checkin_questions SET description = 'Is the farmer using hermetic storage or metal silos to reduce post-harvest losses?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Storage method climate-smart';
UPDATE checkin_questions SET description = 'Has the farmer attended or participated in the post-season debrief?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Post-harvest debrief completed';
UPDATE checkin_questions SET description = 'Has the farmer calculated gross margin (revenue minus input costs)?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Gross margin calculated';
UPDATE checkin_questions SET description = 'Has the farmer begun planning for the next season?' WHERE organisation_id = org_id AND crop_type = 'maize' AND week_number = 12 AND label = 'Next-season plan started';

END $$;
