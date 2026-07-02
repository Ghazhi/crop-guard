import type { Farmer, ProgramOption } from './interface'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { PROGRAM_OPTIONS_WITH_COHORTS } from '@/dataCenter/programOptions'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchFarmers(): Promise<Farmer[]> {
  await delay()
  return FARMERS_LIST
}

export async function fetchProgramOptions(): Promise<ProgramOption[]> {
  await delay()
  return PROGRAM_OPTIONS_WITH_COHORTS
}
