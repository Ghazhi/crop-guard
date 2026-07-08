import type { Program } from './interface'
import { PROGRAMS } from '@/dataCenter/programs'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchPrograms(): Promise<Program[]> {
  await delay()
  return PROGRAMS
}
