import type { RegionCode, CropType } from '@/types';

export const REGION_LABELS: Record<RegionCode, string> = {
  AA: 'Ahafo',
  AH: 'Ashanti',
  BA: 'Bono',
  BE: 'Bono East',
  CE: 'Central',
  EP: 'Eastern',
  NE: 'North East',
  NR: 'Northern',
  OT: 'Oti',
  SA: 'Savannah',
  UE: 'Upper East',
  UW: 'Upper West',
  VR: 'Volta',
  WN: 'Western North',
  WR: 'Western',
  SW: 'South Western',
};

export const REGION_OPTIONS = (Object.entries(REGION_LABELS) as [RegionCode, string][]).map(
  ([value, label]) => ({ value, label })
);

export const CROP_LABELS: Record<CropType, string> = {
  maize:     'Maize',
  rice:      'Rice',
  cassava:   'Cassava',
  yam:       'Yam',
  groundnut: 'Groundnut',
  soybean:   'Soybean',
  sorghum:   'Sorghum',
  millet:    'Millet',
  cocoa:     'Cocoa',
  coffee:    'Coffee',
  tomato:    'Tomato',
  pepper:    'Pepper',
  plantain:  'Plantain',
  banana:    'Banana',
  pineapple: 'Pineapple',
  other:     'Other',
};

export const CROP_OPTIONS = (Object.entries(CROP_LABELS) as [CropType, string][]).map(
  ([value, label]) => ({ value, label })
);

export const REGION_CODES = Object.keys(REGION_LABELS) as RegionCode[];
export const CROP_TYPES   = Object.keys(CROP_LABELS) as CropType[];

export const GENDER_LABELS = {
  male:             'Male',
  female:           'Female',
  other:            'Other',
  prefer_not_to_say: 'Prefer not to say',
} as const;

export const RISK_CATEGORY_COLORS = {
  low:      'bg-emerald-100 text-emerald-800',
  medium:   'bg-amber-100 text-amber-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
} as const;

export const RISK_CATEGORY_LABELS = {
  low:      'Low Risk',
  medium:   'Medium Risk',
  high:     'High Risk',
  critical: 'Critical',
} as const;

