import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, TrendingUp, AlertTriangle, Activity,
  Download, RefreshCw, FileBarChart, CheckCircle, Clock,
  Brain, Loader2, ChevronDown, ChevronUp,
  UserCog, Zap, BarChart2, ClipboardList, Sparkles,
  Calendar, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Program } from '@/types';

// ── Colour palette ────────────────────────────────────────────────────────────

const ZONE_COLORS = { low: '#16a34a', medium: '#d97706', high: '#dc2626', critical: '#7f1d1d', Green: '#16a34a', Amber: '#d97706', Red: '#dc2626' };
const BAR_COLORS  = ['#2d6a4f', '#40916c', '#74c69d', '#52b788', '#1b4332', '#b7e4c7', '#081c15', '#d8f3dc'];

const SEVERITY_COLORS: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-blue-100 text-blue-700',
};

// ── Report types ──────────────────────────────────────────────────────────────

type ReportTab = 'overview' | 'weekly' | 'generator';

const REPORT_TEMPLATES = [
  {
    id:          'portfolio_summary',
    label:       'Portfolio Summary',
    description: 'Full overview of farmers, enrollments, FRI scores, and zone distribution.',
    icon:        BarChart2,
  },
  {
    id:          'agent_performance',
    label:       'Agent Performance',
    description: 'Agent-level check-in rates, farmer counts, and verification activity.',
    icon:        UserCog,
  },
  {
    id:          'intervention_uptake',
    label:       'Intervention Uptake',
    description: 'Enrollment vs. eligible farmers per intervention, approval rates.',
    icon:        Zap,
  },
  {
    id:          'risk_analysis',
    label:       'Risk Analysis',
    description: 'Open risk flags by type and severity, high-risk farmer breakdown.',
    icon:        AlertTriangle,
  },
  {
    id:          'checkin_compliance',
    label:       'Check-in Compliance',
    description: 'Weekly check-in completion rates across agents and farmers.',
    icon:        ClipboardList,
  },
  {
    id:          'fri_trends',
    label:       'FRI Score Trends',
    description: 'FRI score movement over weeks, pillar breakdowns, and zone changes.',
    icon:        TrendingUp,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-cropguard-forest">{value}</p>
        <p className="text-sm text-cropguard-slate mt-0.5">{label}</p>
        {sub && <p className="text-xs text-cropguard-mid mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border shadow-sm p-5', className)}>
      <h3 className="font-semibold text-cropguard-forest mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Weekly report row ─────────────────────────────────────────────────────────

interface WeeklyReport {
  week_label:      string;
  week_start:      string;
  week_end:        string;
  checkins_total:  number;
  checkins_verified: number;
  farmers_active:  number;
  agents:          { name: string; checkins: number; verified: number }[];
  top_issues:      string[];
}

function WeeklyReportRow({ report }: { report: WeeklyReport }) {
  const [open, setOpen] = useState(false);
  const rate = report.checkins_total > 0
    ? Math.round((report.checkins_verified / report.checkins_total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-10 h-10 rounded-xl bg-cropguard-mint flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-cropguard-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cropguard-forest text-sm">{report.week_label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{report.week_start} – {report.week_end}</p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold text-cropguard-forest">{report.checkins_total}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-ins</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-lg font-bold text-emerald-600">{rate}%</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Verified</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-lg font-bold text-blue-600">{report.farmers_active}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Farmers</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t bg-gray-50/60 px-5 py-4 space-y-4">
          {/* Agent breakdown */}
          {report.agents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Agent Activity</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {report.agents.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                        <span className="text-cropguard-dark text-[10px] font-bold">{a.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-gray-500">{a.checkins} check-ins</span>
                      <span className={cn('font-semibold', a.verified > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                        {a.verified} verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top issues */}
          {report.top_issues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Reported Issues</p>
              <div className="flex flex-wrap gap-2">
                {report.top_issues.map((issue, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full">{issue}</span>
                ))}
              </div>
            </div>
          )}

          {report.agents.length === 0 && report.top_issues.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No detailed data for this week.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Report generator ───────────────────────────────────────────────────────

interface GeneratedReport {
  title:    string;
  date:     string;
  sections: { heading: string; body: string }[];
}

function ReportGenerator({ profile, programs }: { profile: any; programs: Program[] }) {
  const [selected,   setSelected]   = useState('portfolio_summary');
  const [program,    setProgram]    = useState('');
  const [generating, setGenerating] = useState(false);
  const [report,     setReport]     = useState<GeneratedReport | null>(null);
  const [error,      setError]      = useState('');

  const generate = async () => {
    setGenerating(true);
    setError('');
    setReport(null);
    try {
      const template = REPORT_TEMPLATES.find(t => t.id === selected)!;
      const orgId = profile?.organisation_id;

      // Gather data from platform based on report type
      const [farmersRes, enrollRes, friRes, checkinRes, interventionRes, agentsRes] = await Promise.all([
        supabase.from('farmers').select('id, full_name, region_code, primary_crop, is_verified').eq('organisation_id', orgId).limit(500),
        supabase.from('enrollments').select('id, farmer_id, agent_id, status, created_at').in('program_id', programs.map(p => p.id)).limit(500),
        supabase.from('farmer_fri_scores').select('farmer_id, total_score, zone, week_number').order('created_at', { ascending: false }).limit(500),
        supabase.from('farmer_checkins').select('id, farmer_id, week_number, status, is_verified, help_requested, challenge_notes, created_at').order('created_at', { ascending: false }).limit(300),
        supabase.from('farmer_intervention_applications').select('id, farmer_id, intervention_id, status').limit(300),
        supabase.from('users').select('id, full_name').eq('organisation_id', orgId).eq('role', 'agent').eq('is_active', true),
      ]);

      const farmers    = farmersRes.data ?? [];
      const enrollments = enrollRes.data ?? [];
      const scores     = friRes.data ?? [];
      const checkins   = checkinRes.data ?? [];
      const applications = interventionRes.data ?? [];
      const agents     = agentsRes.data ?? [];

      // Latest score per farmer
      const latestScore: Record<string, any> = {};
      scores.forEach((s: any) => {
        if (!latestScore[s.farmer_id] || s.week_number > latestScore[s.farmer_id].week_number) latestScore[s.farmer_id] = s;
      });

      const zoneCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      Object.values(latestScore).forEach((s: any) => { if (s.zone) zoneCounts[s.zone] = (zoneCounts[s.zone] ?? 0) + 1; });

      const verified    = farmers.filter((f: any) => f.is_verified).length;
      const activeEnrol = new Set(enrollments.filter((e: any) => e.status === 'active').map((e: any) => e.farmer_id)).size;
      const avgFri      = scores.length > 0 ? (scores.reduce((s: number, r: any) => s + Number(r.total_score), 0) / scores.length).toFixed(1) : 'N/A';
      const verifiedCkn = checkins.filter((c: any) => c.is_verified).length;
      const helpReqs    = checkins.filter((c: any) => c.help_requested).length;

      // Issues mentioned
      const issueWords: Record<string, number> = {};
      checkins.forEach((c: any) => {
        if (c.challenge_notes) {
          c.challenge_notes.toLowerCase().split(/\W+/).filter((w: string) => w.length > 4).forEach((w: string) => {
            issueWords[w] = (issueWords[w] ?? 0) + 1;
          });
        }
      });
      const topIssues = Object.entries(issueWords).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);

      const agentActivity = agents.map((a: any) => {
        const aC = checkins.filter((c: any) => c.farmer_id && enrollments.find((e: any) => e.farmer_id === c.farmer_id && e.agent_id === a.id)).length;
        return { name: a.full_name, checkins: aC };
      }).filter((a: any) => a.checkins > 0).sort((a: any, b: any) => b.checkins - a.checkins);

      const appStatus: Record<string, number> = { applied: 0, active: 0, closed: 0, suspended: 0 };
      applications.forEach((a: any) => { appStatus[a.status] = (appStatus[a.status] ?? 0) + 1; });

      // Build sections based on template
      const sections: { heading: string; body: string }[] = [];
      const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      if (selected === 'portfolio_summary' || selected === 'fri_trends') {
        sections.push({
          heading: 'Farmer Portfolio',
          body: `Total registered farmers: ${farmers.length}. Verified: ${verified} (${farmers.length > 0 ? Math.round(verified / farmers.length * 100) : 0}%). ` +
            `Currently enrolled in active programs: ${activeEnrol}. ` +
            `Average FRI score across scored farmers: ${avgFri}/100.`,
        });
        sections.push({
          heading: 'FRI Zone Distribution',
          body: `Low risk: ${zoneCounts.low} farmers. Medium risk: ${zoneCounts.medium}. High risk: ${zoneCounts.high}. Critical: ${zoneCounts.critical}. ` +
            (zoneCounts.high + zoneCounts.critical > 0
              ? `${zoneCounts.high + zoneCounts.critical} farmers require priority attention.`
              : 'No farmers are in critical or high risk at this time.'),
        });
      }

      if (selected === 'agent_performance' || selected === 'portfolio_summary') {
        sections.push({
          heading: 'Agent Check-in Activity',
          body: `Total check-ins submitted: ${checkins.length}. Verified: ${verifiedCkn} (${checkins.length > 0 ? Math.round(verifiedCkn / checkins.length * 100) : 0}%). ` +
            `Help requests raised: ${helpReqs}. ` +
            (agentActivity.length > 0
              ? `Top performing agent: ${agentActivity[0].name} (${agentActivity[0].checkins} check-ins recorded).`
              : 'No agent-level check-in data available.'),
        });
      }

      if (selected === 'intervention_uptake') {
        sections.push({
          heading: 'Intervention Applications',
          body: `Total applications: ${applications.length}. Pending: ${appStatus.applied}. Active/approved: ${appStatus.active}. ` +
            `Closed: ${appStatus.closed}. Suspended: ${appStatus.suspended}. ` +
            `Approval rate: ${applications.length > 0 ? Math.round((appStatus.active / applications.length) * 100) : 0}%.`,
        });
      }

      if (selected === 'checkin_compliance') {
        sections.push({
          heading: 'Compliance Summary',
          body: `${checkins.length} check-ins were recorded in total. Of these, ${verifiedCkn} were verified by agents. ` +
            `${helpReqs} farmers raised help requests. ` +
            (topIssues.length > 0 ? `Common topics mentioned in challenge notes: ${topIssues.join(', ')}.` : ''),
        });
      }

      if (selected === 'risk_analysis') {
        sections.push({
          heading: 'Risk Profile',
          body: `${zoneCounts.high + zoneCounts.critical} farmers are in high or critical FRI zones. ` +
            `${helpReqs} help requests were flagged by farmers during check-ins. ` +
            `${zoneCounts.medium} farmers are in the medium risk zone and require monitoring.`,
        });
      }

      sections.push({
        heading: 'Recommendations',
        body: [
          zoneCounts.critical > 0   ? `Prioritise direct intervention for ${zoneCounts.critical} critical-zone farmer(s).`        : '',
          helpReqs > 0              ? `Follow up on ${helpReqs} outstanding help request(s) from farmers.`                        : '',
          verifiedCkn < checkins.length * 0.7 ? `Check-in verification rate is below 70% — agents should increase timely responses.` : '',
          appStatus.applied > 5     ? `${appStatus.applied} intervention applications are pending review and approval.`            : '',
        ].filter(Boolean).join(' ') || 'Portfolio is in good standing. Continue regular monitoring.',
      });

      const filterLabel = program ? programs.find(p => p.id === program)?.name : 'All Programs';
      setReport({
        title:    `${template.label} — ${filterLabel}`,
        date:     now,
        sections,
      });
    } catch (e: any) {
      setError('Failed to generate report. Please try again.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const text = [
      `CROPGUARD — ${report.title.toUpperCase()}`,
      `Generated: ${report.date}`,
      '',
      ...report.sections.flatMap(s => [`${s.heading.toUpperCase()}`, s.body, '']),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `cropguard-report-${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Template picker */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Select Report Type</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                'text-left p-4 rounded-xl border-2 transition-all',
                selected === t.id
                  ? 'border-cropguard-dark bg-cropguard-mint/20'
                  : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm',
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', selected === t.id ? 'bg-cropguard-dark' : 'bg-gray-100')}>
                <t.icon className={cn('w-4 h-4', selected === t.id ? 'text-white' : 'text-gray-500')} />
              </div>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={program || '__all__'} onValueChange={v => setProgram(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-9 w-52 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All programs</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          onClick={generate}
          disabled={generating}
          className="bg-cropguard-dark hover:bg-cropguard-forest"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</>
            : <><Sparkles className="w-4 h-4 mr-2" />Generate with Norvi AI</>
          }
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Generated report output */}
      {report && (
        <div className="bg-white rounded-2xl border border-cropguard-mid/30 shadow-md overflow-hidden">
          <div className="bg-cropguard-forest px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-cropguard-light" />
                <span className="text-xs font-semibold text-cropguard-pale uppercase tracking-widest">Norvi AI Report</span>
              </div>
              <h2 className="text-lg font-bold text-white">{report.title}</h2>
              <p className="text-sm text-cropguard-pale mt-0.5">Generated {report.date}</p>
            </div>
            <Button size="sm" variant="outline" onClick={downloadReport} className="shrink-0 border-white/30 text-white hover:bg-white/10">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
            </Button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {report.sections.map((s, i) => (
              <div key={i} className={cn('rounded-xl p-4', i === report.sections.length - 1 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100')}>
                <p className={cn('text-xs font-bold uppercase tracking-widest mb-2', i === report.sections.length - 1 ? 'text-blue-700' : 'text-cropguard-dark')}>
                  {s.heading}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main data loading ─────────────────────────────────────────────────────────

interface ReportData {
  totalFarmers:      number;
  verifiedFarmers:   number;
  activeEnrollments: number;
  avgFriScore:       number | null;
  openRiskFlags:     number;
  recentCheckins:    number;
  enrollByProgram:   { name: string; count: number }[];
  zoneDistribution:  { name: string; value: number; color: string }[];
  weeklyScoreTrend:  { week: string; avg: number; count: number }[];
  riskFlags:         { flag_type: string; description: string; severity: string; created_at: string }[];
  agentLeaderboard:  { name: string; farmers: number; checkins: number }[];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffReportsPage() {
  const profile = useAuthStore(s => s.profile);
  const [tab,           setTab]           = useState<ReportTab>('overview');
  const [programs,      setPrograms]      = useState<Program[]>([]);
  const [filterProgram, setFilterProgram] = useState('');
  const [data,          setData]          = useState<ReportData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const loadReport = useCallback(async (showRefresh = false) => {
    if (!profile) return;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const orgId = profile.organisation_id;
      const { data: progs } = await supabase.from('programs').select('*').eq('organisation_id', orgId).order('name');
      setPrograms(progs ?? []);

      const [
        { count: totalFarmers },
        { count: verifiedFarmers },
        { data: enrollData },
        { data: orgFarmers },
      ] = await Promise.all([
        supabase.from('farmers').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
        supabase.from('farmers').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('is_verified', true),
        filterProgram
          ? supabase.from('enrollments').select('id,program_id,farmer_id,agent_id').eq('program_id', filterProgram).eq('status', 'active')
          : (supabase.from('enrollments') as any).select('id,program_id,farmer_id,agent_id')
              .in('program_id', (progs ?? []).map((p: Program) => p.id))
              .eq('status', 'active'),
        supabase.from('farmers').select('id').eq('organisation_id', orgId),
      ]);

      const orgFarmerIds     = (orgFarmers ?? []).map((f: any) => f.id);
      const enrolledFarmerIds = (enrollData ?? []).map((e: any) => e.farmer_id);
      const uniqueEnrolled   = new Set(enrolledFarmerIds).size;

      let scoreQuery = (supabase.from('farmer_fri_scores') as any)
        .select('total_score,zone,week_number,farmer_id')
        .order('week_number', { ascending: false });
      scoreQuery = enrolledFarmerIds.length > 0
        ? scoreQuery.in('farmer_id', enrolledFarmerIds.slice(0, 500))
        : scoreQuery.limit(0);
      const { data: scoreData } = await scoreQuery;
      const scores = (scoreData ?? []) as any[];

      const avgFriScore = scores.length > 0
        ? Math.round(scores.reduce((s: number, r: any) => s + r.total_score, 0) / scores.length)
        : null;

      const latestByFarmer: Record<string, any> = {};
      scores.forEach((s: any) => {
        if (!latestByFarmer[s.farmer_id] || s.week_number > latestByFarmer[s.farmer_id].week_number) latestByFarmer[s.farmer_id] = s;
      });
      const zoneCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      Object.values(latestByFarmer).forEach((s: any) => { zoneCounts[s.zone] = (zoneCounts[s.zone] ?? 0) + 1; });
      const zoneDistribution = Object.entries(zoneCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: ZONE_COLORS[name as keyof typeof ZONE_COLORS] ?? '#94a3b8' }));

      const weekMap: Record<number, number[]> = {};
      scores.forEach((s: any) => { weekMap[s.week_number] = [...(weekMap[s.week_number] ?? []), s.total_score]; });
      const weeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b).slice(-8);
      const weeklyScoreTrend = weeks.map(w => ({
        week:  `Wk ${w}`,
        avg:   Math.round(weekMap[w].reduce((s, v) => s + v, 0) / weekMap[w].length),
        count: weekMap[w].length,
      }));

      const riskFlagsQuery = supabase
        .from('risk_flags')
        .select('flag_type,description,severity,created_at', { count: 'exact' })
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);
      const { count: openRiskFlags, data: flagData } = orgFarmerIds.length > 0
        ? await riskFlagsQuery.in('farmer_id', orgFarmerIds.slice(0, 500))
        : await riskFlagsQuery.eq('farmer_id', 'no-match');

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCheckins } = await (supabase.from('farmer_checkins') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      const progCounts: Record<string, number> = {};
      (enrollData ?? []).forEach((e: any) => { progCounts[e.program_id] = (progCounts[e.program_id] ?? 0) + 1; });
      const enrollByProgram = (progs ?? [])
        .map((p: Program) => ({ name: p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name, count: progCounts[p.id] ?? 0 }))
        .filter((p: any) => p.count > 0)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 8);

      const { data: agentData } = await supabase.from('users').select('id,full_name').eq('organisation_id', orgId).eq('role', 'agent').eq('is_active', true);
      const agentFarmerMap: Record<string, number> = {};
      (enrollData ?? []).forEach((e: any) => { if (e.agent_id) agentFarmerMap[e.agent_id] = (agentFarmerMap[e.agent_id] ?? 0) + 1; });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const agentUserIds = (agentData ?? []).map((a: any) => a.id);
      const { data: verifiedByData } = agentUserIds.length > 0
        ? await (supabase.from('farmer_checkins') as any)
            .select('verified_by').in('verified_by', agentUserIds)
            .gte('verified_at', thirtyDaysAgo).not('verified_by', 'is', null)
        : { data: [] };

      const agentCheckinMap: Record<string, number> = {};
      (verifiedByData ?? []).forEach((c: any) => { agentCheckinMap[c.verified_by] = (agentCheckinMap[c.verified_by] ?? 0) + 1; });

      const agentLeaderboard = (agentData ?? [])
        .map((a: any) => ({ name: a.full_name, farmers: agentFarmerMap[a.id] ?? 0, checkins: agentCheckinMap[a.id] ?? 0 }))
        .filter((a: any) => a.farmers > 0 || a.checkins > 0)
        .sort((a: any, b: any) => b.checkins - a.checkins)
        .slice(0, 8);

      setData({
        totalFarmers:      totalFarmers ?? 0,
        verifiedFarmers:   verifiedFarmers ?? 0,
        activeEnrollments: uniqueEnrolled,
        avgFriScore,
        openRiskFlags:     openRiskFlags ?? 0,
        recentCheckins:    recentCheckins ?? 0,
        enrollByProgram,
        zoneDistribution,
        weeklyScoreTrend,
        riskFlags:         (flagData ?? []) as any[],
        agentLeaderboard,
      });
    } catch (err) {
      console.error('Report load failed:', err);
    } finally {
      if (showRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [profile, filterProgram]);

  const loadWeeklyReports = useCallback(async () => {
    if (!profile) return;
    setWeeklyLoading(true);
    try {
      const orgId = profile.organisation_id;

      const [farmersRes, agentsRes, checkinsRes] = await Promise.all([
        supabase.from('farmers').select('id').eq('organisation_id', orgId),
        supabase.from('users').select('id, full_name').eq('organisation_id', orgId).eq('role', 'agent').eq('is_active', true),
        supabase.from('farmer_checkins').select('id, farmer_id, week_number, status, is_verified, help_requested, challenge_notes, created_at').order('week_number', { ascending: false }).limit(1000),
      ]);

      const orgFarmerIds  = new Set((farmersRes.data ?? []).map((f: any) => f.id));
      const agentMap: Record<string, string> = {};
      (agentsRes.data ?? []).forEach((a: any) => { agentMap[a.id] = a.full_name; });

      // Group check-ins by week_number, filtered to org's farmers
      const byWeek: Record<number, any[]> = {};
      (checkinsRes.data ?? []).forEach((c: any) => {
        if (!orgFarmerIds.has(c.farmer_id)) return;
        const wk = c.week_number ?? 0;
        byWeek[wk] = [...(byWeek[wk] ?? []), c];
      });

      // Get enrollments for agent mapping
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('farmer_id, agent_id')
        .in('farmer_id', [...orgFarmerIds].slice(0, 500))
        .eq('status', 'active');

      const farmerAgentMap: Record<string, string> = {};
      (enrollData ?? []).forEach((e: any) => { if (e.agent_id && e.farmer_id) farmerAgentMap[e.farmer_id] = e.agent_id; });

      const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => b - a).slice(0, 8);

      const reports: WeeklyReport[] = weekNumbers.map(wk => {
        const wkCheckins = byWeek[wk];
        const weekStart  = new Date(2024, 0, 1 + (wk - 1) * 7);
        const weekEnd    = new Date(2024, 0, 7 + (wk - 1) * 7);
        const fmt        = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        const agentActivity: Record<string, { checkins: number; verified: number }> = {};
        const farmers = new Set<string>();
        const issueBag: string[] = [];

        wkCheckins.forEach((c: any) => {
          farmers.add(c.farmer_id);
          const agentId = farmerAgentMap[c.farmer_id];
          if (agentId && agentMap[agentId]) {
            if (!agentActivity[agentId]) agentActivity[agentId] = { checkins: 0, verified: 0 };
            agentActivity[agentId].checkins++;
            if (c.is_verified) agentActivity[agentId].verified++;
          }
          if (c.challenge_notes) {
            c.challenge_notes.split(/[.,!?]/).forEach((part: string) => {
              const trimmed = part.trim();
              if (trimmed.length > 5 && trimmed.length < 60) issueBag.push(trimmed);
            });
          }
        });

        const topIssues = [...new Set(issueBag)].slice(0, 4);

        return {
          week_label:       `Week ${wk}`,
          week_start:       fmt(weekStart),
          week_end:         fmt(weekEnd),
          checkins_total:   wkCheckins.length,
          checkins_verified: wkCheckins.filter((c: any) => c.is_verified).length,
          farmers_active:   farmers.size,
          agents: Object.entries(agentActivity).map(([id, v]) => ({ name: agentMap[id] ?? id, ...v })).sort((a, b) => b.checkins - a.checkins),
          top_issues: topIssues,
        };
      });

      setWeeklyReports(reports);
    } finally {
      setWeeklyLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { if (tab === 'weekly') loadWeeklyReports(); }, [tab, loadWeeklyReports]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Farmers', data.totalFarmers],
      ['Verified Farmers', data.verifiedFarmers],
      ['Active Enrollments', data.activeEnrollments],
      ['Avg FRI Score', data.avgFriScore ?? 'N/A'],
      ['Open Risk Flags', data.openRiskFlags],
      ['Check-ins (7 days)', data.recentCheckins],
      [],
      ['Program', 'Enrollments'],
      ...data.enrollByProgram.map(p => [p.name, p.count]),
      [],
      ['FRI Zone', 'Farmers'],
      ...data.zoneDistribution.map(z => [z.name, z.value]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `cropguard-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview',   label: 'Platform Overview', icon: BarChart2   },
    { key: 'weekly',     label: 'Weekly Agent Reports', icon: Calendar  },
    { key: 'generator',  label: 'Report Generator',  icon: Sparkles    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Reports</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">Platform analytics, weekly agent summaries, and AI-generated reports</p>
        </div>
        {tab === 'overview' && (
          <div className="flex items-center gap-3">
            <Select value={filterProgram || '__all__'} onValueChange={v => setFilterProgram(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => loadReport(true)} disabled={refreshing}>
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={!data}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard icon={Users}         label="Registered Farmers"  value={data.totalFarmers.toLocaleString()}    color="bg-cropguard-dark" />
              <KpiCard icon={CheckCircle}   label="Verified Farmers"    value={data.verifiedFarmers.toLocaleString()} color="bg-emerald-600"
                sub={data.totalFarmers > 0 ? `${Math.round(data.verifiedFarmers / data.totalFarmers * 100)}% of total` : undefined} />
              <KpiCard icon={Activity}      label="Active Enrollments"  value={data.activeEnrollments.toLocaleString()} color="bg-cropguard-mid" />
              <KpiCard icon={TrendingUp}    label="Avg FRI Score"       value={data.avgFriScore !== null ? data.avgFriScore : '—'} color="bg-blue-600" />
              <KpiCard icon={AlertTriangle} label="Open Risk Flags"     value={data.openRiskFlags.toLocaleString()}    color="bg-amber-500" />
              <KpiCard icon={Clock}         label="Check-ins (7 days)"  value={data.recentCheckins.toLocaleString()}   color="bg-teal-600" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Enrollment by Program">
                {data.enrollByProgram.length === 0 ? (
                  <p className="text-sm text-cropguard-slate text-center py-12">No enrollment data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.enrollByProgram} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip formatter={(v: number) => [`${v} farmers`, 'Enrolled']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.enrollByProgram.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="FRI Zone Distribution">
                {data.zoneDistribution.length === 0 ? (
                  <p className="text-sm text-cropguard-slate text-center py-12">No FRI score data yet.</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={data.zoneDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                          {data.zoneDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v, 'Farmers']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 flex-1">
                      {data.zoneDistribution.map(z => {
                        const total = data.zoneDistribution.reduce((s, d) => s + d.value, 0);
                        const pct   = total > 0 ? Math.round((z.value / total) * 100) : 0;
                        return (
                          <div key={z.name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                                <span className="font-medium">{z.name}</span>
                              </span>
                              <span className="font-semibold">{z.value}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: z.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Weekly Average FRI Score Trend">
                {data.weeklyScoreTrend.length === 0 ? (
                  <p className="text-sm text-cropguard-slate text-center py-12">No weekly data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.weeklyScoreTrend} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number, name: string) => [name === 'avg' ? `${v}/100` : v, name === 'avg' ? 'Avg FRI' : 'Farmers scored']} />
                      <Legend formatter={(v: string) => v === 'avg' ? 'Avg FRI Score' : 'Farmers scored'} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="avg" stroke="#2d6a4f" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="avg" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Agent Leaderboard (30 days)">
                {data.agentLeaderboard.length === 0 ? (
                  <p className="text-sm text-cropguard-slate text-center py-12">No agent activity data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.agentLeaderboard} margin={{ left: 0, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="farmers" name="Farmers" fill="#40916c" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="checkins" name="Check-ins" fill="#74c69d" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Risk flags */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-cropguard-forest">
                  Open Risk Flags
                  {data.openRiskFlags > 0 && (
                    <span className="ml-2 text-xs font-normal text-amber-600">{data.openRiskFlags} total</span>
                  )}
                </h3>
              </div>
              {data.riskFlags.length === 0 ? (
                <div className="text-center py-10 text-cropguard-slate">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-medium">No open risk flags</p>
                </div>
              ) : (
                <div className="divide-y">
                  {data.riskFlags.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 px-5 py-3">
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 uppercase',
                        SEVERITY_COLORS[f.severity] ?? 'bg-gray-100 text-gray-600'
                      )}>
                        {f.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cropguard-forest capitalize">
                          {f.flag_type?.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-cropguard-slate mt-0.5 line-clamp-2">{f.description}</p>
                      </div>
                      <p className="text-xs text-cropguard-slate shrink-0 mt-0.5">
                        {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-cropguard-slate">
            <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Failed to load report data.</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => loadReport()}>Retry</Button>
          </div>
        )
      )}

      {/* ── Weekly agent reports tab ── */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Auto-generated weekly summaries from agent check-in activity.</p>
            <Button size="sm" variant="outline" onClick={loadWeeklyReports} disabled={weeklyLoading}>
              <RefreshCw className={cn('w-4 h-4', weeklyLoading && 'animate-spin')} />
            </Button>
          </div>

          {weeklyLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : weeklyReports.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">No weekly check-in data yet</p>
              <p className="text-sm text-gray-400 mt-1">Weekly reports will appear here once agents submit check-ins.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyReports.map((r, i) => <WeeklyReportRow key={i} report={r} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Report generator tab ── */}
      {tab === 'generator' && (
        <div className="space-y-2">
          <div className="bg-gradient-to-r from-cropguard-forest to-cropguard-dark rounded-2xl px-6 py-5 flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-cropguard-light" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Norvi AI Report Generator</h2>
              <p className="text-sm text-cropguard-pale mt-0.5">
                Pick a report template, click generate — Norvi reads live platform data and writes a structured report instantly.
              </p>
            </div>
          </div>
          <ReportGenerator profile={profile} programs={programs} />
        </div>
      )}
    </div>
  );
}
