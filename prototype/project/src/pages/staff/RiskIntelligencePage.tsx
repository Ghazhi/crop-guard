import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Filter,
  ChevronDown, ChevronUp, Users, Layers, Target,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

type RiskLevel = 'high' | 'medium' | 'low'

interface RiskFarmer {
  id:                string
  full_name:         string
  region:            string
  fri_score:         number
  last_checkin_days: number | null
  risk_level:        RiskLevel
  risk_reasons:      string[]
  program_name?:     string
  cohort_name?:      string
}

interface TrendPoint {
  month:    string
  avg_fri:  number
  enrolled: number
}

interface RegionRow {
  region: string
  high:   number
  medium: number
  low:    number
  avg_fri: number
}

interface ProgramRisk {
  id:          string
  name:        string
  farmer_count: number
  high:        number
  medium:      number
  low:        number
  avg_fri:    number
  checkin_rate: number
}

interface CohortRisk {
  id:          string
  name:        string
  program_name: string
  farmer_count: number
  high:        number
  medium:      number
  low:        number
  avg_fri:    number
  checkin_rate: number
}

function classifyRisk(friScore: number, lastCheckinDays: number | null): RiskLevel {
  if (friScore < 40 || (lastCheckinDays !== null && lastCheckinDays > 60)) return 'high'
  if (friScore < 60 || (lastCheckinDays !== null && lastCheckinDays > 30)) return 'medium'
  return 'low'
}

function getRiskReasons(friScore: number, lastCheckinDays: number | null): string[] {
  const reasons: string[] = []
  if (friScore < 40)  reasons.push('Low FRI score')
  else if (friScore < 60) reasons.push('Below avg FRI')
  if (lastCheckinDays !== null && lastCheckinDays > 60) reasons.push('Missed check-ins')
  else if (lastCheckinDays !== null && lastCheckinDays > 30) reasons.push('Infrequent visits')
  if (lastCheckinDays === null) reasons.push('No check-in recorded')
  if (friScore === 0) reasons.push('Not yet scored')
  return reasons
}

function DeltaChip({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const positive = inverted ? value < 0 : value > 0
  if (value === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
      positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value)}%
    </span>
  )
}

