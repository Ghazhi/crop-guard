export type CropType = 'maize' | 'soybean' | 'cocoa';
export type CheckinComponent = 'agronomy' | 'climate_smart' | 'advisory_commitment' | 'farm_enterprise';

export interface CheckinQuestionTemplate {
  crop_type: CropType;
  week_number: number;
  week_title: string;
  component: CheckinComponent;
  label: string;
  description: string;
  sort_order: number;
}

export const WEEK_TITLES: Record<CropType, Record<number, string>> = {
  maize: {
    1:  'Land Preparation & Soil Health',
    2:  'Planting & Seed Selection',
    3:  'Early Germination & Stand Establishment',
    4:  'Fertiliser Application (Basal)',
    5:  'Weed Management',
    6:  'Pest & Disease Scouting',
    7:  'Top-Dressing & Nutrient Management',
    8:  'Tasselling & Silking',
    9:  'Grain Fill & Stress Management',
    10: 'Pre-Harvest Assessment',
    11: 'Harvesting',
    12: 'Post-Harvest & Storage',
  },
  soybean: {
    1:  'Land Preparation & Site Selection',
    2:  'Seed Selection & Planting',
    3:  'Germination Monitoring',
    4:  'Weed Management',
    5:  'Crop Growth Monitoring',
    6:  'Mid-Season Assessment',
    7:  'Flowering Stage',
    8:  'Pod Filling',
    9:  'Pre-Harvest Assessment',
    10: 'Harvest Preparation',
    11: 'Harvest & Post-Harvest',
  },
  cocoa: {
    1:  'Land Preparation & Sanitation',
    2:  'Sanitation & Shade Assessment',
    3:  'Planting & Gap Filling',
    4:  'Seedling Establishment & Shade',
    5:  'Shade Management & Canopy Thinning',
    6:  'Shade Regulation & Soil Cover',
    7:  'Weed Management',
    8:  'Weed Suppression & Mulching',
    9:  'Fertiliser Application',
    10: 'Nutrient Management & Soil Testing',
    11: 'Pruning & Canopy Shaping',
    12: 'Structural Pruning & Sanitation',
    13: 'Pest & Disease Scouting (CSSVD, Capsids, Black Pod)',
    14: 'Disease Management & CSSVD Monitoring',
    15: 'Harvesting & Pod Breaking',
    16: 'Fermentation, Drying & Storage',
  },
};

function q(
  crop: CropType,
  week: number,
  component: CheckinComponent,
  label: string,
  description: string,
  sort: number,
): CheckinQuestionTemplate {
  return {
    crop_type: crop,
    week_number: week,
    week_title: WEEK_TITLES[crop][week],
    component,
    label,
    description,
    sort_order: sort,
  };
}

