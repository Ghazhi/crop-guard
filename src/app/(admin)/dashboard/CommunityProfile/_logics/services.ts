import type { Community, Cooperative, RegionOption } from './interface'
import { COMMUNITIES, COOPERATIVES, REGIONS } from '@/dataCenter/communityProfile'

const delay = () => new Promise(r => setTimeout(r, 300))

export async function fetchCommunities(): Promise<Community[]> {
  await delay()
  return COMMUNITIES
}

export async function fetchCooperatives(): Promise<Cooperative[]> {
  await delay()
  return COOPERATIVES
}

export async function fetchRegions(): Promise<RegionOption[]> {
  await delay()
  return REGIONS
}
