import type { AgentSummary, CohortRow, ProgramOption, FarmerPreview } from './interface'
import { AGENTS, COHORTS, FARMER_PREVIEWS } from '@/dataCenter/agents'
import { PROGRAM_OPTIONS_FLAT } from '@/dataCenter/programOptions'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchAgents(): Promise<AgentSummary[]> {
  await delay()
  return AGENTS
}

export async function fetchCohorts(): Promise<CohortRow[]> {
  await delay()
  return COHORTS
}

export async function fetchFarmersByCohort(cohortId: string): Promise<FarmerPreview[]> {
  await new Promise(r => setTimeout(r, 200))
  return FARMER_PREVIEWS.filter(f => f.cohortId === cohortId)
}

export async function fetchFarmersByAgent(agentId: string): Promise<FarmerPreview[]> {
  await new Promise(r => setTimeout(r, 200))
  return FARMER_PREVIEWS.filter(f => f.agentId === agentId)
}

export async function fetchPrograms(): Promise<ProgramOption[]> {
  await delay()
  return PROGRAM_OPTIONS_FLAT
}