export const DISTRICTS_BY_REGION: Record<RegionCode, string[]> = {
  AA: ['Asunafo North', 'Asunafo South', 'Asutifi North', 'Asutifi South', 'Tano North', 'Tano South'],
  AH: ['Kumasi Metro', 'Asante Akim Central', 'Asante Akim North', 'Asante Akim South', 'Bekwai', 'Bosome Freho', 'Bosomtwe', 'Ejisu', 'Ejura Sekyedumase', 'Juaben', 'Kwabre East', 'Kwadaso', 'Mampong', 'Obuasi East', 'Obuasi West', 'Offinso North', 'Offinso South', 'Oforikrom', 'Old Tafo', 'Sekyere Afram Plains', 'Sekyere Central', 'Sekyere East', 'Sekyere Kumawu', 'Suame'],
  BA: ['Banda', 'Berekum East', 'Berekum West', 'Dormaa Central', 'Dormaa East', 'Dormaa West', 'Jaman North', 'Jaman South', 'Sunyani', 'Sunyani West', 'Tain', 'Wenchi'],
  BE: ['Atebubu-Amantin', 'Kintampo North', 'Kintampo South', 'Nkoranza North', 'Nkoranza South', 'Pru East', 'Pru West', 'Sene East', 'Sene West', 'Techiman', 'Techiman North'],
  CE: ['Abura/Asebu/Kwamankese', 'Agona East', 'Agona West', 'Ajumako/Enyan/Essiam', 'Asikuma/Odoben/Brakwa', 'Assin Central', 'Assin North', 'Assin South', 'Cape Coast', 'Effutu', 'Ekumfi', 'Gomoa Central', 'Gomoa East', 'Gomoa West', 'Komenda/Edina/Eguafo/Abrem', 'Mfantseman', 'Twifo Atti-Morkwa', 'Twifo/Hemang/Lower Denkyira', 'Upper Denkyira East', 'Upper Denkyira West'],
  EP: ['Abuakwa North', 'Abuakwa South', 'Atiwa East', 'Atiwa West', 'Ayensuano', 'Birim Central', 'Birim North', 'Birim South', 'Denkyembour', 'Fanteakwa North', 'Fanteakwa South', 'Kwaebibirem', 'Kwahu Afram Plains North', 'Kwahu Afram Plains South', 'Kwahu East', 'Kwahu South', 'Kwahu West', 'Lower Manya Krobo', 'New Juaben North', 'New Juaben South', 'Nsawam Adoagyiri', 'Okere', 'Upper Manya Krobo', 'Upper West Akim', 'West Akim', 'Yilo Krobo'],
  NE: ['Bunkpurugu Nakpayili', 'Chereponi', 'East Mamprusi', 'Mamprugu Moagduri', 'West Mamprusi', 'Yunyoo-Nasuan'],
  NR: ['Gushegu', 'Karaga', 'Kpandai', 'Kumbungu', 'Mion', 'Nanton', 'Nanumba North', 'Nanumba South', 'Saboba', 'Sagnarigu', 'Savelugu', 'Tamale Metro', 'Tatale Sangule', 'Tolon', 'Zabzugu'],
  OT: ['Biakoye', 'Buem', 'Guan', 'Jasikan', 'Kadjebi', 'Krachi East', 'Krachi Nchumuru', 'Krachi West', 'Nkwanta North', 'Nkwanta South'],
  SA: ['Bole', 'Central Gonja', 'East Gonja', 'North East Gonja', 'North Gonja', 'Sawla-Tuna-Kalba', 'West Gonja'],
  UE: ['Bawku', 'Bawku West', 'Binduri', 'Bolgatanga East', 'Bolgatanga Metro', 'Bongo', 'Builsa North', 'Builsa South', 'Kassena Nankana East', 'Kassena Nankana West', 'Nabdam', 'Pusiga', 'Talensi', 'Tempane'],
  UW: ['Daffiama Bussie Issa', 'Jirapa', 'Lambussie Karni', 'Lawra', 'Nadowli-Kaleo', 'Nandom', 'Sissala East', 'Sissala West', 'Wa East', 'Wa Metro', 'Wa West'],
  VR: ['Adaklu', 'Afadzato South', 'Agotime Ziope', 'Akatsi North', 'Akatsi South', 'Anloga', 'Central Tongu', 'Ho', 'Ho West', 'Hohoe', 'Keta', 'Ketu North', 'Ketu South', 'Kpando', 'North Dayi', 'North Tongu', 'South Dayi', 'South Tongu'],
  WN: ['Amenfi Central', 'Amenfi East', 'Amenfi West', 'Bia East', 'Bia West', 'Bibiani/Anhwiaso/Bekwai', 'Bodi', 'Juaboso', 'Sefwi Akontombra', 'Sefwi Wiawso', 'Suaman'],
  WR: ['Ahanta West', 'Effia-Kwesimintsim', 'Ellembelle', 'Jomoro', 'Mpohor', 'Nzema East', 'Prestea Huni Valley', 'Sekondi-Takoradi', 'Shama', 'Tarkwa Nsuaem', 'Wassa Amenfi Central', 'Wassa East'],
  SW: ['Nzema East', 'Ellembelle', 'Jomoro', 'Ahanta West', 'Shama'],
};

export const FARMER_EMAIL_DOMAIN = '@cropguard.ag';

export function phoneToEmail(phone: string): string {
  const normalized = phone.replace(/\s+/g, '').replace(/^0/, '+233');
  return `${normalized}${FARMER_EMAIL_DOMAIN}`;
}

// ── Checkin question templates ────────────────────────────────────────────────

export type CheckinCropType = 'maize' | 'soybean';
export type CheckinComponent = 'agronomy' | 'climate_smart' | 'advisory_commitment' | 'farm_enterprise';

