import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, Check, X, Loader2, Clock,
  PackageCheck, Truck, CreditCard, UserCheck, FileText,
  AlertTriangle, Users, ArrowRight, History,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Program } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkflowEntry {
  id:            string;
  enrollment_id: string;
  farmer_id:     string;
  stage:         number;
  stage_name:    string;
  status:        string;
  notes:         string | null;
  reason_code:   string | null;
  actor_role:    string | null;
  created_at:    string;
}

interface EnrollmentWithFarmer {
  id:            string;
  farmer_id:     string;
  program_id:    string;
  cohort_id:     string | null;
  status:        string;
  enrolled_at:   string;
  graduated_at:  string | null;
  withdrawn_at:  string | null;
  farmer_name:   string;
  farmer_phone:  string;
  program_name:  string;
  cohort_name:   string | null;
  current_stage: number;
  workflow:      WorkflowEntry[];
}

// One row in the list — the "primary" (active or latest) enrollment for this farmer
// plus any prior enrollments kept as history
interface FarmerRow {
  farmer_id:    string;
  farmer_name:  string;
  farmer_phone: string;
  primary:      EnrollmentWithFarmer;          // active, else most recent
  history:      EnrollmentWithFarmer[];        // all other (graduated/withdrawn)
}

const WORKFLOW_STAGES = [
  { stage: 1, name: 'Submitted',      icon: FileText,    role: 'farmer' },
  { stage: 2, name: 'Consent',        icon: UserCheck,   role: 'agent' },
  { stage: 3, name: 'Under Review',   icon: Clock,       role: 'agent' },
  { stage: 4, name: 'Credit Review',  icon: CreditCard,  role: 'credit' },
  { stage: 5, name: 'Final Approval', icon: Check,       role: 'staff' },
  { stage: 6, name: 'Active',         icon: Check,       role: 'system' },
  { stage: 7, name: 'Delivered',      icon: Truck,       role: 'agent' },
  { stage: 8, name: 'Repayment',      icon: PackageCheck, role: 'farmer' },
];

const REASON_CODES = [
  'Eligibility criteria not met',
  'Incomplete documentation',
  'Credit risk too high',
  'Capacity limit reached',
  'Program suspended',
  'Farmer withdrew',
  'Other',
];

