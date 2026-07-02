'use client'

import { useState, useCallback } from 'react'
import { ClipboardCheck, Calendar, Layers, ChevronDown, ChevronUp, Pencil, Trash2, Plus, Download, X } from 'lucide-react'

// ─── types ────────────────────────────────────────────────────────────────────

type Crop   = 'maize' | 'soybean'
type Pillar = 'agronomy' | 'climate_smart' | 'advisory_commitment' | 'farm_enterprise'
type Section = 'weekly' | 'cohort' | 'baseline'

interface Question { id: string; pillar: Pillar; label: string; hint?: string; active: boolean }
interface Week      { week: number; title: string; questions: Question[] }

function q(id: string, pillar: Pillar, label: string, hint?: string): Question {
  return { id, pillar, label, hint, active: true }
}

// ─── seed data ────────────────────────────────────────────────────────────────

const MAIZE_SEED: Week[] = [
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

const SOYBEAN_SEED: Week[] = [
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

// ─── baseline activities data ─────────────────────────────────────────────────

interface BaselineActivity { id: string; pillar: 'p1'|'p2'|'p3'|'p4'; label: string; desc: string }

const BASELINE_SEED: BaselineActivity[] = [
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

const BASELINE_PILLARS = [
  { id: 'p1' as const, label: 'P1: Agronomy Readiness',        color: '#2C5F3F', strip: '#f0f7f2' },
  { id: 'p2' as const, label: 'P2: CSA & Climate-Smart',       color: '#2B7BB9', strip: '#eff6ff' },
  { id: 'p3' as const, label: 'P3: Advisory & Commitment',     color: '#E8963A', strip: '#fffbeb' },
  { id: 'p4' as const, label: 'P4: Farm Enterprise Discipline', color: '#D94F3D', strip: '#fef2f2' },
]

// ─── pillar config ─────────────────────────────────────────────────────────────

const PILLARS: { id: Pillar; label: string; shortLabel: string; strip: string; text: string }[] = [
  { id: 'agronomy',            label: 'Agronomy',                shortLabel: 'Agronomy',              strip: 'bg-blue-50',   text: 'text-blue-700'   },
  { id: 'climate_smart',       label: 'Climate Smart',           shortLabel: 'Climate Smart',         strip: 'bg-green-50',  text: 'text-green-700'  },
  { id: 'advisory_commitment', label: 'Advisory & Commitment',   shortLabel: 'Advisory & Commitment', strip: 'bg-amber-50',  text: 'text-amber-700'  },
  { id: 'farm_enterprise',     label: 'Farm Enterprise Discipline', shortLabel: 'Farm Enterprise Discipline', strip: 'bg-gray-100', text: 'text-gray-500' },
]

const PILLAR_DISPLAY: Record<Pillar, string> = {
  agronomy:            'AGRONOMY',
  climate_smart:       'CLIMATE SMART',
  advisory_commitment: 'ADVISORY & COMMITMENT',
  farm_enterprise:     'FARM ENTERPRISE DISCIPLINE',
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
        checked ? 'bg-[var(--brand-green)]' : 'bg-gray-200'
      }`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function Main() {
  const [section, setSection]       = useState<Section>('weekly')
  const [crop, setCrop]             = useState<Crop>('maize')
  const [expandedWeeks, setExpanded] = useState<Set<number>>(new Set([1]))
  const [maizeWeeks, setMaizeWeeks]  = useState<Week[]>(MAIZE_SEED.map(w => ({
    ...w, questions: w.questions.map(q2 => ({ ...q2 }))
  })))
  const [soybeanWeeks, setSoybeanWeeks] = useState<Week[]>(SOYBEAN_SEED.map(w => ({
    ...w, questions: w.questions.map(q2 => ({ ...q2 }))
  })))

  const [baselineActive, setBaselineActive] = useState<Record<string, boolean>>(
    Object.fromEntries(BASELINE_SEED.map(a => [a.id, a.id !== 'savings_habit']))
  )

  const [addingTo, setAddingTo]     = useState<{ weekNum: number } | null>(null)
  const [newPillar, setNewPillar]   = useState<Pillar>('agronomy')
  const [newLabel, setNewLabel]     = useState('')
  const [newHint, setNewHint]       = useState('')
  const [newActive, setNewActive]   = useState(true)

  const weeks    = crop === 'maize' ? maizeWeeks    : soybeanWeeks
  const setWeeks = crop === 'maize' ? setMaizeWeeks : setSoybeanWeeks

  const totalQ  = weeks.reduce((a, w) => a + w.questions.length, 0)
  const activeQ = weeks.reduce((a, w) => a + w.questions.filter(q2 => q2.active).length, 0)

  function toggleWeek(n: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  function toggleQuestion(weekNum: number, qId: string) {
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : {
        ...w, questions: w.questions.map(q2 =>
          q2.id !== qId ? q2 : { ...q2, active: !q2.active }
        )
      }
    ))
  }

  function deleteQuestion(weekNum: number, qId: string) {
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : { ...w, questions: w.questions.filter(q2 => q2.id !== qId) }
    ))
  }

  function handleAdd(weekNum: number) {
    if (!newLabel.trim()) return
    const id = `${crop[0]}${weekNum}q${Date.now()}`
    setWeeks(prev => prev.map(w =>
      w.week !== weekNum ? w : {
        ...w, questions: [
          ...w.questions,
          { id, pillar: newPillar, label: newLabel.trim(), hint: newHint.trim() || undefined, active: newActive }
        ]
      }
    ))
    setAddingTo(null)
    setNewLabel('')
    setNewHint('')
    setNewActive(true)
    setNewPillar('agronomy')
  }

  function handleReseed() {
    const seed = crop === 'maize' ? MAIZE_SEED : SOYBEAN_SEED
    const fresh = seed.map(w => ({ ...w, questions: w.questions.map(q2 => ({ ...q2 })) }))
    if (crop === 'maize') setMaizeWeeks(fresh); else setSoybeanWeeks(fresh)
  }

  const SECTION_NAV = [
    { id: 'weekly'   as Section, Icon: ClipboardCheck, label: 'Weekly Questions',   sub: 'Crop-specific check-in questions per week' },
    { id: 'cohort'   as Section, Icon: Calendar,       label: 'Cohort Schedules',   sub: 'Configure timing windows per cohort'        },
    { id: 'baseline' as Section, Icon: Layers,         label: 'Baseline Activities',sub: 'Pillar activities for baseline assessment'  },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* page header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <ClipboardCheck className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
          <h1 className="text-xl font-bold text-gray-900">Check-in Configuration</h1>
        </div>
        <p className="text-sm text-gray-500 ml-7">Configure weekly check-in questions, cohort schedules, and baseline activities</p>
      </div>

      {/* body: sidebar + content */}
      <div className="flex gap-5 items-start">

        {/* left section nav */}
        <div className="flex flex-col gap-1 w-48 shrink-0">
          {SECTION_NAV.map(({ id, Icon, label, sub }) => {
            const active = section === id
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active ? 'text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}
                style={active ? { background: 'var(--brand-forest)' } : {}}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${active ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* main content */}
        <div className="flex-1 min-w-0">

          {/* ── Weekly Questions ── */}
          {section === 'weekly' && (
            <div className="flex flex-col gap-4">
              {/* section header */}
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Weekly Questions</h2>
              </div>

              {/* crop tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {(['maize', 'soybean'] as Crop[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setCrop(c)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      crop === c ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {c === 'maize' ? 'Maize' : 'Soybeans'}
                  </button>
                ))}
              </div>

              {/* stats + re-seed */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{totalQ} questions</span>
                  {' · '}
                  <span className="font-medium text-gray-700">{activeQ} active</span>
                </p>
                <button
                  onClick={handleReseed}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Re-seed
                </button>
              </div>

              {/* week accordion */}
              <div className="flex flex-col gap-2">
                {weeks.map(w => {
                  const open = expandedWeeks.has(w.week)
                  const activeCount = w.questions.filter(q2 => q2.active).length

                  const grouped: Partial<Record<Pillar, Question[]>> = {}
                  for (const pll of PILLARS) {
                    const qs = w.questions.filter(q2 => q2.pillar === pll.id)
                    if (qs.length) grouped[pll.id] = qs
                  }

                  return (
                    <div key={w.week} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* week header */}
                      <button
                        onClick={() => toggleWeek(w.week)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'var(--brand-forest)' }}
                        >
                          W{w.week}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-gray-900">{w.title}</p>
                          <p className="text-xs text-gray-400">{w.questions.length} questions · {activeCount} active</p>
                        </div>
                        {open
                          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                      </button>

                      {/* week body */}
                      {open && (
                        <div className="border-t border-gray-100">
                          {PILLARS.map(pll => {
                            const qs = grouped[pll.id]
                            if (!qs) return null
                            return (
                              <div key={pll.id}>
                                {/* pillar header */}
                                <div className={`px-4 py-1.5 ${pll.strip}`}>
                                  <p className={`text-[10px] font-bold tracking-widest uppercase ${pll.text}`}>
                                    {PILLAR_DISPLAY[pll.id]}
                                  </p>
                                </div>
                                {/* questions */}
                                {qs.map(question => (
                                  <div key={question.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${question.hint ? 'font-medium text-gray-800' : 'text-gray-700'}`}>{question.label}</p>
                                      {question.hint && (
                                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{question.hint}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                      <Toggle
                                        checked={question.active}
                                        onChange={() => toggleQuestion(w.week, question.id)}
                                      />
                                      <button
                                        onClick={() => {}}
                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteQuestion(w.week, question.id)}
                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })}

                          {/* add question form / button */}
                          {addingTo?.weekNum === w.week ? (
                            <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-3">
                              {/* pillar selector */}
                              <div className="flex flex-wrap gap-2">
                                {PILLARS.map(pll => (
                                  <button
                                    key={pll.id}
                                    type="button"
                                    onClick={() => setNewPillar(pll.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                      newPillar === pll.id
                                        ? 'border-gray-400 bg-gray-100 text-gray-800'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {pll.shortLabel}
                                  </button>
                                ))}
                              </div>
                              {/* inputs */}
                              <input
                                type="text"
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="Question statement..."
                                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                              />
                              <input
                                type="text"
                                value={newHint}
                                onChange={e => setNewHint(e.target.value)}
                                placeholder="Optional hint for agent"
                                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
                              />
                              {/* active toggle row */}
                              <div className="flex items-center gap-2">
                                <Toggle checked={newActive} onChange={setNewActive} />
                                <span className="text-sm text-gray-600">Active</span>
                              </div>
                              {/* actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAdd(w.week)}
                                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
                                  style={{ background: '#4b5563' }}
                                >
                                  <span className="text-sm">⊙</span>
                                  Save
                                </button>
                                <button
                                  onClick={() => { setAddingTo(null); setNewLabel(''); setNewHint('') }}
                                  className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingTo({ weekNum: w.week }); setNewLabel(''); setNewHint(''); setNewPillar('agronomy') }}
                              className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-100 w-full"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add question
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Cohort Schedules ── */}
          {section === 'cohort' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Cohort Schedules</h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center gap-2">
                <Calendar className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">Cohort schedule configuration coming soon.</p>
              </div>
            </div>
          )}

          {/* ── Baseline Activities ── */}
          {section === 'baseline' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
                <h2 className="text-base font-bold text-gray-900">Baseline Activities</h2>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {BASELINE_PILLARS.map(pillar => {
                  const activities = BASELINE_SEED.filter(a => a.pillar === pillar.id)
                  return (
                    <div key={pillar.id}>
                      {/* pillar strip */}
                      <div className="px-4 py-2" style={{ background: pillar.strip }}>
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: pillar.color }}>
                          {pillar.label}
                        </p>
                      </div>
                      {/* activity rows */}
                      {activities.map(activity => {
                        const active = baselineActive[activity.id] ?? true
                        return (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium leading-tight"
                                style={{ color: active ? pillar.color : '#9ca3af' }}
                              >
                                {activity.label}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{activity.desc}</p>
                            </div>
                            <Toggle
                              checked={active}
                              onChange={v => setBaselineActive(prev => ({ ...prev, [activity.id]: v }))}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
