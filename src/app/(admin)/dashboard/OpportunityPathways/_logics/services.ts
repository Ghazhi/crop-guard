import type { Intervention, ProgramOption, ProgramWithCohorts } from './interface'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import { INTERVENTION_PROGRAM_OPTIONS, PROGRAM_OPTIONS_WITH_COHORTS } from '@/dataCenter/programOptions'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function fetchInterventions(): Promise<Intervention[]> {
  await delay(300)
  return INTERVENTIONS
}

export async function fetchPrograms(): Promise<ProgramOption[]> {
  await delay(200)
  return INTERVENTION_PROGRAM_OPTIONS
}

export async function fetchProgramsWithCohorts(): Promise<ProgramWithCohorts[]> {
  await delay(200)
  return PROGRAM_OPTIONS_WITH_COHORTS
}
