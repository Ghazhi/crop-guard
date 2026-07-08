import type { Pillar, CropDef, Org, Question, Week, BaselineActivity, OrgConfig } from '@/app/(admin)/dashboard/CheckinConfig/_logics/interface'

// ─── helper ──────────────────────────────────────────────────────────────────

export function makeQuestion(id: string, pillar: Pillar, label: string, hint?: string): Question {
  return { id, pillar, label, hint, active: true }
}

// shorthand used inside seed data
const q = makeQuestion

// ─── organisations ────────────────────────────────────────────────────────────

export const ORGS: Org[] = [
  { id: 'org-001', name: 'Barclays Ghana'   },
  { id: 'org-002', name: 'Fidelity Bank'    },
  { id: 'org-003', name: 'GCB Bank'         },
  { id: 'org-004', name: 'Absa Ghana'       },
  { id: 'org-005', name: 'Agricultural DFI' },
]

// ─── weekly question seed data ────────────────────────────────────────────────

export const MAIZE_SEED: Week[] = [
  {
    week: 1, title: 'Land Preparation & Soil Health',
    questions: [
      q('m1q1', 'agronomy',            'I ploughed my land'),
      q('m1q2', 'agronomy',            'I conducted a soil test'),
      q('m1q3', 'climate_smart',       'I managed my crop residue'),
      q('m1q4', 'climate_smart',       'I built contour ridges or bunds'),
      q('m1q5', 'climate_smart',       'I put contour ridges / bunds in place',           'I have erosion-control structures in place on my sloping land.'),
      q('m1q6', 'advisory_commitment', 'I attended the pre-season training',              'I participated in the pre-season advisory session.'),
      q('m1q7', 'farm_enterprise',     'I prepared my input budget'),
    ],
  },
  {
    week: 2, title: 'Planting & Seed Selection',
    questions: [
      q('m2q1',  'agronomy',            'I used certified seed'),
      q('m2q2',  'agronomy',            'I used certified seed',                           'I planted with certified or improved variety seed.'),
      q('m2q3',  'agronomy',            'I planted at the correct seed rate'),
      q('m2q4',  'agronomy',            'I planted at the correct seed rate',              'I planted within the recommended density of 25,000–35,000 plants per hectare.'),
      q('m2q5',  'agronomy',            'I planted at the correct depth'),
      q('m2q6',  'agronomy',            'I planted at the correct depth',                  'I planted my seed at the recommended depth of 5–7 cm.'),
      q('m2q7',  'climate_smart',       'I aligned my planting to the rainfall forecast',  'I timed my planting according to the seasonal rainfall forecast.'),
      q('m2q8',  'climate_smart',       'I timed planting to the forecast'),
      q('m2q9',  'advisory_commitment', 'I followed the planting advisory'),
      q('m2q10', 'advisory_commitment', 'I followed the planting advisory',                'I followed the recommended planting guidance from my agent.'),
      q('m2q11', 'farm_enterprise',     'I procured my inputs on time'),
      q('m2q12', 'farm_enterprise',     'I procured my inputs on time',                   'I had all required inputs ready at planting time.'),
    ],
  },
  {
    week: 3, title: 'Early Germination & Stand Establishment',
    questions: [
      q('m3q1',  'agronomy',            'My germination rate is satisfactory'),
      q('m3q2',  'agronomy',            'My germination rate is satisfactory',             'My germination reached at least 80% of planted stands.'),
      q('m3q3',  'agronomy',            'I replanted gaps promptly'),
      q('m3q4',  'agronomy',            'I replanted gaps promptly',                       'I refilled missing stands within 5 days.'),
      q('m3q5',  'climate_smart',       'My soil moisture was adequate'),
      q('m3q6',  'climate_smart',       'My soil moisture was adequate',                   'Soil moisture was sufficient for early seedling establishment.'),
      q('m3q7',  'advisory_commitment', 'My agent completed an early field visit'),
      q('m3q8',  'advisory_commitment', 'My agent completed an early field visit',         'My agent visited to confirm stand establishment.'),
      q('m3q9',  'farm_enterprise',     'I sourced labour for replanting'),
      q('m3q10', 'farm_enterprise',     'I sourced labour for replanting',                 'I had labour ready promptly for gap filling.'),
    ],
  },
  {
    week: 4, title: 'Fertiliser Application (Basal)',
    questions: [
      q('m4q1',  'agronomy',            'I applied my basal fertiliser',                   'I applied the recommended basal fertiliser (e.g. NPK) to my crop.'),
      q('m4q2',  'agronomy',            'I applied my basal fertiliser'),
      q('m4q3',  'agronomy',            'I applied fertiliser at the right rate'),
      q('m4q4',  'agronomy',            'I applied fertiliser at the correct rate',         'I applied fertiliser at the recommended rate per hectare.'),
      q('m4q5',  'agronomy',            'I placed fertiliser correctly'),
      q('m4q6',  'agronomy',            'I placed my fertiliser correctly',                 'I banded or placed fertiliser correctly to avoid burning my crop.'),
      q('m4q7',  'climate_smart',       'I timed my fertiliser application with rainfall',  'I applied fertiliser before or just after rainfall to reduce nutrient losses.'),
      q('m4q8',  'climate_smart',       'I timed fertiliser with rainfall'),
      q('m4q9',  'advisory_commitment', 'I followed the fertiliser advisory'),
      q('m4q10', 'advisory_commitment', 'I followed the fertiliser advisory',               'I applied the fertiliser type recommended by my agent.'),
      q('m4q11', 'farm_enterprise',     'I recorded my fertiliser cost'),
      q('m4q12', 'farm_enterprise',     'I recorded my fertiliser cost',                   'I entered the cost of fertiliser in my farm record book.'),
    ],
  },
  {
    week: 5, title: 'Weed Management',
    questions: [
      q('m5q1',  'agronomy',            'I completed my first weeding'),
      q('m5q2',  'agronomy',            'I completed my first weeding',                    'I weeded my plot before the crop reached the 3–4 leaf stage.'),
      q('m5q3',  'agronomy',            'I applied herbicide correctly',                   'I applied herbicide at the correct rate and at the right timing.'),
      q('m5q4',  'agronomy',            'I applied herbicide correctly'),
      q('m5q5',  'climate_smart',       'I applied mulch to my plot',                      'I applied mulch to suppress weeds and retain soil moisture.'),
      q('m5q6',  'climate_smart',       'I applied mulch'),
      q('m5q7',  'advisory_commitment', 'I did weed scouting with my agent'),
      q('m5q8',  'advisory_commitment', 'I scouted for weeds with my agent',               'My agent and I conducted a joint weed assessment on my plot.'),
      q('m5q9',  'farm_enterprise',     'I recorded my weed management cost',              'I recorded the cost of weeding — labour and herbicide — in my farm records.'),
      q('m5q10', 'farm_enterprise',     'I recorded my weeding cost'),
    ],
  },
  {
    week: 6, title: 'Pest & Disease Scouting',
    questions: [
      q('m6q1',  'agronomy',            'I scouted my crop for Fall Armyworm',             'I checked my crop for FAW egg masses and damage signs.'),
      q('m6q2',  'agronomy',            'I scouted my crop for Fall Armyworm'),
      q('m6q3',  'agronomy',            'I applied the right pest control'),
      q('m6q4',  'agronomy',            'I applied the appropriate pest control',           'I applied the recommended control measure after detecting pests.'),
      q('m6q5',  'agronomy',            'I checked my crop for disease symptoms',           'I inspected my crop for foliar disease symptoms such as grey leaf spot or streak virus.'),
      q('m6q6',  'agronomy',            'I checked for disease symptoms'),
      q('m6q7',  'climate_smart',       'I maintained field hygiene',                      'I removed and destroyed heavily infected plant material from my plot.'),
      q('m6q8',  'climate_smart',       'I maintained field hygiene'),
      q('m6q9',  'advisory_commitment', 'I reported pest and disease to my agent',         'I reported any pest or disease outbreaks to my agent promptly.'),
      q('m6q10', 'advisory_commitment', 'I reported pests and disease to my agent'),
      q('m6q11', 'farm_enterprise',     'I recorded my pest control costs'),
      q('m6q12', 'farm_enterprise',     'I applied the appropriate pest control',           'I applied the recommended control measure after detecting pests.'),
    ],
  },
  {
    week: 7, title: 'Top-Dressing & Nutrient Management',
    questions: [
      q('m7q1',  'agronomy',            'I applied my top-dressing fertiliser',            'I applied urea or CAN as recommended for top-dressing.'),
      q('m7q2',  'agronomy',            'I applied my top-dressing fertiliser'),
      q('m7q3',  'agronomy',            'I checked for micronutrient deficiency',           'I checked for zinc or sulphur deficiency symptoms on my crop.'),
      q('m7q4',  'agronomy',            'I checked for micronutrient deficiency'),
      q('m7q5',  'climate_smart',       'I managed moisture during the growth phase',      'I managed moisture stress during the rapid growth phase.'),
      q('m7q6',  'climate_smart',       'I managed moisture during the growth phase'),
      q('m7q7',  'advisory_commitment', 'I followed the top-dressing advisory',            'I followed the recommended top-dressing guidance from my agent.'),
      q('m7q8',  'advisory_commitment', 'I followed the top-dressing advisory'),
      q('m7q9',  'farm_enterprise',     'I updated my input expenditure records',          'I recorded total input expenditure to date in my farm records.'),
      q('m7q10', 'farm_enterprise',     'I updated my input expenditure records'),
    ],
  },
  {
    week: 8, title: 'Tasselling & Silking',
    questions: [
      q('m8q1',  'agronomy',            'My crop has reached tasselling stage',            'My crop reached tasselling uniformly across the plot.'),
      q('m8q2',  'agronomy',            'My crop has reached tasselling stage'),
      q('m8q3',  'agronomy',            'My silk emergence is uniform',                    'Silk emergence is synchronised with tassel pollen shed.'),
      q('m8q4',  'agronomy',            'My silk emergence is uniform'),
      q('m8q5',  'climate_smart',       'I managed moisture during flowering',             'My crop is receiving adequate moisture during the critical flowering window.'),
      q('m8q6',  'climate_smart',       'I managed moisture during flowering'),
      q('m8q7',  'advisory_commitment', 'I reported flowering progress to my agent',       'I updated my agent on crop flowering progress.'),
      q('m8q8',  'advisory_commitment', 'I reported flowering progress to my agent'),
      q('m8q9',  'farm_enterprise',     'I started my preliminary yield estimate',         'I began a preliminary yield estimate based on cob set.'),
      q('m8q10', 'farm_enterprise',     'I started my preliminary yield estimate'),
    ],
  },
  {
    week: 9, title: 'Grain Fill & Stress Management',
    questions: [
      q('m9q1',  'agronomy',            'My cob development is satisfactory',              'Cobs are developing uniformly with good grain fill.'),
      q('m9q2',  'agronomy',            'My cob development is satisfactory'),
      q('m9q3',  'agronomy',            'I scouted for late-season disease',               'I scouted for late-season diseases such as ear rot and aflatoxin risk.'),
      q('m9q4',  'agronomy',            'I scouted for late-season disease'),
      q('m9q5',  'climate_smart',       'I managed water stress during grain fill',        'I managed any water or heat stress affecting grain fill.'),
      q('m9q6',  'climate_smart',       'I managed water stress during grain fill'),
      q('m9q7',  'advisory_commitment', 'I received grain fill advisory',                 'My agent provided guidance on managing the grain-fill period.'),
      q('m9q8',  'advisory_commitment', 'I received grain fill advisory'),
      q('m9q9',  'farm_enterprise',     'I prepared my harvest labour plan',               'I planned labour requirements for the upcoming harvest.'),
      q('m9q10', 'farm_enterprise',     'I prepared my harvest labour plan'),
    ],
  },
  {
    week: 10, title: 'Pre-Harvest Assessment',
    questions: [
      q('m10q1',  'agronomy',            'I assessed my crop maturity',                    'I checked husk colour, black layer formation, or kernel hardness.'),
      q('m10q2',  'agronomy',            'I assessed my crop maturity'),
      q('m10q3',  'agronomy',            'My crop is field-drying adequately',             'My crop is drying in the field adequately before harvest.'),
      q('m10q4',  'agronomy',            'My crop is field-drying adequately'),
      q('m10q5',  'climate_smart',       'I adjusted my harvest timing for weather',       'I am adjusting my harvest timing based on the weather forecast.'),
      q('m10q6',  'climate_smart',       'I adjusted my harvest timing for weather'),
      q('m10q7',  'advisory_commitment', 'I confirmed my harvest date with my agent',      'I confirmed the planned harvest date with my agent.'),
      q('m10q8',  'advisory_commitment', 'I confirmed my harvest date with my agent'),
      q('m10q9',  'farm_enterprise',     'I arranged a market for my harvest',             'I identified a buyer or market channel for my harvest.'),
      q('m10q10', 'farm_enterprise',     'I arranged a market for my harvest'),
    ],
  },
  {
    week: 11, title: 'Harvesting',
    questions: [
      q('m11q1',  'agronomy',            'I used the correct harvesting method',           'I used the recommended harvesting method (manual or mechanical).'),
      q('m11q2',  'agronomy',            'I used the correct harvesting method'),
      q('m11q3',  'agronomy',            'I kept harvest losses to a minimum',             'I kept harvest losses below the recommended threshold.'),
      q('m11q4',  'agronomy',            'I kept harvest losses to a minimum'),
      q('m11q5',  'climate_smart',       'I harvested during a dry weather window',        'I timed harvesting during a dry weather window.'),
      q('m11q6',  'climate_smart',       'I harvested during a dry weather window'),
      q('m11q7',  'advisory_commitment', 'I shared my harvest data with my agent',         'I reported actual yield data to my agent.'),
      q('m11q8',  'advisory_commitment', 'I shared my harvest data with my agent'),
      q('m11q9',  'farm_enterprise',     'I recorded my yield',                            'I recorded the total yield (bags or kg) in my farm record book.'),
      q('m11q10', 'farm_enterprise',     'I recorded my yield'),
    ],
  },
  {
    week: 12, title: 'Post-Harvest & Storage',
    questions: [
      q('m12q1',  'agronomy',            'I dried my grain to safe moisture',              'I dried my grain to 13% moisture content or below before storage.'),
      q('m12q2',  'agronomy',            'I dried my grain to safe moisture'),
      q('m12q3',  'agronomy',            'I stored my grain appropriately',                'I stored grain in a clean, pest-free facility or hermetic bag.'),
      q('m12q4',  'agronomy',            'I stored my grain appropriately'),
      q('m12q5',  'climate_smart',       'I used a climate-smart storage method',          'I used hermetic storage or metal silos to reduce post-harvest losses.'),
      q('m12q6',  'climate_smart',       'I used a climate-smart storage method'),
      q('m12q7',  'advisory_commitment', 'I completed the post-harvest debrief',           'I attended or participated in the post-season debrief.'),
      q('m12q8',  'advisory_commitment', 'I completed the post-harvest debrief'),
      q('m12q9',  'farm_enterprise',     'I calculated my gross margin',                   'I calculated gross margin (revenue minus input costs) for the season.'),
      q('m12q10', 'farm_enterprise',     'I calculated my gross margin'),
      q('m12q11', 'farm_enterprise',     'I started planning for next season',             'I began planning inputs and variety selection for next season.'),
      q('m12q12', 'farm_enterprise',     'I started planning for next season'),
    ],
  },
]