const MAIZE: CheckinQuestionTemplate[] = [
  q('maize', 1, 'agronomy',            'Ploughing completed',              'Has the farmer ploughed or tilled the plot to the recommended depth?', 1),
  q('maize', 1, 'agronomy',            'Soil test conducted',              'Has a soil test been done this season?', 2),
  q('maize', 1, 'climate_smart',       'Residue management practiced',     'Has crop residue from the previous season been incorporated or managed?', 3),
  q('maize', 1, 'climate_smart',       'Contour ridges / bunds in place',  'Are erosion-control structures present on sloping land?', 4),
  q('maize', 1, 'advisory_commitment', 'Attended pre-season training',     'Did the farmer attend the pre-season advisory session?', 5),
  q('maize', 1, 'farm_enterprise',     'Input budget prepared',            'Has the farmer prepared a budget for inputs this season?', 6),

  q('maize', 2, 'agronomy',            'Certified seed used',              'Is the farmer using certified or improved variety seed?', 1),
  q('maize', 2, 'agronomy',            'Seed rate correct',                'Is the planting density within the recommended range (25,000-35,000 plants/ha)?', 2),
  q('maize', 2, 'agronomy',            'Planting depth observed',          'Has seed been planted at the recommended depth (5-7 cm)?', 3),
  q('maize', 2, 'climate_smart',       'Planting aligned to forecast',     'Was planting timed according to the seasonal rainfall forecast?', 4),
  q('maize', 2, 'advisory_commitment', 'Followed planting advisory',       'Did the farmer follow the recommended planting guidance?', 5),
  q('maize', 2, 'farm_enterprise',     'Inputs procured on time',          'Were all required inputs available at planting time?', 6),

  q('maize', 3, 'agronomy',            'Germination rate satisfactory',    'Has germination reached at least 80% of planted stands?', 1),
  q('maize', 3, 'agronomy',            'Gaps filled (replanting done)',     'Have gaps or missing stands been replanted within 5 days?', 2),
  q('maize', 3, 'climate_smart',       'Soil moisture adequate',           'Is soil moisture sufficient for early seedling establishment?', 3),
  q('maize', 3, 'advisory_commitment', 'Early visit completed',            'Has the agent conducted a field visit to confirm stand establishment?', 4),
  q('maize', 3, 'farm_enterprise',     'Labour for replanting sourced',    'Was labour available promptly for gap filling?', 5),

  q('maize', 4, 'agronomy',            'Basal fertiliser applied',         'Has the recommended basal fertiliser (e.g. NPK) been applied?', 1),
  q('maize', 4, 'agronomy',            'Application rate correct',         'Was fertiliser applied at the recommended rate per hectare?', 2),
  q('maize', 4, 'agronomy',            'Fertiliser placement correct',     'Was fertiliser banded or placed correctly to avoid crop burn?', 3),
  q('maize', 4, 'climate_smart',       'Application timed with rain',      'Was fertiliser applied before or just after rainfall to reduce volatilisation?', 4),
  q('maize', 4, 'advisory_commitment', 'Fertiliser advisory followed',     'Did the farmer apply the fertiliser type recommended by the agent?', 5),
  q('maize', 4, 'farm_enterprise',     'Fertiliser cost recorded',         'Has the cost of fertiliser been entered in the farm record book?', 6),

  q('maize', 5, 'agronomy',            'First weeding completed',          'Has the plot been weeded before the crop reaches the 3-4 leaf stage?', 1),
  q('maize', 5, 'agronomy',            'Herbicide applied correctly',      'If herbicide was used, was it applied at the correct rate and timing?', 2),
  q('maize', 5, 'climate_smart',       'Mulching applied',                 'Has the farmer applied mulch to suppress weeds and retain moisture?', 3),
  q('maize', 5, 'advisory_commitment', 'Weed scouting done with agent',    'Did the farmer and agent conduct a joint weed assessment?', 4),
  q('maize', 5, 'farm_enterprise',     'Weed cost recorded',               'Has the cost of weeding (labour + herbicide) been recorded?', 5),

  q('maize', 6, 'agronomy',            'FAW scouted',                      'Has the farmer checked for Fall Armyworm (FAW) egg masses and damage?', 1),
  q('maize', 6, 'agronomy',            'Appropriate pest control used',    'If pests are detected, was the recommended control measure applied?', 2),
  q('maize', 6, 'agronomy',            'Disease symptoms observed',        'Are any foliar disease symptoms (e.g. grey leaf spot, streak virus) visible?', 3),
  q('maize', 6, 'climate_smart',       'Field hygiene maintained',         'Has the farmer removed and destroyed heavily infected plant material?', 4),
  q('maize', 6, 'advisory_commitment', 'Pest report submitted to agent',   'Has the farmer reported any pest/disease outbreaks to the agent?', 5),
  q('maize', 6, 'farm_enterprise',     'Pest control cost recorded',       'Have the costs of pest and disease management been recorded?', 6),

  q('maize', 7, 'agronomy',            'Top-dressing applied',             'Has urea or CAN been applied as top-dressing?', 1),
  q('maize', 7, 'agronomy',            'Micronutrient deficiency checked',  'Has the farmer checked for zinc or sulphur deficiency symptoms?', 2),
  q('maize', 7, 'climate_smart',       'Irrigation/moisture managed',      'Is the farmer managing moisture stress during rapid growth phase?', 3),
  q('maize', 7, 'advisory_commitment', 'Nutrient advisory implemented',    'Did the farmer follow the recommended top-dressing guidance?', 4),
  q('maize', 7, 'farm_enterprise',     'Input expenditure updated',        'Has total input expenditure been updated in farm records?', 5),

  q('maize', 8, 'agronomy',            'Tasselling observed',              'Has the crop reached tasselling stage uniformly across the plot?', 1),
  q('maize', 8, 'agronomy',            'Silk emergence uniform',           'Is silk emergence synchronised with tassel pollen shed?', 2),
  q('maize', 8, 'climate_smart',       'Moisture stress managed',          'Is the crop receiving adequate moisture during the critical flowering window?', 3),
  q('maize', 8, 'advisory_commitment', 'Flowering progress reported',      'Has the farmer updated the agent on crop flowering progress?', 4),
  q('maize', 8, 'farm_enterprise',     'Yield estimation started',         'Has the farmer begun a preliminary yield estimate based on cob set?', 5),

  q('maize', 9, 'agronomy',            'Cob development satisfactory',     'Are cobs developing uniformly with good grain fill?', 1),
  q('maize', 9, 'agronomy',            'Late-season disease checked',      'Has the farmer scouted for late-season diseases (e.g. ear rot, aflatoxin risk)?', 2),
  q('maize', 9, 'climate_smart',       'Water stress mitigated',           'Is the farmer managing any water or heat stress during grain fill?', 3),
  q('maize', 9, 'advisory_commitment', 'Grain fill advisory received',     'Has the agent provided guidance on managing the grain-fill period?', 4),
  q('maize', 9, 'farm_enterprise',     'Labour plan for harvest prepared',  'Has the farmer planned labour requirements for the upcoming harvest?', 5),

  q('maize', 10, 'agronomy',            'Crop maturity assessed',          'Has the farmer checked husk colour, black layer formation, or kernel hardness?', 1),
  q('maize', 10, 'agronomy',            'Drying in field underway',        'Is the crop being field-dried adequately before harvest?', 2),
  q('maize', 10, 'climate_smart',       'Harvest timing adjusted for weather', 'Is the farmer adjusting harvest timing based on weather forecast?', 3),
  q('maize', 10, 'advisory_commitment', 'Harvest date confirmed with agent', 'Has the farmer confirmed the harvest date with the agent?', 4),
  q('maize', 10, 'farm_enterprise',     'Market arrangements made',        'Has the farmer identified a buyer or market channel for the harvest?', 5),

  q('maize', 11, 'agronomy',            'Harvest method appropriate',      'Is the farmer using the correct harvesting method (manual or mechanical)?', 1),
  q('maize', 11, 'agronomy',            'Losses minimised',                'Are harvest losses being kept below the recommended threshold?', 2),
  q('maize', 11, 'climate_smart',       'Weather window used',             'Was harvesting timed during a dry weather window?', 3),
  q('maize', 11, 'advisory_commitment', 'Harvest data shared with agent',  'Has the farmer reported actual yield data to the agent?', 4),
  q('maize', 11, 'farm_enterprise',     'Yield recorded',                  'Has the total yield (bags or kg) been recorded in the farm record book?', 5),

  q('maize', 12, 'agronomy',            'Grain dried to safe moisture',    'Has grain been dried to 13% moisture content or below before storage?', 1),
  q('maize', 12, 'agronomy',            'Grain stored appropriately',      'Is grain stored in a clean, pest-free facility or hermetic bag?', 2),
  q('maize', 12, 'climate_smart',       'Storage method climate-smart',    'Is the farmer using hermetic storage or metal silos to reduce post-harvest losses?', 3),
  q('maize', 12, 'advisory_commitment', 'Post-harvest debrief completed',  'Has the farmer attended or participated in the post-season debrief?', 4),
  q('maize', 12, 'farm_enterprise',     'Gross margin calculated',         'Has the farmer calculated gross margin (revenue minus input costs)?', 5),
  q('maize', 12, 'farm_enterprise',     'Next-season plan started',        'Has the farmer begun planning for the next season?', 6),
];

