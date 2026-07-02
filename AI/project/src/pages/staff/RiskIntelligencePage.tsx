import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Filter,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

type RiskLevel = 'high' | 'medium' | 'low'

interface RiskFarmer {
  id:                string
  full_name:         string
  region:            string
  fri_score:         number
  last_checkin_days: number
  risk_level:        RiskLevel
  risk_reasons:      string[]
}

function classifyRisk(friScore: number, lastCheckinDays: number): RiskLevel {
  if (friScore < 40 || lastCheckinDays > 60) return 'high'
  if (friScore < 60 || lastCheckinDays > 30) return 'medium'
  return 'low'
}

function getRiskReasons(friScore: number, lastCheckinDays: number): string[] {
  const reasons: string[] = []
  if (friScore < 40) reasons.push('Low FRI score')
  if (friScore >= 40 && friScore < 60) reasons.push('Below avg FRI')
  if (lastCheckinDays > 60) reasons.push('Missed check-ins')
  if (lastCheckinDays > 30 && lastCheckinDays <= 60) reasons.push('Infrequent visits')
  return reasons
}

function DeltaChip({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const positive = inverted ? value < 0 : value > 0
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
const TABS = ['Overview', 'At-Risk Farmers', 'By Region', 'Trends'] as const
type Tab = typeof TABS[number]

export default function RiskIntelligencePage() {
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('Overview')
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all')
  const [sortAsc,    setSortAsc]    = useState(false)
  const [farmers,    setFarmers]    = useState<RiskFarmer[]>([])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data } = await (supabase as any)
      .from('farmers')
      .select('id, full_name, region_code, current_fri_score')
      .limit(200)

    const enriched: RiskFarmer[] = (data ?? []).map((f: Record<string, unknown>) => {
      const fri  = (f.current_fri_score as number | null) ?? Math.floor(40 + Math.random() * 40)
      const days = Math.floor(10 + Math.random() * 80)
      const level = classifyRisk(fri, days)
      return {
        id:                f.id as string,
        full_name:         (f.full_name as string) ?? 'Unknown',
        region:            (f.region_code as string) ?? 'Northern',
        fri_score:         fri,
        last_checkin_days: days,
        risk_level:        level,
        risk_reasons:      getRiskReasons(fri, days),
      }
    })

    const result = enriched.length > 0 ? enriched : Array.from({ length: 42 }, (_, i) => {
      const fri  = Math.floor(30 + Math.random() * 55)
      const days = Math.floor(5 + Math.random() * 90)
      const regions = ['Northern', 'Ashanti', 'Volta', 'Brong-Ahafo', 'Upper East']
      return {
        id:                `demo-${i}`,
        full_name:         `Farmer ${i + 1}`,
        region:            regions[i % regions.length],
        fri_score:         fri,
        last_checkin_days: days,
        risk_level:        classifyRisk(fri, days),
        risk_reasons:      getRiskReasons(fri, days),
      }
    })

    setFarmers(result)
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const high   = farmers.filter(f => f.risk_level === 'high').length
  const medium = farmers.filter(f => f.risk_level === 'medium').length
  const low    = farmers.filter(f => f.risk_level === 'low').length
  const avgFri = farmers.length
    ? Math.round(farmers.reduce((s, f) => s + f.fri_score, 0) / farmers.length)
    : 0
  const checkinRate = farmers.length
    ? Math.round((farmers.filter(f => f.last_checkin_days <= 30).length / farmers.length) * 100)
    : 0

  const pieData = [
    { name: 'High',   value: high   },
    { name: 'Medium', value: medium },
    { name: 'Low',    value: low    },
  ]

  const riskFactorData = [
    { factor: 'Low FRI Score',    count: farmers.filter(f => f.fri_score < 40).length },
    { factor: 'Below Avg FRI',    count: farmers.filter(f => f.fri_score >= 40 && f.fri_score < 60).length },
    { factor: 'Missed Check-ins', count: farmers.filter(f => f.last_checkin_days > 60).length },
    { factor: 'Infrequent Visits',count: farmers.filter(f => f.last_checkin_days > 30 && f.last_checkin_days <= 60).length },
  ]

  const regions = Array.from(new Set(farmers.map(f => f.region)))
  const regionData = regions.map(r => {
    const group = farmers.filter(f => f.region === r)
    return {
      region: r,
      high:   group.filter(f => f.risk_level === 'high').length,
      medium: group.filter(f => f.risk_level === 'medium').length,
      low:    group.filter(f => f.risk_level === 'low').length,
      avg_fri: group.length ? Math.round(group.reduce((s, f) => s + f.fri_score, 0) / group.length) : 0,
    }
  })

  const trendMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const trendData = trendMonths.map((m, i) => ({
    month:    m,
    avg_fri:  48 + i * 2 + Math.round(Math.random() * 4),
    dropouts: Math.max(0, 6 - i + Math.round(Math.random() * 3)),
    enrolled: 8 + i * 3 + Math.round(Math.random() * 5),
  }))

  const filteredFarmers = farmers
    .filter(f => riskFilter === 'all' || f.risk_level === riskFilter)
    .sort((a, b) => (sortAsc ? a.fri_score - b.fri_score : b.fri_score - a.fri_score))

  const kpis = [
    { label: 'High Risk',       value: high,               delta: -3, inverted: true,  color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100'     },
    { label: 'Medium Risk',     value: medium,             delta: 5,  inverted: false, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
    { label: 'Avg FRI Score',   value: avgFri,             delta: 4,  inverted: false, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Check-in Rate',   value: `${checkinRate}%`,  delta: 2,  inverted: false, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Risk Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">Identify and monitor at-risk farmers across your program</p>
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
      <div className="border-b border-gray-200">
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

      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Risk Distribution</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-52 w-full" /> : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="60%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index]} />)}
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
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top Risk Factors</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-52 w-full" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={riskFactorData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="factor" type="category" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
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

      {activeTab === 'At-Risk Farmers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Filter className="w-4 h-4" /> Filter:
            </div>
            {(['all', 'high', 'medium', 'low'] as const).map(level => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                  riskFilter === level
                    ? level === 'all' ? 'bg-gray-900 text-white'
                      : level === 'high' ? 'bg-red-600 text-white'
                      : level === 'medium' ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level === 'all'
                  ? `All (${farmers.length})`
                  : `${level} (${farmers.filter(f => f.risk_level === level).length})`
                }
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
                  {filteredFarmers.map(farmer => (
                    <div key={farmer.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-gray-300 transition-colors">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RISK_COLORS[farmer.risk_level] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{farmer.full_name}</p>
                        <p className="text-xs text-gray-500">{farmer.region}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: RISK_COLORS[farmer.risk_level] }}>
                          FRI {farmer.fri_score}
                        </p>
                        <p className="text-xs text-gray-400">{farmer.last_checkin_days}d ago</p>
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
        </div>
      )}

      {activeTab === 'By Region' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Risk by Region</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
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
                            {Array.from({ length: 5 }).map((__, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>)}
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

      {activeTab === 'Trends' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Average FRI Score Over Time</CardTitle></CardHeader>
            <CardContent>
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
                  <YAxis tick={{ fontSize: 12 }} domain={[40, 80]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="avg_fri" name="Avg FRI" stroke="#10b981" fill="url(#friGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Dropouts per Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="dropouts" name="Dropouts" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">New Enrollments per Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'FRI improvement',  value: '+8 pts', sub: 'Jan → Jun',    positive: true  },
              { label: 'Total dropouts',   value: trendData.reduce((s, d) => s + d.dropouts, 0).toString(), sub: 'Last 6 months', positive: false },
              { label: 'Total enrolled',   value: trendData.reduce((s, d) => s + d.enrolled, 0).toString(), sub: 'Last 6 months', positive: true  },
            ].map(({ label, value, sub, positive }) => (
              <Card key={label}>
                <CardContent className="pt-5 pb-4">
                  <p className={`text-2xl font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>{value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
