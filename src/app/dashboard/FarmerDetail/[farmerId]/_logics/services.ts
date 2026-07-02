import type { FarmerDetail, WeekScore, RiskFlag, Intervention } from './interface'
import { FARMER_DETAIL, WEEK_SCORES, RISK_FLAGS, FARMER_INTERVENTIONS } from '@/dataCenter/farmerDetail'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchFarmerDetail(_farmerId: string): Promise<FarmerDetail> {
  await delay()
  return FARMER_DETAIL
}

export async function fetchWeekScores(_farmerId: string): Promise<WeekScore[]> {
  await delay()
  return WEEK_SCORES
}

export async function fetchRiskFlags(_farmerId: string): Promise<RiskFlag[]> {
  await delay()
  return RISK_FLAGS
}

export async function fetchInterventions(_farmerId: string): Promise<Intervention[]> {
  await delay()
  return FARMER_INTERVENTIONS
}