const SOYBEAN: CheckinQuestionTemplate[] = [
  q('soybean', 1, 'agronomy',            'Land ploughed and harrowed',      'Has the plot been ploughed and harrowed to a fine tilth?', 1),
  q('soybean', 1, 'agronomy',            'Rhizobium inoculant used',        'Has the farmer treated seed with the correct Rhizobium inoculant?', 2),
  q('soybean', 1, 'climate_smart',       'Residue incorporated',            'Has previous crop residue been incorporated to improve soil organic matter?', 3),
  q('soybean', 1, 'climate_smart',       'Drainage channels cleared',       'Are drainage channels functional to prevent waterlogging?', 4),
  q('soybean', 1, 'advisory_commitment', 'Pre-season training attended',    'Did the farmer attend the pre-season soybean advisory session?', 5),
  q('soybean', 1, 'farm_enterprise',     'Input budget prepared',           'Has the farmer prepared a budget for soybean inputs?', 6),

  q('soybean', 2, 'agronomy',            'Certified seed used',             'Is the farmer using certified or improved soybean variety seed?', 1),
  q('soybean', 2, 'agronomy',            'Correct row spacing observed',    'Is row spacing within the recommended range (45-60 cm)?', 2),
  q('soybean', 2, 'agronomy',            'Seed rate correct',               'Is the seeding rate within the recommended range (60-80 kg/ha)?', 3),
  q('soybean', 2, 'climate_smart',       'Planting aligned to forecast',    'Was planting timed to coincide with the onset of reliable rains?', 4),
  q('soybean', 2, 'advisory_commitment', 'Followed planting advisory',      'Did the farmer follow the recommended soybean planting guidance?', 5),
  q('soybean', 2, 'farm_enterprise',     'Inputs procured on time',         'Were all required inputs available at planting time?', 6),

  q('soybean', 3, 'agronomy',            'Germination rate satisfactory',   'Has germination reached at least 80% of planted stands?', 1),
  q('soybean', 3, 'agronomy',            'Replanting of gaps done',         'Have gaps been replanted promptly?', 2),
  q('soybean', 3, 'climate_smart',       'Soil moisture adequate',          'Is soil moisture sufficient for early seedling establishment?', 3),
  q('soybean', 3, 'advisory_commitment', 'Early visit completed',           'Has the agent conducted a field visit to confirm stand establishment?', 4),
  q('soybean', 3, 'farm_enterprise',     'Labour for replanting sourced',   'Was labour available promptly for gap filling?', 5),

  q('soybean', 4, 'agronomy',            'First weeding completed',         'Has the plot been weeded at the V1-V3 growth stage?', 1),
  q('soybean', 4, 'agronomy',            'Herbicide applied correctly',     'If herbicide was used, was the correct product applied at the right rate?', 2),
  q('soybean', 4, 'climate_smart',       'Mulching applied',                'Has the farmer applied mulch to conserve moisture and suppress weeds?', 3),
  q('soybean', 4, 'advisory_commitment', 'Weed scouting done with agent',   'Did the farmer and agent conduct a joint weed assessment?', 4),
  q('soybean', 4, 'farm_enterprise',     'Weeding cost recorded',           'Has the cost of weeding (labour + herbicide) been recorded?', 5),

  q('soybean', 5, 'agronomy',            'Soybean aphid scouted',           'Has the farmer checked for aphid infestations (threshold: >250/plant)?', 1),
  q('soybean', 5, 'agronomy',            'Appropriate pest control used',   'If pests are detected, was the recommended control measure applied?', 2),
  q('soybean', 5, 'agronomy',            'Bacterial pustule / rust checked', 'Are any foliar disease symptoms (bacterial pustule, Asian soybean rust) visible?', 3),
  q('soybean', 5, 'climate_smart',       'Field hygiene maintained',        'Has the farmer removed and destroyed heavily infected plant material?', 4),
  q('soybean', 5, 'advisory_commitment', 'Pest report submitted to agent',  'Has the farmer reported any pest/disease outbreaks to the agent?', 5),
  q('soybean', 5, 'farm_enterprise',     'Pest control cost recorded',      'Have the costs of pest and disease management been recorded?', 6),

  q('soybean', 6, 'agronomy',            'Flowering commenced',             'Has the crop reached the R1 (first flower) growth stage?', 1),
  q('soybean', 6, 'agronomy',            'Nodule development assessed',     'Are effective (pink/red interior) nodules present on roots?', 2),
  q('soybean', 6, 'climate_smart',       'Moisture stress managed',         'Is the farmer managing moisture during the critical flowering period?', 3),
  q('soybean', 6, 'advisory_commitment', 'Flowering progress reported',     'Has the farmer updated the agent on crop flowering progress?', 4),
  q('soybean', 6, 'farm_enterprise',     'Yield estimation started',        'Has the farmer begun a preliminary yield estimate based on flower set?', 5),

  q('soybean', 7, 'agronomy',            'Pod set uniform',                 'Are pods setting uniformly across the plot (R3-R4 stage)?', 1),
  q('soybean', 7, 'agronomy',            'Pod borers scouted',              'Has the farmer checked for pod-boring insects?', 2),
  q('soybean', 7, 'climate_smart',       'Drought stress mitigated',        'Is the farmer managing any drought stress during pod set?', 3),
  q('soybean', 7, 'advisory_commitment', 'Pod-set advisory received',       'Has the agent provided guidance on managing the pod-set period?', 4),
  q('soybean', 7, 'farm_enterprise',     'Labour plan for harvest prepared', 'Has the farmer planned labour requirements for the upcoming harvest?', 5),

  q('soybean', 8, 'agronomy',            'Grain fill satisfactory',         'Are seeds developing fully within pods (R5-R6 stage)?', 1),
  q('soybean', 8, 'agronomy',            'Late-season disease checked',     'Has the farmer scouted for late-season foliar diseases?', 2),
  q('soybean', 8, 'climate_smart',       'Water stress managed',            'Is the farmer managing water or heat stress during grain fill?', 3),
  q('soybean', 8, 'advisory_commitment', 'Grain fill advisory received',    'Has the agent provided guidance on managing the grain-fill period?', 4),
  q('soybean', 8, 'farm_enterprise',     'Input expenditure updated',       'Has total input expenditure been updated in farm records?', 5),

  q('soybean', 9, 'agronomy',            'Crop maturity assessed',          'Has the farmer checked pod colour and leaf senescence (R7-R8 stage)?', 1),
  q('soybean', 9, 'agronomy',            'Field drying underway',           'Is the crop field-drying adequately before harvest?', 2),
  q('soybean', 9, 'climate_smart',       'Harvest timing adjusted for weather', 'Is the farmer adjusting harvest timing based on weather forecast?', 3),
  q('soybean', 9, 'advisory_commitment', 'Harvest date confirmed with agent', 'Has the farmer confirmed the harvest date with the agent?', 4),
  q('soybean', 9, 'farm_enterprise',     'Market arrangements made',        'Has the farmer identified a buyer or market channel for the harvest?', 5),

  q('soybean', 10, 'agronomy',            'Harvest method appropriate',     'Is the farmer using the correct harvesting method to minimise pod shatter?', 1),
  q('soybean', 10, 'agronomy',            'Losses minimised',               'Are harvest losses (pod shatter, threshing losses) being kept below threshold?', 2),
  q('soybean', 10, 'climate_smart',       'Weather window used',            'Was harvesting timed during a dry weather window?', 3),
  q('soybean', 10, 'advisory_commitment', 'Harvest data shared with agent', 'Has the farmer reported actual yield data to the agent?', 4),
  q('soybean', 10, 'farm_enterprise',     'Yield recorded',                 'Has the total yield (bags or kg) been recorded in the farm record book?', 5),

  q('soybean', 11, 'agronomy',            'Grain dried to safe moisture',   'Has grain been dried to 12% moisture content or below before storage?', 1),
  q('soybean', 11, 'agronomy',            'Grain stored appropriately',     'Is grain stored in a clean, pest-free facility or hermetic bag?', 2),
  q('soybean', 11, 'climate_smart',       'Storage method climate-smart',   'Is the farmer using hermetic storage to reduce post-harvest losses?', 3),
  q('soybean', 11, 'advisory_commitment', 'Post-harvest debrief completed', 'Has the farmer attended or participated in the post-season debrief?', 4),
  q('soybean', 11, 'farm_enterprise',     'Gross margin calculated',        'Has the farmer calculated gross margin (revenue minus input costs)?', 5),
  q('soybean', 11, 'farm_enterprise',     'Next-season plan started',       'Has the farmer begun planning inputs and variety selection for next season?', 6),
];