const RISK_COLORS: Record<RiskLevel, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#10b981',
}
const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981']
const TABS = ['Overview', 'At-Risk Farmers', 'By Region', 'By Program', 'By Cohort', 'Trends'] as const
type Tab = typeof TABS[number]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function RiskIntelligencePage() {
  const profile = useAuthStore(s => s.profile)

  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('Overview')
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all')
  const [sortAsc,    setSortAsc]    = useState(false)
  const [farmers,    setFarmers]    = useState<RiskFarmer[]>([])
  const [trendData,  setTrendData]  = useState<TrendPoint[]>([])
  const [programRisks, setProgramRisks] = useState<ProgramRisk[]>([])
  const [cohortRisks,  setCohortRisks]  = useState<CohortRisk[]>([])
  const [prevHigh,   setPrevHigh]   = useState<number | null>(null)
  const [prevAvgFri, setPrevAvgFri] = useState<number | null>(null)
  const [prevCheckinRate, setPrevCheckinRate] = useState<number | null>(null)
  const [page,       setPage]       = useState(1)
  const BASE_PAGE_SIZE = 8
  const [loadAll, setLoadAll] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [selectedCohort,  setSelectedCohort]  = useState<string>('all')
  const [allPrograms, setAllPrograms] = useState<{ id: string; name: string }[]>([])
  const [allCohorts,  setAllCohorts]  = useState<{ id: string; name: string; program_id: string }[]>([])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!profile) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const orgId = profile.organisation_id
    const today = new Date()
    const thirtyDaysAgo  = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30)
    const sixtyDaysAgo   = new Date(today); sixtyDaysAgo.setDate(today.getDate() - 60)
    const twelveMonthsAgo = new Date(today); twelveMonthsAgo.setFullYear(today.getFullYear() - 1)

    // 1. Get program IDs for this org (enrollments has no organisation_id column)
    const { data: programRows } = await supabase
      .from('programs')
      .select('id, name')
      .eq('organisation_id', orgId)
    const programIds = (programRows ?? []).map((p: any) => p.id)
    const programNameMap = new Map((programRows ?? []).map((p: any) => [p.id, p.name]))
    setAllPrograms((programRows ?? []).map((p: any) => ({ id: p.id, name: p.name })))

    // 2. Get cohorts for these programs
    const { data: cohortRows } = await supabase
      .from('cohorts')
      .select('id, name, program_id')
      .in('program_id', programIds.length > 0 ? programIds : ['00000000-0000-0000-0000-000000000000'])
    const cohortNameMap = new Map((cohortRows ?? []).map((c: any) => [c.id, c.name]))
    const cohortProgramMap = new Map((cohortRows ?? []).map((c: any) => [c.id, c.program_id]))
    setAllCohorts((cohortRows ?? []).map((c: any) => ({ id: c.id, name: c.name, program_id: c.program_id })))

    // 3. Get active enrollments (filter by program_ids, not organisation_id)
    const { data: enrollmentRows } = await supabase
      .from('enrollments')
      .select('farmer_id, program_id, cohort_id, enrolled_at')
      .in('program_id', programIds.length > 0 ? programIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('status', 'active')

    const enrolledIds = [...new Set((enrollmentRows ?? []).map((e: any) => e.farmer_id))]

    // Build farmer → program/cohort map
    const farmerProgramMap = new Map<string, string>()
    const farmerCohortMap = new Map<string, string>()
    ;(enrollmentRows ?? []).forEach((e: any) => {
      if (e.program_id) farmerProgramMap.set(e.farmer_id, e.program_id)
      if (e.cohort_id) farmerCohortMap.set(e.farmer_id, e.cohort_id)
    })

    // 4. Fetch ALL farmers in this org (not just enrolled — for broader risk view)
    const { data: farmerRows } = await supabase
      .from('farmers')
      .select('id, full_name, region, district, current_fri_score')
      .eq('organisation_id', orgId)
      .limit(500)

    // 5. Latest check-in per farmer
    const { data: checkinRows } = await supabase
      .from('farmer_checkins')
      .select('farmer_id, created_at')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })

    const latestCheckin: Record<string, string> = {}
    ;(checkinRows ?? []).forEach((c: any) => {
      if (!latestCheckin[c.farmer_id]) latestCheckin[c.farmer_id] = c.created_at
    })

    // 6. Latest FRI score per farmer
    const { data: friRows } = await supabase
      .from('farmer_fri_scores')
      .select('farmer_id, total_score, created_at')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })

    const latestFri: Record<string, number> = {}
    ;(friRows ?? []).forEach((s: any) => {
      if (latestFri[s.farmer_id] === undefined) latestFri[s.farmer_id] = Number(s.total_score)
    })

    // 7. Build farmer risk profiles — include ALL org farmers, not just enrolled
    const enriched: RiskFarmer[] = (farmerRows ?? []).map((f: any) => {
      const fri = Number(f.current_fri_score) || latestFri[f.id] || 0
      const lastCheckinIso = latestCheckin[f.id]
      const lastCheckinDays = lastCheckinIso
        ? Math.floor((today.getTime() - new Date(lastCheckinIso).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const level = classifyRisk(fri, lastCheckinDays)
      const progId = farmerProgramMap.get(f.id)
      const cohortId = farmerCohortMap.get(f.id)
      return {
        id:                f.id,
        full_name:         f.full_name ?? 'Unknown',
        region:            f.region ?? f.district ?? '—',
        fri_score:         fri,
        last_checkin_days: lastCheckinDays,
        risk_level:        level,
        risk_reasons:      getRiskReasons(fri, lastCheckinDays),
        program_name:      progId ? (programNameMap.get(progId) ?? '') : '',
        cohort_name:       cohortId ? (cohortNameMap.get(cohortId) ?? '') : '',
      }
    })

    setFarmers(enriched)

    // 8. Build program-level risk
    const progRiskMap = new Map<string, { farmers: RiskFarmer[] }>()
    programIds.forEach(pid => progRiskMap.set(pid, { farmers: [] }))
    enriched.forEach(f => {
      const pid = farmerProgramMap.get(f.id)
      if (pid && progRiskMap.has(pid)) {
        progRiskMap.get(pid)!.farmers.push(f)
      }
    })

    const progRisks: ProgramRisk[] = programIds.map(pid => {
      const group = progRiskMap.get(pid)!.farmers
      const checkinCount = group.filter(f => f.last_checkin_days !== null && f.last_checkin_days <= 30).length
      return {
        id:            pid,
        name:          programNameMap.get(pid) ?? 'Unknown',
        farmer_count:  group.length,
        high:          group.filter(f => f.risk_level === 'high').length,
        medium:        group.filter(f => f.risk_level === 'medium').length,
        low:           group.filter(f => f.risk_level === 'low').length,
        avg_fri:       group.length ? Math.round(group.reduce((s, f) => s + f.fri_score, 0) / group.length) : 0,
        checkin_rate:  group.length ? Math.round((checkinCount / group.length) * 100) : 0,
      }
    }).filter(p => p.farmer_count > 0)
    setProgramRisks(progRisks)

    // 9. Build cohort-level risk
    const cohortRiskMap = new Map<string, { farmers: RiskFarmer[] }>()
    ;(cohortRows ?? []).forEach((c: any) => cohortRiskMap.set(c.id, { farmers: [] }))
    enriched.forEach(f => {
      const cid = farmerCohortMap.get(f.id)
      if (cid && cohortRiskMap.has(cid)) {
        cohortRiskMap.get(cid)!.farmers.push(f)
      }
    })

    const cohRisks: CohortRisk[] = (cohortRows ?? []).map((c: any) => {
      const group = cohortRiskMap.get(c.id)!.farmers
      const checkinCount = group.filter(f => f.last_checkin_days !== null && f.last_checkin_days <= 30).length
      return {
        id:            c.id,
        name:          c.name,
        program_name:  programNameMap.get(c.program_id) ?? '',
        farmer_count:  group.length,
        high:          group.filter(f => f.risk_level === 'high').length,
        medium:        group.filter(f => f.risk_level === 'medium').length,
        low:           group.filter(f => f.risk_level === 'low').length,
        avg_fri:       group.length ? Math.round(group.reduce((s, f) => s + f.fri_score, 0) / group.length) : 0,
        checkin_rate:  group.length ? Math.round((checkinCount / group.length) * 100) : 0,
      }
    }).filter(c => c.farmer_count > 0)
    setCohortRisks(cohRisks)

    // 10. Previous-period deltas
    const prevPeriodFri = (friRows ?? []).filter((s: any) => {
      const d = new Date(s.created_at)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    const prevFriByFarmer: Record<string, number> = {}
    prevPeriodFri.forEach((s: any) => {
      if (prevFriByFarmer[s.farmer_id] === undefined) prevFriByFarmer[s.farmer_id] = Number(s.total_score)
    })
    const prevFarmerList = Object.values(prevFriByFarmer)
    if (prevFarmerList.length > 0) {
      const prevAvg = Math.round(prevFarmerList.reduce((a, b) => a + b, 0) / prevFarmerList.length)
      setPrevAvgFri(prevAvg)
      const prevHighCount = prevFarmerList.filter(s => s < 40).length
      setPrevHigh(prevHighCount)
    } else {
      setPrevAvgFri(null)
      setPrevHigh(null)
    }

    const prevCheckinFarmerIds = new Set(
      (checkinRows ?? [])
        .filter((c: any) => {
          const d = new Date(c.created_at)
          return d >= sixtyDaysAgo && d < thirtyDaysAgo
        })
        .map((c: any) => c.farmer_id)
    )
    const totalForRate = enriched.length > 0 ? enriched.length : 1
    setPrevCheckinRate(Math.round((prevCheckinFarmerIds.size / totalForRate) * 100))

    // 11. Trend data
    const monthlyFri: Record<string, number[]> = {}
    ;(friRows ?? []).forEach((s: any) => {
      const d = new Date(s.created_at)
      if (d < twelveMonthsAgo) return
      const key = monthKey(d)
      if (!monthlyFri[key]) monthlyFri[key] = []
      monthlyFri[key].push(Number(s.total_score))
    })

    const monthlyEnrollment: Record<string, number> = {}
    ;(enrollmentRows ?? []).forEach((e: any) => {
      if (!e.enrolled_at) return
      const d = new Date(e.enrolled_at)
      if (d < twelveMonthsAgo) return
      const key = monthKey(d)
      monthlyEnrollment[key] = (monthlyEnrollment[key] ?? 0) + 1
    })

    const allMonthKeys = Array.from(
      new Set([...Object.keys(monthlyFri), ...Object.keys(monthlyEnrollment)])
    ).sort()

    const trendKeys = allMonthKeys.length > 0 ? allMonthKeys.slice(-12) : (() => {
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today)
        d.setMonth(d.getMonth() - (5 - i))
        return monthKey(d)
      })
    })()

    const trend: TrendPoint[] = trendKeys.map(key => {
      const scores = monthlyFri[key] ?? []
      const avg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0
      return {
        month:    monthLabel(key),
        avg_fri:  avg,
        enrolled: monthlyEnrollment[key] ?? 0,
      }
    })

    setTrendData(trend)

    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  const high   = farmers.filter(f => f.risk_level === 'high').length
  const medium = farmers.filter(f => f.risk_level === 'medium').length
  const low    = farmers.filter(f => f.risk_level === 'low').length
  const avgFri = farmers.length
    ? Math.round(farmers.reduce((s, f) => s + f.fri_score, 0) / farmers.length)
    : 0
  const checkinRate = farmers.length
    ? Math.round((farmers.filter(f => f.last_checkin_days !== null && f.last_checkin_days <= 30).length / farmers.length) * 100)
    : 0

  const highDelta   = prevHigh   !== null ? high   - prevHigh   : 0
  const avgFriDelta = prevAvgFri !== null ? avgFri - prevAvgFri : 0
  const checkinDelta = prevCheckinRate !== null ? checkinRate - prevCheckinRate : 0

  const pieData = [
    { name: 'High',   value: high   },
    { name: 'Medium', value: medium },
    { name: 'Low',    value: low    },
  ]

  const riskFactorData = [
    { factor: 'Not Yet Scored',  count: farmers.filter(f => f.fri_score === 0).length },
    { factor: 'Low FRI Score',    count: farmers.filter(f => f.fri_score > 0 && f.fri_score < 40).length },
    { factor: 'Below Avg FRI',   count: farmers.filter(f => f.fri_score >= 40 && f.fri_score < 60).length },
    { factor: 'Missed Check-ins', count: farmers.filter(f => f.last_checkin_days !== null && f.last_checkin_days > 60).length },
    { factor: 'No Check-in',      count: farmers.filter(f => f.last_checkin_days === null).length },
  ].filter(d => d.count > 0)

  const regions = Array.from(new Set(farmers.map(f => f.region))).filter(Boolean)
  const regionData: RegionRow[] = regions.map(r => {
    const group = farmers.filter(f => f.region === r)
    return {
      region:  r,
      high:    group.filter(f => f.risk_level === 'high').length,
      medium:  group.filter(f => f.risk_level === 'medium').length,
      low:     group.filter(f => f.risk_level === 'low').length,
      avg_fri: group.length
        ? Math.round(group.reduce((s, f) => s + f.fri_score, 0) / group.length)
        : 0,
    }
  }).sort((a, b) => b.high - a.high)

  const filteredFarmers = farmers
    .filter(f => riskFilter === 'all' || f.risk_level === riskFilter)
    .sort((a, b) => sortAsc ? a.fri_score - b.fri_score : b.fri_score - a.fri_score)

  const pageSize    = loadAll ? filteredFarmers.length || 1 : BASE_PAGE_SIZE
  const totalPages  = Math.max(1, Math.ceil(filteredFarmers.length / pageSize))
  const pagedFarmers = filteredFarmers.slice((page - 1) * pageSize, page * pageSize)

  const kpis = [
    { label: 'High Risk',     value: high,             delta: highDelta,    inverted: true,  color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100'     },
    { label: 'Medium Risk',   value: medium,           delta: 0,            inverted: false, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
    { label: 'Avg FRI Score', value: avgFri,           delta: avgFriDelta,  inverted: false, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Check-in Rate', value: `${checkinRate}%`,delta: checkinDelta, inverted: false, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  ]

  const totalEnrolled  = trendData.reduce((s, d) => s + d.enrolled, 0)
  const friImprovement = trendData.length >= 2
    ? trendData[trendData.length - 1].avg_fri - trendData[0].avg_fri
    : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Risk Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">Identify and monitor at-risk farmers across your programs and cohorts</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, delta, inverted, color, bg, border }) => (
          <Card key={label} className={`border ${border}`}>
            <CardContent className="pt-5 pb-4">
              <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
                <AlertTriangle className={`w-4 h-4 ${color}`} />
              </div>
              {loading
                ? <Skeleton className="h-8 w-16 mb-1" />
                : (
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <DeltaChip value={delta} inverted={inverted} />
                    </div>
                  )
              }
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No farmers found in your organisation.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="60%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {pieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                            <span className="text-sm text-gray-600">{entry.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Top Risk Factors</CardTitle></CardHeader>
                <CardContent>
                  {riskFactorData.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No risk factors detected.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={riskFactorData} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis dataKey="factor" type="category" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {high > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Action Required</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {high} farmer{high !== 1 ? 's are' : ' is'} classified as high risk. Schedule urgent check-ins and consider targeted interventions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── At-Risk Farmers ── */}
      {activeTab === 'At-Risk Farmers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Filter className="w-4 h-4" /> Filter:
            </div>
            {(['all', 'high', 'medium', 'low'] as const).map(level => (
              <button
                key={level}
                onClick={() => { setRiskFilter(level); setPage(1) }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                  riskFilter === level
                    ? level === 'all'    ? 'bg-gray-900 text-white'
                    : level === 'high'   ? 'bg-red-600 text-white'
                    : level === 'medium' ? 'bg-amber-500 text-white'
                    :                     'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level === 'all'
                  ? `All (${farmers.length})`
                  : `${level} (${farmers.filter(f => f.risk_level === level).length})`}
              </button>
            ))}
            <button
              onClick={() => setSortAsc(v => !v)}
              className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              FRI Score
              {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {loading
            ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            : (
              <div className="space-y-2">
                {pagedFarmers.map(farmer => (
                  <div key={farmer.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-gray-300 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RISK_COLORS[farmer.risk_level] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{farmer.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{farmer.region}</p>
                        {farmer.program_name && (
                          <span className="text-xs text-gray-400">· {farmer.program_name}</span>
                        )}
                        {farmer.cohort_name && (
                          <span className="text-xs text-gray-400">· {farmer.cohort_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: RISK_COLORS[farmer.risk_level] }}>
                        FRI {farmer.fri_score}
                      </p>
                      <p className="text-xs text-gray-400">
                        {farmer.last_checkin_days !== null ? `${farmer.last_checkin_days}d ago` : 'No check-in'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-[180px] justify-end">
                      {farmer.risk_reasons.map(r => (
                        <Badge key={r} variant="outline" className="text-xs py-0 px-1.5 border-gray-200 text-gray-600">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredFarmers.length === 0 && (
                  <p className="text-center py-10 text-gray-400 text-sm">No farmers match this filter.</p>
                )}
              </div>
            )
          }
          <Pagination
            page={page} totalPages={totalPages} onPageChange={setPage}
            totalItems={filteredFarmers.length} pageSize={pageSize}
            onLoadAll={() => { setLoadAll(true); setPage(1) }}
            onResetPaging={() => { setLoadAll(false); setPage(1) }}
          />
        </div>
      )}

      {/* ── By Region ── */}
      {activeTab === 'By Region' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Risk by Region</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : regionData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No regional data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="high"   name="High"   stackId="a" fill="#ef4444" />
                    <Bar dataKey="medium" name="Medium" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="low"    name="Low"    stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Regional Summary</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Region', 'High Risk', 'Medium Risk', 'Low Risk', 'Avg FRI'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            {Array.from({ length: 5 }).map((__, j) => (
                              <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                            ))}
                          </tr>
                        ))
                      : regionData.map(row => {
                          const total = row.high + row.medium + row.low
                          const highPct = total ? Math.round((row.high / total) * 100) : 0
                          return (
                            <tr key={row.region} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{row.region}</td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold ${highPct > 30 ? 'text-red-600' : 'text-gray-700'}`}>
                                  {row.high}
                                  {highPct > 30 && <span className="ml-1 text-xs text-red-400">({highPct}%)</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-amber-600 font-medium">{row.medium}</td>
                              <td className="px-4 py-3 text-emerald-600 font-medium">{row.low}</td>
                              <td className="px-4 py-3 text-gray-700 font-medium">{row.avg_fri}</td>
                            </tr>
                          )
                        })
                    }
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── By Program ── */}
      {activeTab === 'By Program' && (
        <div className="space-y-6">
          {/* Program selector */}
          <div className="flex items-center gap-3">
            <div className="w-64">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs (Overview)</SelectItem>
                  {allPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          ) : programRisks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No program data available.</p>
            </div>
          ) : selectedProgram !== 'all' ? (
            /* Single program detail view */
            (() => {
              const prog = programRisks.find(p => p.id === selectedProgram)
              if (!prog) return <p className="text-sm text-gray-400 text-center py-10">Program not found.</p>
              const progFarmers = farmers.filter(f => f.program_name === prog.name)
              const progCohorts = cohortRisks.filter(c => c.program_name === prog.name)
              return (
                <div className="space-y-6">
                  {/* KPI summary for this program */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-red-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-red-600">{prog.high}</p><p className="text-xs text-gray-500 mt-0.5">High Risk</p></CardContent></Card>
                    <Card className="border-amber-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-amber-600">{prog.medium}</p><p className="text-xs text-gray-500 mt-0.5">Medium Risk</p></CardContent></Card>
                    <Card className="border-emerald-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-emerald-600">{prog.low}</p><p className="text-xs text-gray-500 mt-0.5">Low Risk</p></CardContent></Card>
                    <Card className="border-blue-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-blue-600">{prog.avg_fri}</p><p className="text-xs text-gray-500 mt-0.5">Avg FRI Score</p></CardContent></Card>
                  </div>

                  {/* Risk distribution pie */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Risk Distribution — {prog.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="55%" height={200}>
                          <PieChart>
                            <Pie data={[{ name: 'High', value: prog.high }, { name: 'Medium', value: prog.medium }, { name: 'Low', value: prog.low }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                              {[0, 1, 2].map(i => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3 flex-1">
                          {['High', 'Medium', 'Low'].map((label, i) => {
                            const count = [prog.high, prog.medium, prog.low][i]
                            return (
                              <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                  <span className="text-sm text-gray-600">{label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{count}</span>
                              </div>
                            )
                          })}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Check-in Rate</span>
                              <span className="text-sm font-semibold text-blue-600">{prog.checkin_rate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cohorts within this program */}
                  {progCohorts.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Cohorts in {prog.name}</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                {['Cohort', 'Farmers', 'High', 'Medium', 'Low', 'Avg FRI', 'Check-in %'].map(h => (
                                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {progCohorts.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                  <td className="px-4 py-3 text-gray-600">{c.farmer_count}</td>
                                  <td className="px-4 py-3 text-red-600 font-medium">{c.high}</td>
                                  <td className="px-4 py-3 text-amber-600 font-medium">{c.medium}</td>
                                  <td className="px-4 py-3 text-emerald-600 font-medium">{c.low}</td>
                                  <td className="px-4 py-3 text-gray-700 font-medium">{c.avg_fri}</td>
                                  <td className="px-4 py-3 text-blue-600 font-medium">{c.checkin_rate}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* At-risk farmers in this program */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">At-Risk Farmers — {prog.name}</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-50">
                        {progFarmers.filter(f => f.risk_level !== 'low').length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No at-risk farmers in this program.</p>
                        ) : progFarmers.filter(f => f.risk_level !== 'low').map(f => (
                          <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RISK_COLORS[f.risk_level] }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{f.full_name}</p>
                              <p className="text-xs text-gray-500">{f.region}{f.cohort_name ? ` · ${f.cohort_name}` : ''}</p>
                            </div>
                            <span className="text-sm font-bold" style={{ color: RISK_COLORS[f.risk_level] }}>FRI {f.fri_score}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()
          ) : (
            /* All programs overview */
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Program Risk Comparison</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={programRisks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="high"   name="High"   stackId="a" fill="#ef4444" />
                      <Bar dataKey="medium" name="Medium" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="low"    name="Low"    stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {programRisks.map(prog => (
                  <Card key={prog.id} className="border border-gray-100 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all" onClick={() => setSelectedProgram(prog.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{prog.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{prog.farmer_count} farmers · Click to view details</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs font-semibold text-red-600">{prog.high}</span>
                          <div className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
                          <span className="text-xs font-semibold text-amber-600">{prog.medium}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
                          <span className="text-xs font-semibold text-emerald-600">{prog.low}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-xs text-gray-500">Avg FRI Score</p>
                          <p className="text-lg font-bold text-gray-900 mt-0.5">{prog.avg_fri}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-xs text-gray-500">Check-in Rate</p>
                          <p className="text-lg font-bold text-gray-900 mt-0.5">{prog.checkin_rate}%</p>
                        </div>
                      </div>
                      {prog.high > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          {prog.high} high-risk farmer{prog.high !== 1 ? 's' : ''} need attention
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── By Cohort ── */}
      {activeTab === 'By Cohort' && (
        <div className="space-y-6">
          {/* Cohort selector */}
          <div className="flex items-center gap-3">
            <div className="w-72">
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts (Overview)</SelectItem>
                  {allCohorts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
          ) : cohortRisks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No cohort data available.</p>
            </div>
          ) : selectedCohort !== 'all' ? (
            /* Single cohort detail view */
            (() => {
              const coh = cohortRisks.find(c => c.id === selectedCohort)
              if (!coh) return <p className="text-sm text-gray-400 text-center py-10">Cohort not found.</p>
              const cohFarmers = farmers.filter(f => f.cohort_name === coh.name)
              return (
                <div className="space-y-6">
                  {/* KPI summary for this cohort */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-red-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-red-600">{coh.high}</p><p className="text-xs text-gray-500 mt-0.5">High Risk</p></CardContent></Card>
                    <Card className="border-amber-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-amber-600">{coh.medium}</p><p className="text-xs text-gray-500 mt-0.5">Medium Risk</p></CardContent></Card>
                    <Card className="border-emerald-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-emerald-600">{coh.low}</p><p className="text-xs text-gray-500 mt-0.5">Low Risk</p></CardContent></Card>
                    <Card className="border-blue-100"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-blue-600">{coh.avg_fri}</p><p className="text-xs text-gray-500 mt-0.5">Avg FRI Score</p></CardContent></Card>
                  </div>

                  {/* Risk distribution pie */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Risk Distribution — {coh.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="55%" height={200}>
                          <PieChart>
                            <Pie data={[{ name: 'High', value: coh.high }, { name: 'Medium', value: coh.medium }, { name: 'Low', value: coh.low }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                              {[0, 1, 2].map(i => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3 flex-1">
                          {['High', 'Medium', 'Low'].map((label, i) => {
                            const count = [coh.high, coh.medium, coh.low][i]
                            return (
                              <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                  <span className="text-sm text-gray-600">{label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{count}</span>
                              </div>
                            )
                          })}
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Check-in Rate</span>
                              <span className="text-sm font-semibold text-blue-600">{coh.checkin_rate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* At-risk farmers in this cohort */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">At-Risk Farmers — {coh.name}</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-50">
                        {cohFarmers.filter(f => f.risk_level !== 'low').length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No at-risk farmers in this cohort.</p>
                        ) : cohFarmers.filter(f => f.risk_level !== 'low').map(f => (
                          <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RISK_COLORS[f.risk_level] }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{f.full_name}</p>
                              <p className="text-xs text-gray-500">{f.region}</p>
                            </div>
                            <span className="text-sm font-bold" style={{ color: RISK_COLORS[f.risk_level] }}>FRI {f.fri_score}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()
          ) : (
            /* All cohorts overview */
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Cohort Risk Comparison</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={cohortRisks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="high"   name="High"   stackId="a" fill="#ef4444" />
                      <Bar dataKey="medium" name="Medium" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="low"    name="Low"    stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {cohortRisks.map(coh => (
                  <Card key={coh.id} className="border border-gray-100 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all" onClick={() => setSelectedCohort(coh.id)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{coh.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {coh.program_name && `${coh.program_name} · `}
                            {coh.farmer_count} farmers · Click to view details
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs font-semibold text-red-600">{coh.high}</span>
                          <div className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
                          <span className="text-xs font-semibold text-amber-600">{coh.medium}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
                          <span className="text-xs font-semibold text-emerald-600">{coh.low}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-xs text-gray-500">Avg FRI Score</p>
                          <p className="text-lg font-bold text-gray-900 mt-0.5">{coh.avg_fri}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-xs text-gray-500">Check-in Rate</p>
                          <p className="text-lg font-bold text-gray-900 mt-0.5">{coh.checkin_rate}%</p>
                        </div>
                      </div>
                      {coh.high > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          {coh.high} high-risk farmer{coh.high !== 1 ? 's' : ''} need attention
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Trends ── */}
      {activeTab === 'Trends' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Average FRI Score Over Time</CardTitle></CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Not enough historical FRI data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="friGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avg_fri" name="Avg FRI" stroke="#10b981" fill="url(#friGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">New Enrollments by Month</CardTitle></CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No enrollment trend data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="enrolled" name="New Enrollments" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className={`text-2xl font-bold ${friImprovement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {friImprovement >= 0 ? '+' : ''}{friImprovement} pts
                </p>
                <p className="text-sm font-medium text-gray-700 mt-1">FRI trend</p>
                <p className="text-xs text-gray-400 mt-0.5">First → latest month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-2xl font-bold text-blue-600">{totalEnrolled}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">Enrollments tracked</p>
                <p className="text-xs text-gray-400 mt-0.5">Last 12 months</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-2xl font-bold text-gray-800">{farmers.length}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">Total farmers</p>
                <p className="text-xs text-gray-400 mt-0.5">In organisation</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
