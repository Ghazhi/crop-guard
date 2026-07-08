'use client'

import { useState } from 'react'
import {
  FileText,
  Download,
  BarChart2,
  TrendingUp,
  Users,
  Calendar,
  Filter,
} from 'lucide-react'

type ReportCard = {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  lastGenerated: string
}

type RecentReport = {
  id: string
  name: string
  generatedDate: string
  format: 'PDF' | 'Excel'
}

const reportCards: ReportCard[] = [
  {
    id: 'season-summary',
    icon: <BarChart2 className="h-5 w-5" />,
    title: 'Season Summary',
    description: 'Overall program metrics and KPI snapshot for the season.',
    lastGenerated: '2026-07-01',
  },
  {
    id: 'fri-progress',
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'FRI Progress Report',
    description: 'Pillar scores, trends, and farmer-level FRI breakdown.',
    lastGenerated: '2026-06-28',
  },
  {
    id: 'cohort-performance',
    icon: <Users className="h-5 w-5" />,
    title: 'Cohort Performance',
    description: 'Per-cohort completion rates and FRI data comparison.',
    lastGenerated: '2026-06-25',
  },
  {
    id: 'agent-activity',
    icon: <Calendar className="h-5 w-5" />,
    title: 'Agent Activity',
    description: 'Field visits, check-in facilitation summary per agent.',
    lastGenerated: '2026-07-03',
  },
  {
    id: 'partner-exposure',
    icon: <FileText className="h-5 w-5" />,
    title: 'Partner Exposure',
    description: 'Linked farmer performance metrics per partner organisation.',
    lastGenerated: '2026-06-20',
  },
  {
    id: 'intervention-impact',
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Intervention Impact',
    description: 'Pre/post FRI scores for intervention beneficiaries.',
    lastGenerated: '2026-06-15',
  },
]

const initialRecentReports: RecentReport[] = [
  { id: '1', name: 'Season Summary', generatedDate: '2026-07-01', format: 'PDF' },
  { id: '2', name: 'Agent Activity', generatedDate: '2026-07-03', format: 'Excel' },
  { id: '3', name: 'FRI Progress Report', generatedDate: '2026-06-28', format: 'PDF' },
  { id: '4', name: 'Cohort Performance', generatedDate: '2026-06-25', format: 'Excel' },
  { id: '5', name: 'Partner Exposure', generatedDate: '2026-06-20', format: 'PDF' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function Main() {
  const [fromDate, setFromDate] = useState('2026-01-01')
  const [toDate, setToDate] = useState('2026-07-08')
  const [appliedRange, setAppliedRange] = useState({ from: '2026-01-01', to: '2026-07-08' })
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [recentReports, setRecentReports] = useState<RecentReport[]>(initialRecentReports)

  function handleApply() {
    setAppliedRange({ from: fromDate, to: toDate })
  }

  function handleGenerate(card: ReportCard) {
    setGeneratingId(card.id)
    setTimeout(() => {
      setGeneratingId(null)
      const newReport: RecentReport = {
        id: Date.now().toString(),
        name: card.title,
        generatedDate: new Date().toISOString().split('T')[0],
        format: 'PDF',
      }
      setRecentReports((prev) => [newReport, ...prev])
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and export program reports
        </p>
      </div>

      {/* Date range selector */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <Filter className="h-4 w-4 text-muted-foreground self-end mb-2" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleApply}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        <span className="self-end mb-2 text-xs text-muted-foreground">
          Applied: {formatDate(appliedRange.from)} — {formatDate(appliedRange.to)}
        </span>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((card) => {
          const isGenerating = generatingId === card.id
          return (
            <div
              key={card.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2 text-primary">
                {card.icon}
                <h2 className="font-semibold text-sm">{card.title}</h2>
              </div>
              <p className="text-xs text-muted-foreground flex-1">{card.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Last: {formatDate(card.lastGenerated)}
                </span>
                <button
                  onClick={() => handleGenerate(card)}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Reports table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Recent Reports</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Report Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Generated Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Format
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Download
                </th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report, idx) => (
                <tr
                  key={report.id}
                  className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                >
                  <td className="px-4 py-3 font-medium">{report.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(report.generatedDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.format === 'PDF'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {report.format}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                      title={`Download ${report.name}`}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
