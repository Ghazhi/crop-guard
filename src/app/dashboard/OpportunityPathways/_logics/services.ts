import type { Intervention, ProgramOption } from './interface'
import { INTERVENTIONS } from '@/dataCenter/interventions'
import { INTERVENTION_PROGRAM_OPTIONS } from '@/dataCenter/programOptions'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function fetchInterventions(): Promise<Intervention[]> {
  await delay(300)
  return INTERVENTIONS
}

export async function fetchPrograms(): Promise<ProgramOption[]> {
  await delay(200)
  return INTERVENTION_PROGRAM_OPTIONS
}
