export type CropType = 'maize' | 'soybean';
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
    1:  'Land Preparation & Inoculation',
    2:  'Planting & Spacing',
    3:  'Germination & Early Growth',
    4:  'Weed Management',
    5:  'Pest & Disease Scouting',
    6:  'Flowering & Nodule Development',
    7:  'Pod Setting',
    8:  'Grain Fill',
    9:  'Pre-Harvest Assessment',
    10: 'Harvesting',
    11: 'Post-Harvest & Storage',
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

export const CHECKIN_TEMPLATES: CheckinQuestionTemplate[] = [...MAIZE, ...SOYBEAN];