export const SOYBEAN_SEED: Week[] = [
  { week: 1,  title: 'Land Preparation & Inoculation',   questions: [q('s1q1','agronomy','I ploughed and harrowed my land'),q('s1q2','agronomy','I treated my seed with Rhizobium inoculant','I used the correct inoculant for soybean.'),q('s1q3','climate_smart','I incorporated previous crop residue'),q('s1q4','climate_smart','I cleared drainage channels'),q('s1q5','advisory_commitment','I attended the pre-season soybean training'),q('s1q6','farm_enterprise','I prepared my input budget')] },
  { week: 2,  title: 'Planting & Spacing',               questions: [q('s2q1','agronomy','I used certified soybean seed'),q('s2q2','agronomy','I observed the correct row spacing','I maintained 45–60 cm row spacing.'),q('s2q3','agronomy','I used the correct seed rate','I used 60–80 kg/ha as recommended.'),q('s2q4','climate_smart','I aligned planting to the onset of reliable rains'),q('s2q5','advisory_commitment','I followed the soybean planting advisory'),q('s2q6','farm_enterprise','I procured my inputs on time')] },
  { week: 3,  title: 'Germination & Early Growth',        questions: [q('s3q1','agronomy','My germination rate is satisfactory'),q('s3q2','agronomy','I replanted gaps promptly'),q('s3q3','climate_smart','My soil moisture was adequate'),q('s3q4','advisory_commitment','My agent completed an early field visit'),q('s3q5','farm_enterprise','I sourced labour for replanting')] },
  { week: 4,  title: 'Weed Management',                  questions: [q('s4q1','agronomy','I completed my first weeding'),q('s4q2','agronomy','I applied herbicide correctly'),q('s4q3','climate_smart','I applied mulch'),q('s4q4','advisory_commitment','I did weed scouting with my agent'),q('s4q5','farm_enterprise','I recorded my weeding cost')] },
  { week: 5,  title: 'Pest & Disease Scouting',          questions: [q('s5q1','agronomy','I scouted for soybean aphid'),q('s5q2','agronomy','I applied the appropriate pest control'),q('s5q3','agronomy','I checked for disease symptoms'),q('s5q4','climate_smart','I maintained field hygiene'),q('s5q5','advisory_commitment','I reported pest and disease to my agent'),q('s5q6','farm_enterprise','I recorded my pest control costs')] },
  { week: 6,  title: 'Flowering & Nodule Development',   questions: [q('s6q1','agronomy','My crop has reached flowering stage'),q('s6q2','agronomy','I assessed nodule development','I confirmed effective nodules (pink/red interior) are present.'),q('s6q3','climate_smart','I managed moisture during flowering'),q('s6q4','advisory_commitment','I reported flowering progress to my agent'),q('s6q5','farm_enterprise','I started my preliminary yield estimate')] },
  { week: 7,  title: 'Pod Setting',                      questions: [q('s7q1','agronomy','Pod set is uniform across my plot'),q('s7q2','agronomy','I scouted for pod borers'),q('s7q3','climate_smart','I mitigated drought stress during pod set'),q('s7q4','advisory_commitment','I received pod-set advisory from my agent'),q('s7q5','farm_enterprise','I prepared my harvest labour plan')] },
  { week: 8,  title: 'Grain Fill',                       questions: [q('s8q1','agronomy','Grain fill is satisfactory'),q('s8q2','agronomy','I scouted for late-season disease'),q('s8q3','climate_smart','I managed water stress during grain fill'),q('s8q4','advisory_commitment','I received grain fill advisory'),q('s8q5','farm_enterprise','I updated my input expenditure records')] },
  { week: 9,  title: 'Pre-Harvest Assessment',           questions: [q('s9q1','agronomy','I assessed my crop maturity'),q('s9q2','agronomy','My crop is field-drying adequately'),q('s9q3','climate_smart','I adjusted my harvest timing for weather'),q('s9q4','advisory_commitment','I confirmed my harvest date with my agent'),q('s9q5','farm_enterprise','I arranged a market for my harvest')] },
  { week: 10, title: 'Harvesting',                       questions: [q('s10q1','agronomy','I used the correct harvesting method'),q('s10q2','agronomy','I kept harvest losses to a minimum'),q('s10q3','climate_smart','I harvested during a dry weather window'),q('s10q4','advisory_commitment','I shared my harvest data with my agent'),q('s10q5','farm_enterprise','I recorded my yield')] },
  { week: 11, title: 'Post-Harvest & Storage',           questions: [q('s11q1','agronomy','I dried my grain to safe moisture'),q('s11q2','agronomy','I stored my grain appropriately'),q('s11q3','climate_smart','I used a climate-smart storage method'),q('s11q4','advisory_commitment','I completed the post-harvest debrief'),q('s11q5','farm_enterprise','I calculated my gross margin'),q('s11q6','farm_enterprise','I started planning for next season')] },
]

