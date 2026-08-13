'use client'

import { useMemo, useState } from 'react'
import { Users, Pause, Play } from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { usePersistedState } from '@/lib/usePersistedState'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { PROGRAM_LIST } from '../../_logics/advisoryConfig'

function StepPill({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors relative ${
        active ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
      style={active ? { backgroundColor: 'var(--brand-forest)' } : {}}
    >
      {children}
    </button>
  )
}

export function AdvisoryOverrideSection() {
  const [pausedIds, setPausedIds] = usePersistedState<string[]>('advisory-paused-farmers', [])
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null)

  const pausedSet = useMemo(() => new Set(pausedIds), [pausedIds])

  // only show programs that actually have enrolled farmers
  const programsWithFarmers = PROGRAM_LIST.filter(p =>
    FARMERS_LIST.some(f => f.enrollment?.programId === p.id)
  )

  const selectedProgram = programsWithFarmers.find(p => p.id === selectedProgramId) ?? null
  const cohortsForProgram = selectedProgram
    ? selectedProgram.cohorts.filter(c => FARMERS_LIST.some(f => f.enrollment?.cohortId === c.id))
    : []

  function cohortHasPausedFarmer(cohortId: string) {
    return FARMERS_LIST.some(f => f.enrollment?.cohortId === cohortId && pausedSet.has(f.id))
  }

  const cohortFarmers = selectedCohortId
    ? FARMERS_LIST.filter(f => f.enrollment?.cohortId === selectedCohortId)
    : []

  function selectProgram(id: string) {
    setSelectedProgramId(id)
    setSelectedCohortId(null)
  }

  function toggleFarmerPause(farmerId: string) {
    setPausedIds(prev => prev.includes(farmerId) ? prev.filter(id => id !== farmerId) : [...prev, farmerId])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Users className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        <div>
          <h3 className="text-sm font-bold text-gray-900">Advisory Override</h3>
          <p className="text-xs text-gray-400">Pause advisories for specific farmers within a cohort</p>
        </div>
      </div>

      {/* Step 1 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">1. Select Program</p>
        {programsWithFarmers.length === 0 ? (
          <p className="text-sm text-gray-400">No programs with enrolled farmers.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {programsWithFarmers.map(p => (
              <StepPill key={p.id} active={selectedProgramId === p.id} onClick={() => selectProgram(p.id)}>
                {p.name}
              </StepPill>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 */}
      {selectedProgram && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">2. Select Cohort</p>
          {cohortsForProgram.length === 0 ? (
            <p className="text-sm text-gray-400">No cohorts with enrolled farmers in this program.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {cohortsForProgram.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCohortId(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors relative ${
                    selectedCohortId === c.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={selectedCohortId === c.id ? { backgroundColor: 'var(--brand-forest)' } : {}}
                >
                  {c.name}
                  {cohortHasPausedFarmer(c.id) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {selectedProgram && selectedCohortId && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">3. Farmers</p>
          {cohortFarmers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-2">
              <Users className="w-7 h-7 text-gray-200" />
              <p className="text-sm text-gray-400">No farmers in this cohort.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {cohortFarmers.map(f => {
                const paused = pausedSet.has(f.id)
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <PersonAvatar name={f.fullName} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{f.fullName}</p>
                        {paused && <BadgeTemplate label="Paused" variant="danger" size="sm" />}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{f.community || 'No community'} · {f.phone}</p>
                    </div>
                    <ButtonTemplate
                      variant={paused ? 'secondary' : 'outline'}
                      size="sm"
                      label={paused ? 'Resume' : 'Pause'}
                      leftIcon={paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      className={paused ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 border-red-200 hover:bg-red-50'}
                      onClick={() => toggleFarmerPause(f.id)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
