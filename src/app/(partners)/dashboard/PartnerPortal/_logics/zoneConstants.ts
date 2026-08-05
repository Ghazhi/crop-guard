import type { FriZone } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'

export const ZONES: FriZone[] = [
  'Resilience Leader',
  'Resilience Builder',
  'Resilience Learner',
  'Resilience Starter',
]

export const ZONE_COLOR: Record<FriZone, string> = {
  'Resilience Leader':  '#15803d',
  'Resilience Builder': '#5A9E74',
  'Resilience Learner': '#b45309',
  'Resilience Starter': '#dc2626',
}

export const ZONE_BG: Record<FriZone, string> = {
  'Resilience Leader':  '#f0fdf4',
  'Resilience Builder': '#E6F4EC',
  'Resilience Learner': '#fffbeb',
  'Resilience Starter': '#fef2f2',
}
