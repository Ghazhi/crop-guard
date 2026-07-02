import type { Stats, CropBreakdown, ZoneBreakdown } from './interface'
import { DASHBOARD_STATS, CROP_BREAKDOWN, ZONE_BREAKDOWN } from '@/dataCenter/stats'

const DELAY = 300
const delay = () => new Promise(r => setTimeout(r, DELAY))

export async function fetchStats(): Promise<Stats> {
  await delay()
  return DASHBOARD_STATS
}

export async function fetchCropBreakdown(): Promise<CropBreakdown[]> {
  await delay()
  return CROP_BREAKDOWN
}

export async function fetchZoneBreakdown(): Promise<ZoneBreakdown[]> {
  await delay()
  return ZONE_BREAKDOWN
}
