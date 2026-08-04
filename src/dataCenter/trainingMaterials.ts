import type { TrainingBundle, TrainingTemplate, TrainingMaterial } from '@/app/(admin)/dashboard/TrainingMaterials/_logics/interface'

export const TRAINING_BUNDLES: TrainingBundle[] = [
  { id: 'bun-001', title: 'Maize Season 2026A Training',   cropType: 'maize',   season: '2026A', description: 'Weekly agronomy training content for maize farmers.',   isActive: true, totalWeeks: 12 },
  { id: 'bun-002', title: 'Soybean WAVE Training',          cropType: 'soybean', season: '2026A', description: 'Weekly agronomy training content for the WAVE soybean cohort.', isActive: true, totalWeeks: 10 },
  { id: 'bun-003', title: 'Cocoa Sustainability Training',  cropType: 'cocoa',   season: '2025/2026', description: 'Weekly training on cocoa sustainability and traceability practices.', isActive: true, totalWeeks: 8 },
]

export const TRAINING_TEMPLATES: TrainingTemplate[] = [
  { id: 'tpl-001', bundleId: 'bun-001', weekNumber: 1, weekTitle: 'Land Preparation', topic: 'Land Preparation & Planting', description: 'Proper land preparation techniques and correct planting spacing for maize.', notes: 'Emphasize row spacing of 75cm x 40cm.' },
  { id: 'tpl-002', bundleId: 'bun-001', weekNumber: 2, weekTitle: 'Weed Management', topic: 'Early Weed Control', description: 'Timing and methods for effective early-season weed control.', notes: '' },
  { id: 'tpl-003', bundleId: 'bun-001', weekNumber: 3, weekTitle: 'Fertilizer Application', topic: 'Fertilizer Application', description: 'NPK application rates and timing for maize.', notes: '' },
  { id: 'tpl-004', bundleId: 'bun-002', weekNumber: 1, weekTitle: 'Set title', topic: '', description: '', notes: '' },
  { id: 'tpl-005', bundleId: 'bun-003', weekNumber: 1, weekTitle: 'Set title', topic: '', description: '', notes: '' },
]

export const TRAINING_MATERIALS: TrainingMaterial[] = [
  { id: 'mat-001', templateId: 'tpl-001', fileName: 'land-preparation-guide.pdf', fileType: 'pdf', fileSizeKb: 842, displayLabel: 'Land Preparation Guide' },
  { id: 'mat-002', templateId: 'tpl-001', fileName: 'planting-spacing-demo.mp4', fileType: 'video', fileSizeKb: 15360, displayLabel: 'Planting Spacing Demo Video' },
  { id: 'mat-003', templateId: 'tpl-002', fileName: 'weed-id-chart.jpg', fileType: 'image', fileSizeKb: 620, displayLabel: 'Common Weed Identification Chart' },
]
