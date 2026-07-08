import type { FriZone } from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'

export const ZONES: FriZone[] = [
  'Resilience Leader',
  'Resilience Builder',
  'Resilience Learner',
  'Resilience Starter',
]

export const ZONE_COLOR: Record<FriZone, string> = {
  'Resilience Leader':  '#15803d',
  'Resilience Builder': '#0369a1',
  'Resilience Learner': '#b45309',
  'Resilience Starter': '#dc2626',
}

export const ZONE_BG: Record<FriZone, string> = {
  'Resilience Leader':  '#f0fdf4',
  'Resilience Builder': '#eff6ff',
  'Resilience Learner': '#fffbeb',
  'Resilience Starter': '#fef2f2',
}
