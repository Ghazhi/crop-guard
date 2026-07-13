export type Pillar  = 'agronomy' | 'climate_smart' | 'advisory_commitment' | 'farm_enterprise'
export type Section = 'weekly' | 'cohort' | 'baseline' | 'crops'

export interface CropDef {
  id:       string
  name:     string
  season?:  string
  builtIn?: boolean
}

export interface CohortSchedule {
  id:             string
  programId:      string
  programName:    string
  cohortId:       string
  cohortName:     string
  mode:           'start_now' | 'scheduled'
  scheduledDate?: string
  endDate?:       string
  baselineId:     string
  checkInListIds: string[]
  status:         'pending' | 'active' | 'completed'
}

export interface Org {
  id:   string
  name: string
}

export interface Question {
  id:      string
  pillar:  Pillar
  label:   string
  hint?:   string
  active:  boolean
}

export interface Week {
  week:      number
  title:     string
  questions: Question[]
}

export interface BaselineActivity {
  id:     string
  pillar: 'p1' | 'p2' | 'p3' | 'p4'
  label:  string
  desc:   string
}

export interface OrgConfig {
  cropWeeks:      Record<string, Week[]>
  baselineActive: Record<string, boolean>
}
