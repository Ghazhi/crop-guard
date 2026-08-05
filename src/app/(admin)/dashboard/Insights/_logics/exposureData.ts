import type { CohortExposureInputs } from './exposure'

export interface CohortExposureRecord {
  cohortId: string
  cohortName: string
  communityName: string
  district: string
  programName: string
  farmerCount: number
  inputs: CohortExposureInputs
}

// Mock cohort-level climate exposure inputs for a handful of real cohorts
// referenced in FARMERS_LIST (see src/dataCenter/farmerManagement.ts).
export const COHORT_EXPOSURE: CohortExposureRecord[] = [
  {
    cohortId: 'coh-001',
    cohortName: 'Cohort 1 - Gurubagu',
    communityName: 'Gurubagu',
    district: 'North Gonja',
    programName: 'WAVE Program',
    farmerCount: 1,
    inputs: {
      hazardClassification: 'Severe',
      actualRainfall: 420,
      historicalAvgRainfall: 950,
      criticalAlertCount: 4,
      highAlertCount: 6,
      mediumAlertCount: 8,
      inCriticalGrowthStage: true,
      forecastStressFlag: true,
    },
  },
  {
    cohortId: 'coh-005',
    cohortName: 'Kumasi Cohort A',
    communityName: 'Adum',
    district: 'Kumasi Metro',
    programName: 'Maize Season 2026A',
    farmerCount: 2,
    inputs: {
      hazardClassification: 'Moderate',
      actualRainfall: 1180,
      historicalAvgRainfall: 1250,
      criticalAlertCount: 1,
      highAlertCount: 2,
      mediumAlertCount: 3,
      inCriticalGrowthStage: true,
      forecastStressFlag: false,
    },
  },
  {
    cohortId: 'coh-010',
    cohortName: 'Cohort A - Tamale',
    communityName: 'Tamale Central',
    district: 'Tamale Metro',
    programName: 'Rice Value Chain 2026',
    farmerCount: 3,
    inputs: {
      hazardClassification: 'Low',
      actualRainfall: 1300,
      historicalAvgRainfall: 1280,
      criticalAlertCount: 0,
      highAlertCount: 1,
      mediumAlertCount: 1,
      inCriticalGrowthStage: false,
      forecastStressFlag: false,
    },
  },
  {
    cohortId: 'coh-012',
    cohortName: 'Cohort A - Savannah',
    communityName: 'Buipe',
    district: 'East Gonja',
    programName: 'Soybean Outgrower Scheme',
    farmerCount: 4,
    inputs: {
      hazardClassification: 'High',
      actualRainfall: 700,
      historicalAvgRainfall: 1000,
      criticalAlertCount: 2,
      highAlertCount: 4,
      mediumAlertCount: 5,
      inCriticalGrowthStage: true,
      forecastStressFlag: false,
    },
  },
]