export interface CheckinQuestionTemplate {
  crop_type: CheckinCropType;
  week_number: number;
  week_title: string;
  component: CheckinComponent;
  label: string;
  description: string;
  sort_order: number;
}

export const WEEK_TITLES: Record<CheckinCropType, Record<number, string>> = {
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

function _cq(
  crop: CheckinCropType, week: number, component: CheckinComponent,
  label: string, description: string, sort: number,
): CheckinQuestionTemplate {
  return { crop_type: crop, week_number: week, week_title: WEEK_TITLES[crop][week], component, label, description, sort_order: sort };
}

export const CHECKIN_TEMPLATES: CheckinQuestionTemplate[] = [
  // ── Maize – Week 1
  _cq('maize', 1, 'agronomy',            'I ploughed my land',                    'I tilled my plot to the recommended depth for a good seedbed.', 1),
  _cq('maize', 1, 'agronomy',            'I conducted a soil test',               'I had my soil tested this season to guide my fertiliser decisions.', 2),
  _cq('maize', 1, 'climate_smart',       'I managed my crop residue',             'I incorporated or properly managed residue from the previous season.', 3),
  _cq('maize', 1, 'climate_smart',       'I built contour ridges or bunds',       'I put erosion-control structures in place on sloping parts of my land.', 4),
  _cq('maize', 1, 'advisory_commitment', 'I attended the pre-season training',    'I participated in the pre-season advisory session.', 5),
  _cq('maize', 1, 'farm_enterprise',     'I prepared my input budget',            'I prepared a budget for my inputs this season.', 6),
  // ── Maize – Week 2
  _cq('maize', 2, 'agronomy',            'I used certified seed',                 'I planted with certified or improved variety seed.', 1),
  _cq('maize', 2, 'agronomy',            'I planted at the correct seed rate',    'I planted at the recommended density of 25,000–35,000 plants per hectare.', 2),
  _cq('maize', 2, 'agronomy',            'I planted at the correct depth',        'I planted my seed at the recommended depth of 5–7 cm.', 3),
  _cq('maize', 2, 'climate_smart',       'I timed planting to the forecast',      'I timed my planting according to the seasonal rainfall forecast.', 4),
  _cq('maize', 2, 'advisory_commitment', 'I followed the planting advisory',      'I followed the recommended planting guidance from my agent.', 5),
  _cq('maize', 2, 'farm_enterprise',     'I procured my inputs on time',          'I had all required inputs ready at planting time.', 6),
  // ── Maize – Week 3
  _cq('maize', 3, 'agronomy',            'My germination rate is satisfactory',   'My crop germinated to at least 80% of planted stands.', 1),
  _cq('maize', 3, 'agronomy',            'I filled the gaps by replanting',       'I replanted missing stands within 5 days of identifying gaps.', 2),
  _cq('maize', 3, 'climate_smart',       'My soil moisture is adequate',          'My soil has enough moisture for early seedling establishment.', 3),
  _cq('maize', 3, 'advisory_commitment', 'I received an early field visit',       'My agent visited to confirm that my stands are well established.', 4),
  _cq('maize', 3, 'farm_enterprise',     'I sourced labour for replanting',       'I had labour available promptly for gap filling.', 5),
  // ── Maize – Week 4
  _cq('maize', 4, 'agronomy',            'I applied my basal fertiliser',         'I applied the recommended basal fertiliser (e.g. NPK) to my crop.', 1),
  _cq('maize', 4, 'agronomy',            'I applied fertiliser at the right rate', 'I applied fertiliser at the recommended rate per hectare.', 2),
  _cq('maize', 4, 'agronomy',            'I placed fertiliser correctly',         'I banded or placed my fertiliser to avoid burning the crop.', 3),
  _cq('maize', 4, 'climate_smart',       'I timed fertiliser with rainfall',      'I applied fertiliser before or just after rain to reduce losses.', 4),
  _cq('maize', 4, 'advisory_commitment', 'I followed the fertiliser advisory',    'I used the fertiliser type recommended by my agent.', 5),
  _cq('maize', 4, 'farm_enterprise',     'I recorded my fertiliser cost',         'I entered the cost of fertiliser in my farm record book.', 6),
  // ── Maize – Week 5
  _cq('maize', 5, 'agronomy',            'I completed my first weeding',          'I weeded my plot before the crop reached the 3–4 leaf stage.', 1),
  _cq('maize', 5, 'agronomy',            'I applied herbicide correctly',         'I applied herbicide at the correct rate and timing.', 2),
  _cq('maize', 5, 'climate_smart',       'I applied mulch',                       'I mulched my plot to suppress weeds and retain soil moisture.', 3),
  _cq('maize', 5, 'advisory_commitment', 'I did weed scouting with my agent',     'I conducted a joint weed assessment with my agent.', 4),
  _cq('maize', 5, 'farm_enterprise',     'I recorded my weeding cost',            'I recorded the cost of weeding, including labour and herbicide.', 5),
  // ── Maize – Week 6
  _cq('maize', 6, 'agronomy',            'I scouted my crop for Fall Armyworm',   'I checked my crop for FAW egg masses and damage signs.', 1),
  _cq('maize', 6, 'agronomy',            'I applied the right pest control',      'I applied the recommended control measure when pests were detected.', 2),
  _cq('maize', 6, 'agronomy',            'I checked for disease symptoms',        'I looked for foliar disease symptoms such as grey leaf spot or streak virus.', 3),
  _cq('maize', 6, 'climate_smart',       'I maintained field hygiene',            'I removed and destroyed heavily infected plant material from my plot.', 4),
  _cq('maize', 6, 'advisory_commitment', 'I reported pests and disease to my agent', 'I informed my agent of any pest or disease outbreaks on my farm.', 5),
  _cq('maize', 6, 'farm_enterprise',     'I recorded my pest control costs',      'I recorded the costs of pest and disease management.', 6),
  // ── Maize – Week 7
  _cq('maize', 7, 'agronomy',            'I applied my top-dressing',             'I applied urea or CAN as top-dressing fertiliser.', 1),
  _cq('maize', 7, 'agronomy',            'I checked for micronutrient deficiency', 'I looked for signs of zinc or sulphur deficiency in my crop.', 2),
  _cq('maize', 7, 'climate_smart',       'I managed moisture during rapid growth', 'I managed moisture stress during the rapid growth phase.', 3),
  _cq('maize', 7, 'advisory_commitment', 'I followed the top-dressing advisory',  'I followed the recommended top-dressing guidance from my agent.', 4),
  _cq('maize', 7, 'farm_enterprise',     'I updated my input expenditure',        'I updated my total input expenditure in my farm records.', 5),
  // ── Maize – Week 8
  _cq('maize', 8, 'agronomy',            'My crop is tasselling uniformly',       'My crop has reached tasselling stage uniformly across the plot.', 1),
  _cq('maize', 8, 'agronomy',            'My silk emergence is uniform',          'My silk emergence is synchronised with tassel pollen shed.', 2),
  _cq('maize', 8, 'climate_smart',       'I managed moisture during flowering',   'My crop is receiving adequate moisture during the critical flowering window.', 3),
  _cq('maize', 8, 'advisory_commitment', 'I reported my flowering progress',      'I updated my agent on the flowering progress of my crop.', 4),
  _cq('maize', 8, 'farm_enterprise',     'I started my yield estimate',           'I began a preliminary yield estimate based on cob set.', 5),
  // ── Maize – Week 9
  _cq('maize', 9, 'agronomy',            'My cobs are developing well',           'My cobs are developing uniformly with good grain fill.', 1),
  _cq('maize', 9, 'agronomy',            'I checked for late-season disease',     'I scouted for late-season diseases such as ear rot and aflatoxin risk.', 2),
  _cq('maize', 9, 'climate_smart',       'I managed water stress during grain fill', 'I managed any water or heat stress affecting my crop during grain fill.', 3),
  _cq('maize', 9, 'advisory_commitment', 'I received grain fill guidance',        'My agent provided me with guidance on managing the grain-fill period.', 4),
  _cq('maize', 9, 'farm_enterprise',     'I planned my harvest labour',           'I planned the labour I will need for the upcoming harvest.', 5),
  // ── Maize – Week 10
  _cq('maize', 10, 'agronomy',            'I assessed my crop maturity',          'I checked husk colour, black layer formation, or kernel hardness.', 1),
  _cq('maize', 10, 'agronomy',            'I am field-drying my crop',            'I am field-drying my crop adequately before harvest.', 2),
  _cq('maize', 10, 'climate_smart',       'I adjusted my harvest timing to the weather', 'I checked the weather forecast and adjusted my harvest timing accordingly.', 3),
  _cq('maize', 10, 'advisory_commitment', 'I confirmed my harvest date with my agent', 'I confirmed my planned harvest date with my agent.', 4),
  _cq('maize', 10, 'farm_enterprise',     'I made my market arrangements',        'I identified a buyer or market channel for my harvest.', 5),
  // ── Maize – Week 11
  _cq('maize', 11, 'agronomy',            'I used the right harvesting method',   'I harvested using the correct method, whether manual or mechanical.', 1),
  _cq('maize', 11, 'agronomy',            'I minimised my harvest losses',        'I kept my harvest losses below the recommended threshold.', 2),
  _cq('maize', 11, 'climate_smart',       'I harvested in a dry weather window',  'I timed my harvest during a dry weather window.', 3),
  _cq('maize', 11, 'advisory_commitment', 'I shared my harvest data with my agent', 'I reported my actual yield data to my agent.', 4),
  _cq('maize', 11, 'farm_enterprise',     'I recorded my yield',                  'I recorded the total yield in bags or kilograms in my farm record book.', 5),
  // ── Maize – Week 12
  _cq('maize', 12, 'agronomy',            'I dried my grain to safe moisture',    'I dried my grain to 13% moisture content or below before storage.', 1),
  _cq('maize', 12, 'agronomy',            'I stored my grain appropriately',      'I stored my grain in a clean, pest-free facility or hermetic bag.', 2),
  _cq('maize', 12, 'climate_smart',       'I used a climate-smart storage method', 'I used hermetic storage or metal silos to reduce post-harvest losses.', 3),
  _cq('maize', 12, 'advisory_commitment', 'I completed the post-harvest debrief', 'I attended or participated in the post-season debrief session.', 4),
  _cq('maize', 12, 'farm_enterprise',     'I calculated my gross margin',         'I calculated my gross margin — revenue minus input costs.', 5),
  _cq('maize', 12, 'farm_enterprise',     'I started planning for next season',   'I have begun planning my inputs and activities for next season.', 6),
  // ── Soybean – Week 1
  _cq('soybean', 1, 'agronomy',            'I ploughed and harrowed my land',       'I ploughed and harrowed my plot to a fine tilth ready for planting.', 1),
  _cq('soybean', 1, 'agronomy',            'I treated my seed with Rhizobium inoculant', 'I applied the correct Rhizobium inoculant to my seed before planting.', 2),
  _cq('soybean', 1, 'climate_smart',       'I incorporated my crop residue',        'I incorporated previous crop residue to improve soil organic matter.', 3),
  _cq('soybean', 1, 'climate_smart',       'I cleared my drainage channels',        'I cleared my drainage channels to prevent waterlogging.', 4),
  _cq('soybean', 1, 'advisory_commitment', 'I attended the pre-season training',    'I attended the pre-season soybean advisory session.', 5),
  _cq('soybean', 1, 'farm_enterprise',     'I prepared my input budget',            'I prepared a budget for my soybean inputs this season.', 6),
  // ── Soybean – Week 2
  _cq('soybean', 2, 'agronomy',            'I used certified soybean seed',         'I planted with certified or improved soybean variety seed.', 1),
  _cq('soybean', 2, 'agronomy',            'I used the correct row spacing',        'I planted at the recommended row spacing of 45–60 cm.', 2),
  _cq('soybean', 2, 'agronomy',            'I planted at the correct seed rate',    'I used a seeding rate within the recommended range of 60–80 kg per hectare.', 3),
  _cq('soybean', 2, 'climate_smart',       'I timed my planting to the forecast',   'I timed planting to coincide with the onset of reliable rains.', 4),
  _cq('soybean', 2, 'advisory_commitment', 'I followed the planting advisory',      'I followed the recommended soybean planting guidance from my agent.', 5),
  _cq('soybean', 2, 'farm_enterprise',     'I procured my inputs on time',          'I had all required inputs ready at planting time.', 6),
  // ── Soybean – Week 3
  _cq('soybean', 3, 'agronomy',            'My germination rate is satisfactory',   'My crop germinated to at least 80% of planted stands.', 1),
  _cq('soybean', 3, 'agronomy',            'I replanted the gaps promptly',         'I replanted gaps as soon as I identified missing stands.', 2),
  _cq('soybean', 3, 'climate_smart',       'My soil moisture is adequate',          'My soil has enough moisture for early seedling establishment.', 3),
  _cq('soybean', 3, 'advisory_commitment', 'I received an early field visit',       'My agent visited to confirm that my stands are well established.', 4),
  _cq('soybean', 3, 'farm_enterprise',     'I sourced labour for replanting',       'I had labour available promptly for gap filling.', 5),
  // ── Soybean – Week 4
  _cq('soybean', 4, 'agronomy',            'I completed my first weeding',          'I weeded my plot at the V1–V3 growth stage.', 1),
  _cq('soybean', 4, 'agronomy',            'I applied herbicide correctly',         'I applied the correct herbicide product at the right rate.', 2),
  _cq('soybean', 4, 'climate_smart',       'I applied mulch',                       'I applied mulch to conserve moisture and suppress weeds.', 3),
  _cq('soybean', 4, 'advisory_commitment', 'I did weed scouting with my agent',     'I conducted a joint weed assessment with my agent.', 4),
  _cq('soybean', 4, 'farm_enterprise',     'I recorded my weeding cost',            'I recorded the cost of weeding, including labour and herbicide.', 5),
  // ── Soybean – Week 5
  _cq('soybean', 5, 'agronomy',            'I scouted for soybean aphids',          'I checked my crop for aphid infestations above the threshold of 250 per plant.', 1),
  _cq('soybean', 5, 'agronomy',            'I applied the right pest control',      'I applied the recommended control measure when pests were detected.', 2),
  _cq('soybean', 5, 'agronomy',            'I checked for bacterial pustule and rust', 'I looked for signs of bacterial pustule or Asian soybean rust on my crop.', 3),
  _cq('soybean', 5, 'climate_smart',       'I maintained field hygiene',            'I removed and destroyed heavily infected plant material from my plot.', 4),
  _cq('soybean', 5, 'advisory_commitment', 'I reported pests and disease to my agent', 'I informed my agent of any pest or disease outbreaks on my farm.', 5),
  _cq('soybean', 5, 'farm_enterprise',     'I recorded my pest control costs',      'I recorded the costs of pest and disease management.', 6),
  // ── Soybean – Week 6
  _cq('soybean', 6, 'agronomy',            'My crop has started flowering',         'My crop has reached the R1 first-flower growth stage.', 1),
  _cq('soybean', 6, 'agronomy',            'I checked my nodule development',       'I checked my roots and found effective pink or red-interior nodules.', 2),
  _cq('soybean', 6, 'climate_smart',       'I managed moisture during flowering',   'I managed moisture during the critical flowering period.', 3),
  _cq('soybean', 6, 'advisory_commitment', 'I reported my flowering progress',      'I updated my agent on the flowering progress of my crop.', 4),
  _cq('soybean', 6, 'farm_enterprise',     'I started my yield estimate',           'I began a preliminary yield estimate based on flower set.', 5),
  // ── Soybean – Week 7
  _cq('soybean', 7, 'agronomy',            'My pods are setting uniformly',         'My pods are setting uniformly across the plot at the R3–R4 stage.', 1),
  _cq('soybean', 7, 'agronomy',            'I scouted for pod borers',              'I checked my crop for pod-boring insects.', 2),
  _cq('soybean', 7, 'climate_smart',       'I managed drought stress at pod set',   'I managed any drought stress affecting my crop during pod set.', 3),
  _cq('soybean', 7, 'advisory_commitment', 'I received pod-set guidance',           'My agent provided me with guidance on managing the pod-set period.', 4),
  _cq('soybean', 7, 'farm_enterprise',     'I planned my harvest labour',           'I planned the labour I will need for the upcoming harvest.', 5),
  // ── Soybean – Week 8
  _cq('soybean', 8, 'agronomy',            'My grain fill is satisfactory',         'My seeds are developing fully within pods at the R5–R6 stage.', 1),
  _cq('soybean', 8, 'agronomy',            'I checked for late-season disease',     'I scouted my crop for late-season foliar diseases.', 2),
  _cq('soybean', 8, 'climate_smart',       'I managed water stress during grain fill', 'I managed any water or heat stress affecting my crop during grain fill.', 3),
  _cq('soybean', 8, 'advisory_commitment', 'I received grain fill guidance',        'My agent provided me with guidance on managing the grain-fill period.', 4),
  _cq('soybean', 8, 'farm_enterprise',     'I updated my input expenditure',        'I updated my total input expenditure in my farm records.', 5),
  // ── Soybean – Week 9
  _cq('soybean', 9, 'agronomy',            'I assessed my crop maturity',           'I checked pod colour and leaf senescence at the R7–R8 stage.', 1),
  _cq('soybean', 9, 'agronomy',            'My crop is field-drying',               'My crop is field-drying adequately before harvest.', 2),
  _cq('soybean', 9, 'climate_smart',       'I adjusted my harvest timing to the weather', 'I checked the weather forecast and adjusted my harvest timing accordingly.', 3),
  _cq('soybean', 9, 'advisory_commitment', 'I confirmed my harvest date with my agent', 'I confirmed my planned harvest date with my agent.', 4),
  _cq('soybean', 9, 'farm_enterprise',     'I made my market arrangements',         'I identified a buyer or market channel for my harvest.', 5),
  // ── Soybean – Week 10
  _cq('soybean', 10, 'agronomy',            'I used the right harvesting method',   'I harvested using the correct method to minimise pod shatter.', 1),
  _cq('soybean', 10, 'agronomy',            'I minimised my harvest losses',        'I kept pod shatter and threshing losses below the recommended threshold.', 2),
  _cq('soybean', 10, 'climate_smart',       'I harvested in a dry weather window',  'I timed my harvest during a dry weather window.', 3),
  _cq('soybean', 10, 'advisory_commitment', 'I shared my harvest data with my agent', 'I reported my actual yield data to my agent.', 4),
  _cq('soybean', 10, 'farm_enterprise',     'I recorded my yield',                  'I recorded the total yield in bags or kilograms in my farm record book.', 5),
  // ── Soybean – Week 11
  _cq('soybean', 11, 'agronomy',            'I dried my grain to safe moisture',    'I dried my grain to 12% moisture content or below before storage.', 1),
  _cq('soybean', 11, 'agronomy',            'I stored my grain appropriately',      'I stored my grain in a clean, pest-free facility or hermetic bag.', 2),
  _cq('soybean', 11, 'climate_smart',       'I used a climate-smart storage method', 'I used hermetic storage to reduce post-harvest losses.', 3),
  _cq('soybean', 11, 'advisory_commitment', 'I completed the post-harvest debrief', 'I attended or participated in the post-season debrief session.', 4),
  _cq('soybean', 11, 'farm_enterprise',     'I calculated my gross margin',         'I calculated my gross margin — revenue minus input costs.', 5),
  _cq('soybean', 11, 'farm_enterprise',     'I started planning for next season',   'I have begun planning my inputs and variety selection for next season.', 6),
];