const STATUS_COLORS: Record<string, string> = {
  approved:  'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  declined:  'bg-red-100 text-red-700',
  active:    'bg-emerald-100 text-emerald-700',
  graduated: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

// ── StageTracker ──────────────────────────────────────────────────────────────

function StageTracker({ current, workflow }: { current: number; workflow: WorkflowEntry[] }) {
  const getStageStatus = (stage: number) => {
    const entry = workflow.find(w => w.stage === stage);
    if (!entry) return stage < current ? 'completed' : stage === current ? 'active' : 'pending';
    if (entry.status === 'declined') return 'declined';
    if (stage < current || entry.status === 'approved') return 'completed';
    if (stage === current) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {WORKFLOW_STAGES.map((s, idx) => {
        const status = getStageStatus(s.stage);
        const Icon = s.icon;
        return (
          <div key={s.stage} className="flex items-start min-w-0">
            <div className="flex flex-col items-center min-w-[72px]">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all',
                status === 'completed' && 'bg-emerald-500',
                status === 'active'    && 'bg-cropguard-dark ring-4 ring-cropguard-dark/20',
                status === 'pending'   && 'bg-gray-200',
                status === 'declined'  && 'bg-red-500',
              )}>
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : status === 'declined' ? (
                  <X className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={cn('w-3.5 h-3.5', status === 'active' ? 'text-white' : 'text-gray-400')} />
                )}
              </div>
              <p className={cn(
                'text-[9px] text-center mt-1 leading-tight max-w-[60px]',
                status === 'active' ? 'text-cropguard-dark font-semibold' : 'text-gray-400'
              )}>
                {s.name}
              </p>
            </div>
            {idx < WORKFLOW_STAGES.length - 1 && (
              <div className={cn(
                'w-6 h-0.5 mt-4 shrink-0',
                status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── EnrollmentPanel — shows one enrollment's detail + actions ─────────────────

function EnrollmentPanel({
  enr,
  onApprove,
  onDecline,
  dimmed,
}: {
  enr: EnrollmentWithFarmer;
  onApprove?: () => void;
  onDecline?: () => void;
  dimmed?: boolean;
}) {
  const canAct = enr.status === 'active' && enr.current_stage < 8;
  const endDate = enr.graduated_at ?? enr.withdrawn_at;

  return (
    <div className={cn('space-y-4', dimmed && 'opacity-70')}>
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4 text-xs">
        <div>
          <span className="text-gray-400">Program</span>
          <p className="font-medium text-cropguard-forest mt-0.5">{enr.program_name}</p>
        </div>
        <div>
          <span className="text-gray-400">Cohort</span>
          <p className="font-medium text-cropguard-forest mt-0.5">{enr.cohort_name ?? '—'}</p>
        </div>
        <div>
          <span className="text-gray-400">Status</span>
          <p className="font-medium mt-0.5">
            <Badge className={cn('text-[9px] border-0', STATUS_COLORS[enr.status] ?? 'bg-gray-100 text-gray-500')}>
              {enr.status}
            </Badge>
          </p>
        </div>
        <div>
          <span className="text-gray-400">{enr.graduated_at ? 'Graduated' : enr.withdrawn_at ? 'Withdrawn' : 'Enrolled'}</span>
          <p className="font-medium text-cropguard-forest mt-0.5">
            {endDate
              ? new Date(endDate).toLocaleDateString('en-GB')
              : new Date(enr.enrolled_at).toLocaleDateString('en-GB')}
          </p>
        </div>
      </div>

      {/* Stage tracker */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Workflow Progress</p>
        <StageTracker current={enr.current_stage} workflow={enr.workflow} />
      </div>

      {/* Activity log */}
      {enr.workflow.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity Log</p>
          <div className="space-y-2">
            {[...enr.workflow].reverse().map(w => (
              <div key={w.id} className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-2.5',
                w.status === 'declined' ? 'bg-red-50' : w.status === 'approved' ? 'bg-emerald-50' : 'bg-gray-50'
              )}>
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  w.status === 'declined' ? 'bg-red-500' : w.status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-cropguard-forest">Stage {w.stage}: {w.stage_name}</p>
                  {w.reason_code && <p className="text-xs text-red-600 mt-0.5">Reason: {w.reason_code}</p>}
                  {w.notes && <p className="text-xs text-gray-600 mt-0.5">{w.notes}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(w.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canAct && onApprove && onDecline && (
        <div className="flex gap-3 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={onDecline}
          >
            <X className="w-4 h-4 mr-2" /> Decline
          </Button>
          <Button
            className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
            onClick={onApprove}
          >
            <ArrowRight className="w-4 h-4 mr-2" /> Advance to Stage {enr.current_stage + 1}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EnrollmentWorkflowPage() {
  const profile = useAuthStore(s => s.profile);

  const [allEnrollments, setAllEnrollments] = useState<EnrollmentWithFarmer[]>([]);
  const [programs, setPrograms]             = useState<Program[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filterProgram, setFilterProgram]   = useState('__none__');
  const [filterStage, setFilterStage]       = useState('__none__');
  const [filterStatus, setFilterStatus]     = useState('__none__');

  const [selectedRow, setSelectedRow]       = useState<FarmerRow | null>(null);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [activeEnr, setActiveEnr]           = useState<EnrollmentWithFarmer | null>(null);

  const [actionOpen, setActionOpen]         = useState(false);
  const [actionType, setActionType]         = useState<'approve' | 'decline'>('approve');
  const [actionReason, setActionReason]     = useState('__none__');
  const [actionNote, setActionNote]         = useState('');
  const [actionSaving, setActionSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: enrData } = await supabase
      .from('enrollments')
      .select('*, programs(name), cohorts(name), farmers(full_name, phone)')
      .order('enrolled_at', { ascending: false })
      .limit(500);

    const ids = (enrData ?? []).map((e: any) => e.id);
    let workflowMap: Record<string, WorkflowEntry[]> = {};
    if (ids.length > 0) {
      const { data: wfData } = await supabase
        .from('enrollment_workflow')
        .select('*')
        .in('enrollment_id', ids)
        .order('stage', { ascending: true });
      (wfData ?? []).forEach((w: WorkflowEntry) => {
        workflowMap[w.enrollment_id] = workflowMap[w.enrollment_id] ?? [];
        workflowMap[w.enrollment_id].push(w);
      });
    }

    const list: EnrollmentWithFarmer[] = (enrData ?? []).map((e: any) => {
      const wf = workflowMap[e.id] ?? [];
      const maxStage = wf.reduce((m, w) => Math.max(m, w.stage), 1);
      return {
        id:            e.id,
        farmer_id:     e.farmer_id,
        program_id:    e.program_id,
        cohort_id:     e.cohort_id,
        status:        e.status,
        enrolled_at:   e.enrolled_at,
        graduated_at:  e.graduated_at ?? null,
        withdrawn_at:  e.withdrawn_at ?? null,
        farmer_name:   e.farmers?.full_name ?? 'Unknown',
        farmer_phone:  e.farmers?.phone ?? '',
        program_name:  e.programs?.name ?? '',
        cohort_name:   e.cohorts?.name ?? null,
        current_stage: maxStage,
        workflow:      wf,
      };
    });

    setAllEnrollments(list);
    setLoading(false);
  }, [profile]);

  const loadPrograms = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('programs')
      .select('id,name')
      .eq('organisation_id', profile.organisation_id);
    setPrograms(data ?? []);
  }, [profile]);

  useEffect(() => { load(); loadPrograms(); }, [load, loadPrograms]);

  // Group all enrollments by farmer — one row per unique farmer
  const farmerRows: FarmerRow[] = (() => {
    const map = new Map<string, EnrollmentWithFarmer[]>();
    allEnrollments.forEach(e => {
      const arr = map.get(e.farmer_id) ?? [];
      arr.push(e);
      map.set(e.farmer_id, arr);
    });

    const rows: FarmerRow[] = [];
    map.forEach((enrs, farmer_id) => {
      // Prefer active, else pick most recently enrolled
      const primary = enrs.find(e => e.status === 'active')
        ?? enrs.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())[0];
      const history = enrs.filter(e => e.id !== primary.id)
        .sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());
      rows.push({ farmer_id, farmer_name: primary.farmer_name, farmer_phone: primary.farmer_phone, primary, history });
    });

    return rows.sort((a, b) => new Date(b.primary.enrolled_at).getTime() - new Date(a.primary.enrolled_at).getTime());
  })();

  // Apply filters against the primary enrollment
  const visibleRows = farmerRows.filter(row => {
    const e = row.primary;
    if (filterProgram !== '__none__' && e.program_id !== filterProgram) return false;
    if (filterStage   !== '__none__' && String(e.current_stage) !== filterStage) return false;
    if (filterStatus  !== '__none__' && e.status !== filterStatus) return false;
    return true;
  });

  const stageStats = WORKFLOW_STAGES.map(s => ({
    ...s,
    count: farmerRows.filter(r => r.primary.current_stage === s.stage).length,
  }));

  const openAction = (type: 'approve' | 'decline') => {
    setActionType(type);
    setActionReason('__none__');
    setActionNote('');
    setActionOpen(true);
  };

  const handleAction = async () => {
    if (!activeEnr) return;
    if (actionType === 'decline' && actionReason === '__none__') return;
    setActionSaving(true);

    const nextStage = actionType === 'approve' ? activeEnr.current_stage + 1 : activeEnr.current_stage;
    const stageName = WORKFLOW_STAGES.find(s => s.stage === nextStage)?.name ?? 'Unknown';

    await supabase.from('enrollment_workflow').insert({
      enrollment_id: activeEnr.id,
      farmer_id:     activeEnr.farmer_id,
      stage:         nextStage,
      stage_name:    stageName,
      status:        actionType === 'approve' ? 'approved' : 'declined',
      actor_id:      profile!.id,
      actor_role:    profile!.role,
      reason_code:   actionType === 'decline' ? (actionReason === '__none__' ? null : actionReason) : null,
      notes:         actionNote || null,
    });

    if (actionType === 'decline') {
      await supabase.from('enrollments').update({ status: 'withdrawn' }).eq('id', activeEnr.id);
    } else if (nextStage >= 6) {
      await supabase.from('enrollments').update({ status: 'active' }).eq('id', activeEnr.id);
    }

    setActionSaving(false);
    setActionOpen(false);
    setDetailOpen(false);
    load();
  };

  const openDetail = (row: FarmerRow) => {
    setSelectedRow(row);
    setActiveEnr(row.primary);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cropguard-forest">Enrollment Workflow</h1>
        <p className="text-sm text-cropguard-slate mt-0.5">
          {farmerRows.length} farmer{farmerRows.length !== 1 ? 's' : ''} enrolled
          {allEnrollments.length > farmerRows.length && (
            <span className="ml-1 text-gray-400">· {allEnrollments.length} total enrollment records</span>
          )}
        </p>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {stageStats.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.stage}
              onClick={() => setFilterStage(f => f === String(s.stage) ? '__none__' : String(s.stage))}
              className={cn(
                'bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow-md transition-all',
                filterStage === String(s.stage) && 'border-cropguard-dark ring-2 ring-cropguard-dark/10'
              )}
            >
              <Icon className="w-4 h-4 text-cropguard-mid mx-auto mb-1" />
              <p className="text-lg font-bold text-cropguard-dark">{s.count}</p>
              <p className="text-[9px] text-gray-400 leading-tight">{s.name}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All programs</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
          </SelectContent>
        </Select>
        {(filterProgram !== '__none__' || filterStage !== '__none__' || filterStatus !== '__none__') && (
          <button
            className="text-xs text-cropguard-slate hover:text-cropguard-dark flex items-center gap-1"
            onClick={() => { setFilterProgram('__none__'); setFilterStage('__none__'); setFilterStatus('__none__'); }}
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Enrollment list — one row per farmer */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : visibleRows.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-cropguard-forest">No enrollments found</p>
          <p className="text-sm mt-1">Enroll farmers from the Farmers page to see workflow here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="divide-y">
            {visibleRows.map(row => {
              const enr = row.primary;
              const currentStageDef = WORKFLOW_STAGES.find(s => s.stage === enr.current_stage);
              const StageIcon = currentStageDef?.icon ?? Clock;
              return (
                <div
                  key={row.farmer_id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openDetail(row)}
                >
                  <div className="w-9 h-9 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
                    <span className="text-cropguard-dark font-bold text-sm">{enr.farmer_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-cropguard-forest text-sm">{enr.farmer_name}</p>
                      <Badge className={cn('text-[9px] border-0', STATUS_COLORS[enr.status] ?? 'bg-gray-100 text-gray-500')}>
                        {enr.status}
                      </Badge>
                      {row.history.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          <History className="w-2.5 h-2.5" />
                          {row.history.length} prior
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cropguard-slate">
                      {enr.program_name}{enr.cohort_name ? ` · ${enr.cohort_name}` : ''}
                    </p>
                    <p className="text-xs text-cropguard-mid mt-0.5">{enr.farmer_phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-cropguard-dark">
                      <StageIcon className="w-3.5 h-3.5" />
                      <span className="font-medium">{currentStageDef?.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Stage {enr.current_stage} of 8</p>
                    <div className="flex gap-0.5 mt-1">
                      {WORKFLOW_STAGES.map(s => (
                        <div key={s.stage} className={cn(
                          'w-3 h-1 rounded-full',
                          s.stage < enr.current_stage  ? 'bg-emerald-400' :
                          s.stage === enr.current_stage ? 'bg-cropguard-dark' : 'bg-gray-200'
                        )} />
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedRow ? selectedRow.farmer_name : 'Farmer Enrollment'}
        subtitle={selectedRow?.farmer_phone}
        width="max-w-2xl"
      >
        {selectedRow && (
          <div className="space-y-6 pt-2">
            {/* Current / active enrollment */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Current Enrollment
                </p>
                {selectedRow.history.length > 0 && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {selectedRow.history.length} prior program{selectedRow.history.length !== 1 ? 's' : ''} below
                  </span>
                )}
              </div>
              <EnrollmentPanel
                enr={selectedRow.primary}
                onApprove={() => { setActiveEnr(selectedRow.primary); openAction('approve'); }}
                onDecline={() => { setActiveEnr(selectedRow.primary); openAction('decline'); }}
              />
            </div>

            {/* Program history */}
            {selectedRow.history.length > 0 && (
              <div className="border-t pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-cropguard-mid" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Program History
                  </p>
                </div>
                <div className="space-y-5">
                  {selectedRow.history.map((enr, idx) => (
                    <div key={enr.id} className={cn(idx < selectedRow.history.length - 1 && 'border-b pb-5')}>
                      <EnrollmentPanel enr={enr} dimmed />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Action Drawer */}
      <Drawer
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={actionType === 'approve' ? 'Advance Stage' : 'Decline Enrollment'}
        width="max-w-sm"
      >
        <div className="space-y-4 pt-2">
          {actionType === 'decline' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Reason Code *
              </Label>
              <Select value={actionReason} onValueChange={setActionReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {REASON_CODES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Notes (optional)
            </Label>
            <textarea
              className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-cropguard-dark"
              rows={3}
              placeholder="Add a note..."
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setActionOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={actionSaving || (actionType === 'decline' && actionReason === '__none__')}
              className={cn('flex-1', actionType === 'decline'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-cropguard-dark hover:bg-cropguard-forest'
              )}
              onClick={handleAction}
            >
              {actionSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : actionType === 'approve' ? 'Confirm Advance' : 'Confirm Decline'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Warning when no action available */}
      {selectedRow && detailOpen && !actionOpen && selectedRow.primary.status !== 'active' && (
        <></>
      )}
    </div>
  );
}
