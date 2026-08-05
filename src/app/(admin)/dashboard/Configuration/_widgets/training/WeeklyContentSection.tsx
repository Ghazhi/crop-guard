'use client'

// Reuses the existing standalone TrainingMaterials page's `Main` export for the
// "Weekly Content" section — it already implements crop-specific weekly training
// bundles end-to-end (bundles, weeks, materials). We strip its own outer page
// padding + header by clipping negative margins, matching how the Check-in
// Config shell embeds pre-existing standalone content.
//
// The standalone `src/app/(admin)/dashboard/TrainingMaterials/` route is left
// completely untouched — this is a pure import/re-render.

import { Main as TrainingMaterialsMain } from '@/app/(admin)/dashboard/TrainingMaterials/_widgets/main'

export function WeeklyContentSection() {
  return (
    <div className="-m-6">
      <TrainingMaterialsMain />
    </div>
  )
}
