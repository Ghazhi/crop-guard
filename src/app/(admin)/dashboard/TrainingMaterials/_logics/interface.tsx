export type CropType = 'maize' | 'soybean' | 'cocoa'

export interface TrainingBundle {
  id:          string
  title:       string
  cropType:    CropType
  season:      string
  description: string
  isActive:    boolean
  totalWeeks:  number
  /** Highest week number pushed live to farmers so far; 0 = nothing published yet. */
  currentWeek: number
}

export interface TrainingTemplate {
  id:         string
  bundleId:   string
  weekNumber: number
  weekTitle:  string
  topic:      string
  description: string
  notes:      string
}

export type MaterialType = 'video' | 'pdf' | 'image' | 'document'

export interface TrainingMaterial {
  id:           string
  templateId:   string
  fileName:     string
  fileType:     MaterialType
  fileSizeKb:   number
  displayLabel: string
}