const COCOA: CheckinQuestionTemplate[] = [
  // Week 1: Land Preparation & Sanitation
  q('cocoa', 1, 'agronomy',            'Cleared and prepared cocoa plot',      'Has the farmer cleared weeds, debris, and old pod husks from the plot to prepare for the season?', 1),
  q('cocoa', 1, 'agronomy',            'Removed diseased and dead trees',      'Has the farmer identified and removed trees showing signs of CSSVD or other disease?', 2),
  q('cocoa', 1, 'climate_smart',       'Maintained shade trees',               'Has the farmer checked shade tree canopy and ensured adequate shade cover?', 3),
  q('cocoa', 1, 'advisory_commitment', 'Attended pre-season training',         'Did the farmer participate in the pre-season cocoa advisory session on farm sanitation?', 4),
  q('cocoa', 1, 'farm_enterprise',     'Prepared input budget',                'Has the farmer prepared a budget for cocoa inputs and labour this season?', 5),

  // Week 2: Sanitation & Shade Assessment
  q('cocoa', 2, 'agronomy',            'Sanitised farm by removing pod husks', 'Has the farmer removed and destroyed old pod husks and mummified pods to reduce black pod inoculum?', 1),
  q('cocoa', 2, 'agronomy',            'Checked shade tree density',           'Has the farmer assessed whether shade tree cover is within the recommended 30–40% canopy range?', 2),
  q('cocoa', 2, 'climate_smart',       'Planted or maintained shade trees',    'Has the farmer planted new shade trees or maintained existing ones to regulate microclimate?', 3),
  q('cocoa', 2, 'advisory_commitment', 'Received farm sanitation visit',       'Has the agent visited the farm to assess sanitation and shade management?', 4),
  q('cocoa', 2, 'farm_enterprise',     'Recorded sanitation labour costs',     'Has the farmer recorded the cost of labour for farm sanitation and shade management?', 5),

  // Week 3: Planting & Gap Filling
  q('cocoa', 3, 'agronomy',            'Planted cocoa seedlings in gaps',      'Has the farmer filled gaps in the cocoa plot with healthy, certified cocoa seedlings?', 1),
  q('cocoa', 3, 'agronomy',            'Used certified planting material',    'Did the farmer source seedlings from a certified nursery or Cocoa Research Institute?', 2),
  q('cocoa', 3, 'climate_smart',       'Planted at correct spacing',           'Has the farmer planted seedlings at the recommended spacing of 3m × 3m or as advised?', 3),
  q('cocoa', 3, 'advisory_commitment', 'Followed planting advisory',           'Did the farmer follow the recommended cocoa planting guidance from the agent?', 4),
  q('cocoa', 3, 'farm_enterprise',     'Procured seedlings on time',           'Did the farmer have seedlings ready and plant them at the right time?', 5),
  q('cocoa', 3, 'farm_enterprise',     'Recorded seedling costs',             'Has the farmer recorded the cost of seedlings and planting labour in farm records?', 6),

  // Week 4: Seedling Establishment & Shade
  q('cocoa', 4, 'agronomy',            'Seedlings establishing well',         'Are newly planted seedlings showing healthy growth and establishment?', 1),
  q('cocoa', 4, 'agronomy',            'Replanted failed seedlings',          'Has the farmer identified and replanted any seedlings that failed to establish?', 2),
  q('cocoa', 4, 'climate_smart',       'Mulched around seedlings',            'Has the farmer applied mulch around young seedlings to conserve moisture and suppress weeds?', 3),
  q('cocoa', 4, 'advisory_commitment', 'Received establishment visit',        'Has the agent visited to confirm that seedlings are establishing properly?', 4),
  q('cocoa', 4, 'farm_enterprise',     'Sourced labour for replanting',       'Was labour available promptly for replanting failed seedlings?', 5),

  // Week 5: Shade Management & Canopy Thinning
  q('cocoa', 5, 'agronomy',            'Thinned shade canopy',                'Has the farmer pruned or thinned shade trees to achieve the recommended 30–40% shade cover?', 1),
  q('cocoa', 5, 'agronomy',            'Removed unwanted chupons',            'Has the farmer removed unwanted chupons (water sprouts) from the base of cocoa trees?', 2),
  q('cocoa', 5, 'climate_smart',       'Managed shade for airflow',            'Has the farmer adjusted shade to improve air circulation through the cocoa plot?', 3),
  q('cocoa', 5, 'advisory_commitment', 'Followed shade management advisory',  'Did the farmer follow the recommended shade management guidance from the agent?', 4),
  q('cocoa', 5, 'farm_enterprise',     'Recorded shade management costs',     'Has the farmer recorded the cost of shade management and pruning labour?', 5),

  // Week 6: Shade Regulation & Soil Cover
  q('cocoa', 6, 'agronomy',            'Assessed shade tree species mix',     'Has the farmer checked that shade tree species are appropriate and balanced for cocoa?', 1),
  q('cocoa', 6, 'climate_smart',       'Applied mulch for soil cover',        'Has the farmer applied mulch or leaf litter to protect soil from erosion and moisture loss?', 2),
  q('cocoa', 6, 'climate_smart',       'Maintained ground cover vegetation', 'Has the farmer kept beneficial ground cover vegetation between cocoa trees?', 3),
  q('cocoa', 6, 'advisory_commitment', 'Received shade assessment visit',     'Has the agent visited to assess shade regulation and soil cover practices?', 4),
  q('cocoa', 6, 'farm_enterprise',     'Updated maintenance costs',           'Has the farmer updated farm records with the costs of shade and soil management?', 5),

  // Week 7: Weed Management
  q('cocoa', 7, 'agronomy',            'Completed weeding',                   'Has the farmer weeded the cocoa plot to reduce competition for nutrients and moisture?', 1),
  q('cocoa', 7, 'agronomy',            'Used correct weed control method',    'Did the farmer use manual weeding or recommended herbicide at the correct rate?', 2),
  q('cocoa', 7, 'climate_smart',       'Used mulch for weed suppression',    'Has the farmer applied mulch to suppress weed regrowth and conserve soil moisture?', 3),
  q('cocoa', 7, 'advisory_commitment', 'Did weed scouting with agent',         'Did the farmer and agent conduct a joint weed assessment?', 4),
  q('cocoa', 7, 'farm_enterprise',     'Recorded weeding costs',             'Has the farmer recorded the cost of weeding, including labour and materials?', 5),

  // Week 8: Weed Suppression & Mulching
  q('cocoa', 8, 'agronomy',            'Maintained weed-free basins',         'Has the farmer kept the basins around cocoa trees free of weeds?', 1),
  q('cocoa', 8, 'climate_smart',       'Applied organic mulch',               'Has the farmer applied organic mulch such as cocoa pod husks or leaf litter to the plot?', 2),
  q('cocoa', 8, 'climate_smart',       'Practised erosion control',           'Has the farmer maintained erosion-control structures on sloping parts of the farm?', 3),
  q('cocoa', 8, 'advisory_commitment', 'Followed mulching advisory',          'Did the farmer follow the recommended mulching and weed suppression guidance from the agent?', 4),
  q('cocoa', 8, 'farm_enterprise',     'Recorded mulching costs',             'Has the farmer recorded the cost of mulch materials and application labour?', 5),

  // Week 9: Fertiliser Application
  q('cocoa', 9, 'agronomy',            'Applied fertiliser to cocoa trees',   'Has the farmer applied the recommended fertiliser (e.g. NPK 15-15-15 or Asomddin) to the cocoa?', 1),
  q('cocoa', 9, 'agronomy',            'Applied fertiliser at correct rate',   'Was fertiliser applied at the recommended rate per tree or per hectare?', 2),
  q('cocoa', 9, 'agronomy',            'Placed fertiliser correctly',         'Was fertiliser applied in a ring around the tree, avoiding direct contact with the trunk?', 3),
  q('cocoa', 9, 'climate_smart',       'Timed fertiliser with rainfall',      'Was fertiliser applied during or just before rainfall to improve uptake?', 4),
  q('cocoa', 9, 'advisory_commitment', 'Followed fertiliser advisory',       'Did the farmer use the fertiliser type and rate recommended by the agent?', 5),
  q('cocoa', 9, 'farm_enterprise',     'Recorded fertiliser costs',          'Has the farmer recorded the cost of fertiliser and application labour in farm records?', 6),

  // Week 10: Nutrient Management & Soil Testing
  q('cocoa', 10, 'agronomy',           'Conducted a soil test',               'Has the farmer had their soil tested to guide nutrient management decisions?', 1),
  q('cocoa', 10, 'agronomy',           'Checked for nutrient deficiency signs', 'Has the farmer looked for signs of nutrient deficiency such as yellowing leaves or poor growth?', 2),
  q('cocoa', 10, 'climate_smart',      'Applied organic compost',            'Has the farmer applied compost or organic matter to improve soil fertility?', 3),
  q('cocoa', 10, 'advisory_commitment', 'Received nutrient management guidance', 'Has the agent provided guidance on nutrient management based on soil test results?', 4),
  q('cocoa', 10, 'farm_enterprise',    'Updated input expenditure',          'Has the farmer updated total input expenditure in farm records?', 5),

  // Week 11: Pruning & Canopy Shaping
  q('cocoa', 11, 'agronomy',           'Pruned cocoa trees',                 'Has the farmer pruned cocoa trees to improve canopy structure and airflow?', 1),
  q('cocoa', 11, 'agronomy',           'Removed diseased and dead branches', 'Has the farmer removed branches showing signs of disease or dieback from cocoa trees?', 2),
  q('cocoa', 11, 'climate_smart',      'Improved airflow through pruning',  'Has the farmer pruned to improve air circulation, which helps reduce humidity-driven diseases?', 3),
  q('cocoa', 11, 'advisory_commitment', 'Followed pruning advisory',        'Did the farmer follow the recommended pruning guidance from the agent?', 4),
  q('cocoa', 11, 'farm_enterprise',    'Recorded pruning costs',            'Has the farmer recorded the cost of pruning labour in farm records?', 5),

  // Week 12: Structural Pruning & Sanitation
  q('cocoa', 12, 'agronomy',           'Did structural pruning',             'Has the farmer performed structural pruning to develop a strong jorquette framework?', 1),
  q('cocoa', 12, 'agronomy',           'Removed mistletoe and epiphytes',   'Has the farmer removed mistletoe and parasitic epiphytes from cocoa trees?', 2),
  q('cocoa', 12, 'climate_smart',      'Sanitised pruning tools',           'Has the farmer disinfected pruning tools between trees to prevent disease spread?', 3),
  q('cocoa', 12, 'advisory_commitment', 'Received pruning quality visit',   'Has the agent visited to check the quality of pruning work?', 4),
  q('cocoa', 12, 'farm_enterprise',    'Updated maintenance records',      'Has the farmer updated farm records with the costs of structural pruning and sanitation?', 5),

  // Week 13: Pest & Disease Scouting (CSSVD, Capsids, Black Pod)
  q('cocoa', 13, 'agronomy',           'Scouted for CSSVD symptoms',         'Has the farmer checked cocoa trees for signs of Cocoa Swollen Shoot Virus Disease (CSSVD)?', 1),
  q('cocoa', 13, 'agronomy',           'Scouted for capsid (mirid) damage',  'Has the farmer checked pods and stems for capsid (mirid) feeding damage?', 2),
  q('cocoa', 13, 'agronomy',           'Scouted for black pod disease',    'Has the farmer checked pods for signs of black pod disease (Phytophthora)?', 3),
  q('cocoa', 13, 'climate_smart',      'Removed infected pods and material', 'Has the farmer removed and destroyed infected pods and plant material to reduce disease spread?', 4),
  q('cocoa', 13, 'advisory_commitment', 'Reported pest and disease findings', 'Has the farmer informed the agent of any CSSVD, capsid, or black pod findings?', 5),
  q('cocoa', 13, 'farm_enterprise',    'Recorded scouting and control costs', 'Has the farmer recorded the costs of pest and disease scouting and any control measures?', 6),

  // Week 14: Disease Management & CSSVD Monitoring
  q('cocoa', 14, 'agronomy',           'Applied black pod control measures', 'Has the farmer applied the recommended fungicide or cultural practice to manage black pod disease?', 1),
  q('cocoa', 14, 'agronomy',           'Reported suspected CSSVD trees',   'Has the farmer reported any trees suspected of CSSVD to COCOBOD or the agent for confirmation?', 2),
  q('cocoa', 14, 'climate_smart',      'Improved drainage to reduce black pod', 'Has the farmer improved drainage in the plot to reduce the wet conditions that favour black pod?', 3),
  q('cocoa', 14, 'advisory_commitment', 'Received disease management guidance', 'Has the agent provided guidance on managing CSSVD, capsids, and black pod?', 4),
  q('cocoa', 14, 'farm_enterprise',    'Recorded disease management costs', 'Has the farmer recorded the costs of disease management measures in farm records?', 5),

  // Week 15: Harvesting & Pod Breaking
  q('cocoa', 15, 'agronomy',           'Harvested ripe pods',               'Has the farmer harvested only ripe yellow or orange pods, avoiding unripe and overripe ones?', 1),
  q('cocoa', 15, 'agronomy',           'Broke pods without damaging beans', 'Has the farmer broken pods carefully to avoid damaging the cocoa beans inside?', 2),
  q('cocoa', 15, 'climate_smart',      'Timed harvest to weather',          'Was harvesting timed during a dry weather window to ensure good bean quality?', 3),
  q('cocoa', 15, 'advisory_commitment', 'Shared harvest data with agent',   'Has the farmer reported harvest quantities to the agent?', 4),
  q('cocoa', 15, 'farm_enterprise',    'Recorded harvest yield',           'Has the farmer recorded the total weight of the cocoa harvest in the farm record book?', 5),
  q('cocoa', 15, 'farm_enterprise',    'Confirmed offtaker arrangement',  'Has the farmer confirmed a purchase agreement with a Licensed Buying Company (LBC)?', 6),

  // Week 16: Fermentation, Drying & Storage
  q('cocoa', 16, 'agronomy',           'Fermented beans for correct duration', 'Has the farmer fermented cocoa beans for 6–7 days as recommended for quality flavour development?', 1),
  q('cocoa', 16, 'agronomy',           'Dried beans to safe moisture',     'Has the farmer sun-dried cocoa beans to 7–8% moisture content before storage or sale?', 2),
  q('cocoa', 16, 'climate_smart',      'Used proper drying infrastructure', 'Is the farmer using a solar dryer, raised drying platform, or appropriate drying surface?', 3),
  q('cocoa', 16, 'advisory_commitment', 'Completed post-season debrief',   'Has the farmer attended or participated in the post-season cocoa debrief session?', 4),
  q('cocoa', 16, 'farm_enterprise',    'Calculated gross margin',          'Has the farmer calculated gross margin — revenue from cocoa sales minus input costs?', 5),
  q('cocoa', 16, 'farm_enterprise',    'Confirmed no child labour on farm', 'Does the farmer attest that no child labour was used on the cocoa farm this season?', 6),
];

export const CHECKIN_TEMPLATES: CheckinQuestionTemplate[] = [...MAIZE, ...SOYBEAN, ...COCOA];
