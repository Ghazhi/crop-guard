export type HazardClassification = 'Severe' | 'High' | 'Moderate' | 'Low'

const HAZARD_SCORE: Record<HazardClassification, number> = { Severe: 100, High: 75, Moderate: 45, Low: 15 }

export interface CohortExposureInputs {
  hazardClassification: HazardClassification
  actualRainfall: number
  historicalAvgRainfall: number
  criticalAlertCount: number
  highAlertCount: number
  mediumAlertCount: number
  inCriticalGrowthStage: boolean
  forecastStressFlag: boolean
}

export interface ExposureComponent {
  key: 'E1' | 'E2' | 'E3' | 'E4'
  label: string
  weight: number
  raw: number
  weighted: number
}

export interface ExposureResult {
  score: number
  tier: 'High' | 'Moderate' | 'Low'
  components: ExposureComponent[]
}

function calcE1(hazard: HazardClassification): number {
  return HAZARD_SCORE[hazard] ?? 0
}
function calcE2(actual: number, historical: number): number {
  if (historical === 0) return 0
  const pctDeviation = Math.abs((actual - historical) / historical) * 100
  return Math.min(100, pctDeviation * 2)
}
function calcE3(critical: number, high: number, medium: number): number {
  const severityPoints = critical * 3 + high * 2 + medium * 1
  return Math.min(100, (severityPoints / 15) * 100)
}
function calcE4(inCriticalStage: boolean, forecastStress: boolean): number {
  if (!inCriticalStage) return 0
  if (!forecastStress) return 50
  return 100
}

export function computeExposureScore(inputs: CohortExposureInputs): ExposureResult {
  const e1 = calcE1(inputs.hazardClassification)
  const e2 = calcE2(inputs.actualRainfall, inputs.historicalAvgRainfall)
  const e3 = calcE3(inputs.criticalAlertCount, inputs.highAlertCount, inputs.mediumAlertCount)
  const e4 = calcE4(inputs.inCriticalGrowthStage, inputs.forecastStressFlag)

  const components: ExposureComponent[] = [
    { key: 'E1', label: 'Hazard Zone', weight: 0.40, raw: e1, weighted: e1 * 0.40 },
    { key: 'E2', label: 'Rainfall Variability', weight: 0.25, raw: e2, weighted: e2 * 0.25 },
    { key: 'E3', label: 'Shock History', weight: 0.20, raw: e3, weighted: e3 * 0.20 },
    { key: 'E4', label: 'Crop-Stage Risk Window', weight: 0.15, raw: e4, weighted: e4 * 0.15 },
  ]

  const score = Math.round(components.reduce((s, c) => s + c.weighted, 0))
  const tier = score >= 67 ? 'High' : score >= 34 ? 'Moderate' : 'Low'

  return { score, tier, components }
}

export const FRI_HIGH_THRESHOLD = 60
export const EXPOSURE_HIGH_THRESHOLD = 67

export type QuadrantKey = 'HighCap_LowExp' | 'HighCap_HighExp' | 'LowCap_LowExp' | 'LowCap_HighExp'

export function computeQuadrant(friScore: number, exposureScore: number): QuadrantKey {
  const friHigh = friScore >= FRI_HIGH_THRESHOLD
  const expHigh = exposureScore >= EXPOSURE_HIGH_THRESHOLD
  if (friHigh && !expHigh) return 'HighCap_LowExp'
  if (friHigh && expHigh) return 'HighCap_HighExp'
  if (!friHigh && !expHigh) return 'LowCap_LowExp'
  return 'LowCap_HighExp'
}

export const QUADRANT_INFO: Record<QuadrantKey, { axisLabel: string; shortLabel: string; color: string; recommendation: string }> = {
  HighCap_LowExp:  { axisLabel: 'High Capacity – Low Exposure',  shortLabel: 'HC/LE', color: '#3E7D5A', recommendation: 'Standard eligibility flow, unchanged. Priority for full input package and larger loan sizing.' },
  HighCap_HighExp: { axisLabel: 'High Capacity – High Exposure', shortLabel: 'HC/HE', color: '#C79A3D', recommendation: 'Flag as climate-insurance / index-product candidate. Do not tighten credit terms on Exposure alone — this is environmental risk, not behavioral risk.' },
  LowCap_LowExp:   { axisLabel: 'Low Capacity – Low Exposure',   shortLabel: 'LC/LE', color: '#6B9AC4', recommendation: 'Coaching-first flow. Environment is forgiving, so behavioral gains should compound.' },
  LowCap_HighExp:  { axisLabel: 'Low Capacity – High Exposure',  shortLabel: 'LC/HE', color: '#B04A2E', recommendation: 'Highest-priority queue: combined coaching + protective intervention before any increase in credit exposure.' },
}
