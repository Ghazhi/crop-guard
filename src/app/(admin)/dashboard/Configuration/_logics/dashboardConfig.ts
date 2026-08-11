// ─── Config Dashboard: which stat cards / widgets show on the main Dashboard ──
// A tenant admin can hide any widget here; the Dashboard reads this same
// persisted map to decide what to render. Everything defaults to visible so
// the out-of-the-box dashboard is unchanged until an admin opts to hide something.

export type DashboardWidgetId =
  | 'stat-total-farmers'
  | 'stat-active-enrollments'
  | 'stat-verified-farmers'
  | 'stat-field-agents'
  | 'module-cooperatives'
  | 'module-communities'
  | 'module-programs'
  | 'module-cohorts'
  | 'module-interventions'
  | 'module-applications'
  | 'chart-top-crops'
  | 'chart-fri-zone'
  | 'chart-cooperatives'
  | 'chart-fri-trend'
  | 'chart-new-enrollments'
  | 'climate-exposure'
  | 'risk-quadrant'
  | 'norvi-summary'

export interface DashboardWidgetDef {
  id:    DashboardWidgetId
  label: string
  group: string
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'stat-total-farmers',      label: 'Total Farmers',        group: 'Stat Cards' },
  { id: 'stat-active-enrollments', label: 'Active Enrollments',   group: 'Stat Cards' },
  { id: 'stat-verified-farmers',   label: 'Verified Farmers',     group: 'Stat Cards' },
  { id: 'stat-field-agents',       label: 'Field Agents',         group: 'Stat Cards' },
  { id: 'module-cooperatives',     label: 'Cooperatives',         group: 'Modules' },
  { id: 'module-communities',      label: 'Communities',          group: 'Modules' },
  { id: 'module-programs',         label: 'Programs',             group: 'Modules' },
  { id: 'module-cohorts',          label: 'Cohorts',              group: 'Modules' },
  { id: 'module-interventions',    label: 'Interventions',        group: 'Modules' },
  { id: 'module-applications',     label: 'Applications',         group: 'Modules' },
  { id: 'chart-top-crops',         label: 'Top Crops',            group: 'Charts' },
  { id: 'chart-fri-zone',          label: 'FRI Zone Distribution', group: 'Charts' },
  { id: 'chart-cooperatives',      label: 'Cooperatives',         group: 'Charts' },
  { id: 'chart-fri-trend',         label: 'FRI Score Trend',      group: 'Charts' },
  { id: 'chart-new-enrollments',   label: 'New Enrollments',      group: 'Charts' },
  { id: 'climate-exposure',        label: 'Climate Exposure',     group: 'Risk' },
  { id: 'risk-quadrant',           label: 'Risk Quadrant',        group: 'Risk' },
  { id: 'norvi-summary',           label: 'Norvi AI Program Summary', group: 'Other' },
]

export type DashboardWidgetVisibility = Record<DashboardWidgetId, boolean>

export const DEFAULT_DASHBOARD_WIDGET_VISIBILITY: DashboardWidgetVisibility =
  DASHBOARD_WIDGETS.reduce((acc, w) => {
    acc[w.id] = true
    return acc
  }, {} as DashboardWidgetVisibility)

export const DASHBOARD_WIDGET_VISIBILITY_KEY = 'dashboardConfig.widgetVisibility'