export const RICE_SEED: Week[] = [
  { week: 1, title: 'Land Preparation & Flooding', questions: [q('r1q1','agronomy','I levelled my paddy field'),q('r1q2','agronomy','I prepared bunds and water channels'),q('r1q3','climate_smart','I managed water intake efficiently'),q('r1q4','advisory_commitment','I attended the pre-season rice advisory'),q('r1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Nursery & Transplanting',     questions: [q('r2q1','agronomy','I prepared my nursery bed'),q('r2q2','agronomy','I transplanted at the correct age'),q('r2q3','climate_smart','I maintained correct water depth at transplanting'),q('r2q4','advisory_commitment','I followed transplanting advisory'),q('r2q5','farm_enterprise','I arranged transplanting labour')] },
  { week: 3, title: 'Tillering & Fertilisation',   questions: [q('r3q1','agronomy','My crop has reached tillering stage'),q('r3q2','agronomy','I applied basal fertiliser correctly'),q('r3q3','climate_smart','I maintained AWD (alternate wetting/drying)'),q('r3q4','advisory_commitment','I received a tillering advisory'),q('r3q5','farm_enterprise','I recorded fertiliser costs')] },
  { week: 4, title: 'Weed & Pest Management',      questions: [q('r4q1','agronomy','I completed weeding on time'),q('r4q2','agronomy','I scouted for stem borer'),q('r4q3','climate_smart','I managed flood events'),q('r4q4','advisory_commitment','I reported pest findings to my agent'),q('r4q5','farm_enterprise','I recorded weeding costs')] },
  { week: 5, title: 'Panicle Initiation',          questions: [q('r5q1','agronomy','My crop has reached panicle initiation'),q('r5q2','agronomy','I applied top-dress nitrogen'),q('r5q3','climate_smart','I managed water during panicle initiation'),q('r5q4','advisory_commitment','I confirmed panicle stage with agent'),q('r5q5','farm_enterprise','I updated my yield estimate')] },
  { week: 6, title: 'Heading & Grain Fill',        questions: [q('r6q1','agronomy','Heading is uniform'),q('r6q2','agronomy','I scouted for blast disease'),q('r6q3','climate_smart','I applied final irrigation correctly'),q('r6q4','advisory_commitment','I received heading advisory'),q('r6q5','farm_enterprise','I arranged harvest equipment')] },
  { week: 7, title: 'Harvesting & Post-Harvest',   questions: [q('r7q1','agronomy','I harvested at correct moisture'),q('r7q2','agronomy','I minimised threshing losses'),q('r7q3','climate_smart','I dried grain in a clean area'),q('r7q4','advisory_commitment','I shared yield data with my agent'),q('r7q5','farm_enterprise','I calculated gross margin')] },
]

export const CASSAVA_SEED: Week[] = [
  { week: 1, title: 'Land Prep & Planting',        questions: [q('c1q1','agronomy','I used healthy, disease-free cuttings'),q('c1q2','agronomy','I planted at the correct spacing'),q('c1q3','climate_smart','I planted on ridges to improve drainage'),q('c1q4','advisory_commitment','I attended the pre-season training'),q('c1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Establishment & Early Weeds', questions: [q('c2q1','agronomy','My crop has established well'),q('c2q2','agronomy','I controlled early-season weeds'),q('c2q3','climate_smart','I managed soil erosion'),q('c2q4','advisory_commitment','My agent completed an early visit'),q('c2q5','farm_enterprise','I recorded planting costs')] },
  { week: 3, title: 'Pest & Disease Scouting',     questions: [q('c3q1','agronomy','I scouted for cassava mosaic disease'),q('c3q2','agronomy','I scouted for mealybug'),q('c3q3','climate_smart','I removed and destroyed diseased plants'),q('c3q4','advisory_commitment','I reported disease findings to agent'),q('c3q5','farm_enterprise','I estimated replanting cost if needed')] },
  { week: 4, title: 'Mid-Season Assessment',       questions: [q('c4q1','agronomy','My canopy is healthy and closed'),q('c4q2','agronomy','I applied fertiliser mid-season'),q('c4q3','climate_smart','I maintained soil cover'),q('c4q4','advisory_commitment','I received mid-season advisory'),q('c4q5','farm_enterprise','I updated expenditure records')] },
  { week: 5, title: 'Harvest Readiness',           questions: [q('c5q1','agronomy','I assessed root size for maturity'),q('c5q2','agronomy','I planned staggered harvest to reduce waste'),q('c5q3','climate_smart','I harvested during dry conditions'),q('c5q4','advisory_commitment','I confirmed harvest date with agent'),q('c5q5','farm_enterprise','I arranged a buyer or processor')] },
]

export const YAM_SEED: Week[] = [
  { week: 1, title: 'Mound Preparation & Seeding', questions: [q('y1q1','agronomy','I prepared mounds at correct height'),q('y1q2','agronomy','I used healthy seed yam pieces'),q('y1q3','climate_smart','I oriented mounds to reduce erosion'),q('y1q4','advisory_commitment','I attended yam pre-season training'),q('y1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Staking & Early Growth',      questions: [q('y2q1','agronomy','I staked all mounds'),q('y2q2','agronomy','I controlled early-season weeds'),q('y2q3','climate_smart','I managed shade levels'),q('y2q4','advisory_commitment','My agent visited during staking'),q('y2q5','farm_enterprise','I recorded staking costs')] },
  { week: 3, title: 'Vine & Tuber Development',    questions: [q('y3q1','agronomy','Vine growth is vigorous and healthy'),q('y3q2','agronomy','I scouted for yam beetle'),q('y3q3','climate_smart','I managed vine damage from weather'),q('y3q4','advisory_commitment','I received tuber development advisory'),q('y3q5','farm_enterprise','I updated yield estimate')] },
  { week: 4, title: 'Harvest & Storage',           questions: [q('y4q1','agronomy','I harvested at correct maturity'),q('y4q2','agronomy','I cured my yam properly before storage'),q('y4q3','climate_smart','I stored in a ventilated yam barn'),q('y4q4','advisory_commitment','I shared harvest data with agent'),q('y4q5','farm_enterprise','I calculated gross margin')] },
]

export const GROUNDNUT_SEED: Week[] = [
  { week: 1, title: 'Land Prep & Planting',        questions: [q('g1q1','agronomy','I planted at the correct spacing'),q('g1q2','agronomy','I treated seed with fungicide'),q('g1q3','climate_smart','I planted on well-drained soil'),q('g1q4','advisory_commitment','I attended pre-season groundnut training'),q('g1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Establishment & Pegging',     questions: [q('g2q1','agronomy','Germination rate is good'),q('g2q2','agronomy','Pegging has started uniformly'),q('g2q3','climate_smart','I maintained soil moisture during pegging'),q('g2q4','advisory_commitment','I received pegging advisory'),q('g2q5','farm_enterprise','I recorded input costs')] },
  { week: 3, title: 'Weeding & Pest Control',      questions: [q('g3q1','agronomy','I completed timely weeding'),q('g3q2','agronomy','I scouted for leafminer'),q('g3q3','climate_smart','I avoided deep cultivation near pegs'),q('g3q4','advisory_commitment','I reported pest findings to agent'),q('g3q5','farm_enterprise','I recorded weeding costs')] },
  { week: 4, title: 'Harvest & Drying',            questions: [q('g4q1','agronomy','I harvested at correct maturity'),q('g4q2','agronomy','I dried pods on raised racks'),q('g4q3','climate_smart','I avoided drying on bare soil'),q('g4q4','advisory_commitment','I confirmed harvest timing with agent'),q('g4q5','farm_enterprise','I calculated gross margin')] },
]

export const COWPEA_SEED: Week[] = [
  { week: 1, title: 'Planting & Establishment',    questions: [q('cp1q1','agronomy','I used improved cowpea variety'),q('cp1q2','agronomy','I planted at the correct seed rate'),q('cp1q3','climate_smart','I timed planting to reliable rainfall'),q('cp1q4','advisory_commitment','I attended pre-season advisory'),q('cp1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Weed & Pest Management',      questions: [q('cp2q1','agronomy','I completed first weeding'),q('cp2q2','agronomy','I scouted for thrips and aphids'),q('cp2q3','climate_smart','I preserved beneficial shade cover'),q('cp2q4','advisory_commitment','I received pest advisory'),q('cp2q5','farm_enterprise','I recorded weeding costs')] },
  { week: 3, title: 'Flowering & Pod Set',         questions: [q('cp3q1','agronomy','Flowering is uniform'),q('cp3q2','agronomy','I scouted for pod borer'),q('cp3q3','climate_smart','I managed drought stress at flowering'),q('cp3q4','advisory_commitment','I reported pod set to agent'),q('cp3q5','farm_enterprise','I updated yield estimate')] },
  { week: 4, title: 'Harvest & Storage',           questions: [q('cp4q1','agronomy','I harvested at correct maturity'),q('cp4q2','agronomy','I dried grain before storage'),q('cp4q3','climate_smart','I used hermetic bags for storage'),q('cp4q4','advisory_commitment','I shared yield data with agent'),q('cp4q5','farm_enterprise','I calculated gross margin')] },
]

export const TOMATO_SEED: Week[] = [
  { week: 1, title: 'Nursery & Transplanting',     questions: [q('t1q1','agronomy','I raised seedlings in a protected nursery'),q('t1q2','agronomy','I transplanted at correct seedling size'),q('t1q3','climate_smart','I hardened off seedlings before transplant'),q('t1q4','advisory_commitment','I attended pre-season tomato training'),q('t1q5','farm_enterprise','I prepared my input budget')] },
  { week: 2, title: 'Staking & Early Management',  questions: [q('t2q1','agronomy','I staked all plants'),q('t2q2','agronomy','I pruned suckers correctly'),q('t2q3','climate_smart','I applied mulch to conserve moisture'),q('t2q4','advisory_commitment','I received early-growth advisory'),q('t2q5','farm_enterprise','I recorded establishment costs')] },
  { week: 3, title: 'Pest & Disease Management',   questions: [q('t3q1','agronomy','I scouted for early blight'),q('t3q2','agronomy','I applied fungicide on schedule'),q('t3q3','climate_smart','I avoided overhead irrigation'),q('t3q4','advisory_commitment','I reported disease pressure to agent'),q('t3q5','farm_enterprise','I recorded spray costs')] },
  { week: 4, title: 'Flowering & Fruit Set',       questions: [q('t4q1','agronomy','Flowering is uniform'),q('t4q2','agronomy','I managed blossom drop'),q('t4q3','climate_smart','I maintained consistent soil moisture'),q('t4q4','advisory_commitment','I received fruit-set advisory'),q('t4q5','farm_enterprise','I updated my yield estimate')] },
  { week: 5, title: 'Harvest & Post-Harvest',      questions: [q('t5q1','agronomy','I harvested at the correct ripeness stage'),q('t5q2','agronomy','I minimised bruising during harvest'),q('t5q3','climate_smart','I stored fruit in a cool ventilated space'),q('t5q4','advisory_commitment','I shared yield data with agent'),q('t5q5','farm_enterprise','I calculated gross margin')] },
]

// ─── built-in crops ───────────────────────────────────────────────────────────

export const BUILT_IN_CROPS: CropDef[] = [
  { id: 'maize',     name: 'Maize',     builtIn: true },
  { id: 'soybean',   name: 'Soybeans',  builtIn: true },
  { id: 'rice',      name: 'Rice',      builtIn: true },
  { id: 'cassava',   name: 'Cassava',   builtIn: true },
  { id: 'yam',       name: 'Yam',       builtIn: true },
  { id: 'groundnut', name: 'Groundnut', builtIn: true },
  { id: 'cowpea',    name: 'Cowpea',    builtIn: true },
  { id: 'tomato',    name: 'Tomato',    builtIn: true },
]

export const BUILT_IN_SEED_MAP: Record<string, Week[]> = {
  maize:     MAIZE_SEED,
  soybean:   SOYBEAN_SEED,
  rice:      RICE_SEED,
  cassava:   CASSAVA_SEED,
  yam:       YAM_SEED,
  groundnut: GROUNDNUT_SEED,
  cowpea:    COWPEA_SEED,
  tomato:    TOMATO_SEED,
}

// ─── baseline activities ──────────────────────────────────────────────────────

export const BASELINE_SEED: BaselineActivity[] = [
  { id: 'farming_experience', pillar: 'p1', label: 'Farming Experience',     desc: 'Years of active farming this season' },
  { id: 'weed_management',    pillar: 'p1', label: 'Weed Management',        desc: 'Systematic weed control carried out this week' },
  { id: 'proper_planting',    pillar: 'p1', label: 'Proper Planting',        desc: 'Correct spacing and timely planting maintained' },
  { id: 'fertilizer_use',     pillar: 'p1', label: 'Fertilizer Use',         desc: 'Applied at correct rate, time, and method' },
  { id: 'pest_disease',       pillar: 'p1', label: 'Pest & Disease Control', desc: 'Active scouting and responsive management' },
  { id: 'mulching',           pillar: 'p2', label: 'Mulching',               desc: 'Mulch cover applied on majority of farm area' },
  { id: 'composting',         pillar: 'p2', label: 'Composting',             desc: 'Active compost pile or compost application' },
  { id: 'crop_rotation',      pillar: 'p2', label: 'Crop Rotation',          desc: 'Rotation or intercropping practiced this season' },
  { id: 'water_harvesting',   pillar: 'p2', label: 'Water Harvesting',       desc: 'Structures or practices to retain rainfall' },
  { id: 'conservation_till',  pillar: 'p2', label: 'Conservation Tillage',   desc: 'Minimal soil disturbance, avoids burning' },
  { id: 'attends_training',   pillar: 'p3', label: 'Attends Training',       desc: 'Regular attendance at extension or GAP training' },
  { id: 'follows_agronomist', pillar: 'p3', label: 'Follows Agronomist',     desc: 'Can demonstrate application of advice given' },
  { id: 'cooperative_visits', pillar: 'p3', label: 'Cooperative Visits',     desc: 'Active attendance at cooperative meetings' },
  { id: 'cooperative_member', pillar: 'p3', label: 'Cooperative Membership', desc: 'Formally registered cooperative member' },
  { id: 'repayment_history',  pillar: 'p4', label: 'Repayment History',      desc: 'No outstanding unpaid agricultural obligations' },
  { id: 'savings_habit',      pillar: 'p4', label: 'Savings Habit',          desc: 'Active savings account or consistent practice' },
  { id: 'additional_income',  pillar: 'p4', label: 'Additional Income',      desc: 'Secondary occupation or verified other income' },
  { id: 'offtaker_confirmed', pillar: 'p4', label: 'Offtaker Confirmed',     desc: 'Binary: confirmed offtaker arrangement' },
]

export const BASELINE_PILLARS: { id: 'p1'|'p2'|'p3'|'p4'; label: string; color: string; strip: string }[] = [
  { id: 'p1', label: 'P1: Agronomy Readiness',         color: '#2C5F3F', strip: '#f0f7f2' },
  { id: 'p2', label: 'P2: CSA & Climate-Smart',        color: '#2B7BB9', strip: '#eff6ff' },
  { id: 'p3', label: 'P3: Advisory & Commitment',      color: '#E8963A', strip: '#fffbeb' },
  { id: 'p4', label: 'P4: Farm Enterprise Discipline', color: '#D94F3D', strip: '#fef2f2' },
]

// ─── pillar display config ────────────────────────────────────────────────────

export const PILLARS: { id: Pillar; label: string; shortLabel: string; strip: string; text: string }[] = [
  { id: 'agronomy',            label: 'Agronomy',                    shortLabel: 'Agronomy',                    strip: 'bg-blue-50',   text: 'text-blue-700'  },
  { id: 'climate_smart',       label: 'Climate Smart',               shortLabel: 'Climate Smart',               strip: 'bg-green-50',  text: 'text-green-700' },
  { id: 'advisory_commitment', label: 'Advisory & Commitment',       shortLabel: 'Advisory & Commitment',       strip: 'bg-amber-50',  text: 'text-amber-700' },
  { id: 'farm_enterprise',     label: 'Farm Enterprise Discipline',  shortLabel: 'Farm Enterprise Discipline',  strip: 'bg-gray-100',  text: 'text-gray-500'  },
]

export const PILLAR_DISPLAY: Record<Pillar, string> = {
  agronomy:            'AGRONOMY',
  climate_smart:       'CLIMATE SMART',
  advisory_commitment: 'ADVISORY & COMMITMENT',
  farm_enterprise:     'FARM ENTERPRISE DISCIPLINE',
}

// ─── pure helpers ─────────────────────────────────────────────────────────────

export function cloneWeeks(seed: Week[]): Week[] {
  return seed.map(w => ({ ...w, questions: w.questions.map(q2 => ({ ...q2 })) }))
}

export function freshConfig(cropDefs: CropDef[]): OrgConfig {
  return {
    cropWeeks: Object.fromEntries(
      cropDefs.map(c => [c.id, cloneWeeks(BUILT_IN_SEED_MAP[c.id] ?? [])])
    ),
    baselineActive: Object.fromEntries(BASELINE_SEED.map(a => [a.id, a.id !== 'savings_habit'])),
  }
}
