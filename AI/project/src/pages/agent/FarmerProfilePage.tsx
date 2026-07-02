import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Star, ClipboardCheck, ShieldCheck,
  Wrench, Calendar, Phone, MapPin, Leaf, CheckCircle, Clock,
  Brain, Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Farmer, Intervention } from '@/types';
import { CROP_LABELS, REGION_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/* ── helpers ─────────────────────────────────────────────── */
function zoneLabel(score: number | null) {
  if (score === null) return 'Not Assessed';
  if (score >= 80) return 'Leader';
  if (score >= 60) return 'Builder';
  if (score >= 40) return 'Learner';
  return 'Starter';
}
function zoneColor(score: number | null) {
  if (score === null) return '#9CA3AF';
  if (score >= 80) return '#1A3D2B';
  if (score >= 60) return '#3D7A56';
  if (score >= 40) return '#E8963A';
  return '#D94F3D';
}

/* ── FRI mini arc ────────────────────────────────────────── */
function FRIMiniArc({ score }: { score: number | null }) {
  const r = 32, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  const filled = score !== null ? (score / 100) * circ * 0.75 : 0;
  const color = zoneColor(score);
  return (
    <svg width="80" height="60" viewBox="0 0 80 60">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth="6"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${circ - filled + circ * 0.25}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      <text x={cx} y={cx - 2} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1A3D2B">
        {score ?? '–'}
      </text>
      <text x={cx} y={cx + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#4A5568">
        {zoneLabel(score)}
      </text>
    </svg>
  );
}

/* ── PillarBar ─────────────────────────────────────────── */
function PillarBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className="text-[10px] font-bold text-gray-700">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className="h-full rounded-full" style={{ width: `${(score / max) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ── tab types ───────────────────────────────────────────── */
type TabKey = 'profile' | 'score' | 'checkins' | 'verify' | 'interventions' | 'visits';

interface TabDef { key: TabKey; label: string; icon: React.ElementType }
const TABS: TabDef[] = [
  { key: 'profile',       label: 'Profile',       icon: User         },
  { key: 'score',         label: 'FRI Score',     icon: Star         },
  { key: 'checkins',      label: 'Check-ins',     icon: ClipboardCheck },
  { key: 'verify',        label: 'Verify',        icon: ShieldCheck  },
  { key: 'interventions', label: 'Interventions', icon: Wrench       },
  { key: 'visits',        label: 'Visits',        icon: Calendar     },
];

/* ── FRI row type ────────────────────────────────────────── */
interface FRIRow {
  week_number: number;
  total_score: number;
  p1_score: number;
  p2_score: number;
  p3_score: number;
  p4_score: number;
  is_provisional: boolean;
}

/* ── checkin row type ────────────────────────────────────── */
interface CheckinRow {
  id: string;
  week_number: number;
  created_at: string;
  verified_at: string | null;
  help_requested: boolean;
  challenge_notes: string | null;
}

/* ── ─────────────────────────────────────────────────────── */

function ProfileTab({ farmer }: { farmer: Farmer }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Personal</p>
        <Row icon={User}    label="Full Name"     value={farmer.full_name} />
        <Row icon={Phone}   label="Phone"         value={farmer.phone} />
        <Row icon={MapPin}  label="Community"     value={`${farmer.community}, ${REGION_LABELS[farmer.region_code]}`} />
        <Row icon={MapPin}  label="District"      value={farmer.district} />
        <Row icon={Leaf}    label="Primary Crop"  value={CROP_LABELS[farmer.primary_crop]} />
        <Row icon={Star}    label="Farm Size"     value={`${farmer.total_farm_size_ha} ha`} />
        <Row icon={CheckCircle} label="Verified"  value={farmer.is_verified ? 'Yes' : 'Pending'} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">IDs</p>
        <Row icon={User} label="National ID"  value={farmer.national_id} />
        {farmer.gps_address && <Row icon={MapPin} label="GPS Address" value={farmer.gps_address} />}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-gray-700 font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

function ScoreTab({ farmerId }: { farmerId: string }) {
  const [rows, setRows] = useState<FRIRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('farmer_fri_scores')
      .select('week_number, total_score, p1_score, p2_score, p3_score, p4_score, is_provisional')
      .eq('farmer_id', farmerId)
      .order('week_number', { ascending: false })
      .limit(12)
      .then(({ data }) => { setRows((data as FRIRow[]) ?? []); setLoading(false); });
  }, [farmerId]);

  if (loading) return <div className="h-40 bg-gray-100 animate-pulse rounded-xl" />;
  if (!rows.length) return <p className="text-sm text-gray-400 text-center py-10">No FRI scores yet.</p>;

  const latest = rows[0];
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <FRIMiniArc score={latest.total_score} />
        <div className="flex-1 space-y-2">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
            latest.is_provisional ? 'bg-amber-100 text-amber-700' : 'bg-cropguard-mint text-cropguard-dark')}>
            {latest.is_provisional ? 'Provisional' : 'Verified'}
          </span>
          <p className="text-[10px] text-gray-400">Week {latest.week_number}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pillar Breakdown</p>
        <PillarBar label="P1 Agronomy"   score={latest.p1_score} max={30} color="#1A3D2B" />
        <PillarBar label="P2 CSA"         score={latest.p2_score} max={30} color="#3D7A56" />
        <PillarBar label="P3 Advisory"   score={latest.p3_score} max={20} color="#E8963A" />
        <PillarBar label="P4 Discipline" score={latest.p4_score} max={20} color="#2563EB" />
      </div>
      <div className="space-y-1.5">
        {rows.slice(0, 8).map(r => (
          <div key={r.week_number} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: zoneColor(r.total_score) }}
            >
              {r.is_provisional ? 'P' : 'V'}
            </div>
            <span className="text-xs text-gray-600 flex-1">Week {r.week_number}</span>
            <span className="text-xs font-bold text-cropguard-dark">{r.total_score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckinsTab({ farmerId }: { farmerId: string }) {
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('farmer_checkins')
      .select('id, week_number, created_at, verified_at, help_requested, challenge_notes')
      .eq('farmer_id', farmerId)
      .order('week_number', { ascending: false })
      .limit(20)
      .then(({ data }) => { setRows((data as CheckinRow[]) ?? []); setLoading(false); });
  }, [farmerId]);

  if (loading) return <div className="h-40 bg-gray-100 animate-pulse rounded-xl" />;
  if (!rows.length) return <p className="text-sm text-gray-400 text-center py-10">No check-ins yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map(ci => (
        <div key={ci.id} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-cropguard-forest">Week {ci.week_number}</p>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
              ci.verified_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
              {ci.verified_at ? 'Verified' : 'Pending'}
            </span>
          </div>
          <p className="text-[10px] text-gray-400">{new Date(ci.created_at).toLocaleDateString()}</p>
          {ci.help_requested && (
            <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
              <Phone className="w-3 h-3" /> Help requested
            </div>
          )}
          {ci.challenge_notes && (
            <p className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">{ci.challenge_notes}</p>
          )}
          {!ci.verified_at && (
            <Link
              to={`/agent/verify/${ci.id}`}
              className="block text-center text-[10px] font-bold text-white bg-cropguard-dark rounded-lg py-1.5 mt-1"
            >
              Verify Now
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

function VerifyTab({ farmerId }: { farmerId: string }) {
  const [pendingIds, setPendingIds] = useState<{ id: string; weekNumber: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('farmer_checkins')
      .select('id, week_number')
      .eq('farmer_id', farmerId)
      .is('verified_at', null)
      .order('week_number', { ascending: true })
      .then(({ data }) => {
        setPendingIds(data?.map(d => ({ id: d.id, weekNumber: d.week_number })) ?? []);
        setLoading(false);
      });
  }, [farmerId]);

  if (loading) return <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />;
  if (!pendingIds.length) return (
    <div className="text-center py-10">
      <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">All check-ins verified</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {pendingIds.map(({ id, weekNumber }) => (
        <Link key={id} to={`/agent/verify/${id}`}
          className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3.5 active:scale-[0.98] transition-transform">
          <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-orange-800">Week {weekNumber} check-in</p>
            <p className="text-[10px] text-orange-600">Tap to verify activities</p>
          </div>
          <ArrowLeft className="w-4 h-4 text-orange-500 rotate-180 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

function InterventionsTab({ farmerId }: { farmerId: string }) {
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('interventions')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems((data as Intervention[]) ?? []); setLoading(false); });
  }, [farmerId]);

  if (loading) return <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />;
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-10">No interventions logged.</p>;

  const TYPE_LABELS: Record<string, string> = {
    field_advisory: 'Field Advisory',
    input_distribution: 'Input Distribution',
    training: 'Training',
    credit_facilitation: 'Credit Facilitation',
    other: 'Other',
  };

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-cropguard-forest">{TYPE_LABELS[item.type] ?? item.type}</p>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
              item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
              {item.status}
            </span>
          </div>
          <p className="text-[10px] text-gray-600">{item.description}</p>
          {item.scheduled_at && (
            <p className="text-[9px] text-gray-400">
              {new Date(item.scheduled_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function VisitsTab({ farmerId }: { farmerId: string }) {
  const [items, setItems] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('interventions')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('type', 'field_advisory')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems((data as Intervention[]) ?? []); setLoading(false); });
  }, [farmerId]);

  if (loading) return <div className="h-20 bg-gray-100 animate-pulse rounded-xl" />;
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-10">No visits recorded.</p>;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cropguard-mid" />
              <p className="text-xs font-semibold text-cropguard-forest">
                {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Scheduled'}
              </p>
            </div>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
              item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
              {item.status}
            </span>
          </div>
          {item.outcome && <p className="text-[10px] text-gray-600">{item.outcome}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function FarmerProfilePage() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate     = useNavigate();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  useEffect(() => {
    if (!farmerId) return;
    supabase.from('farmers').select('*').eq('id', farmerId).maybeSingle()
      .then(({ data }) => { setFarmer(data as Farmer | null); setLoading(false); });
  }, [farmerId]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="p-4 text-center py-16">
        <p className="text-sm text-gray-400">Farmer not found.</p>
        <Link to="/agent/farmers" className="text-xs text-cropguard-mid mt-2 block">Back to Farmers</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <Link to="/agent/farmers" className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h2 className="text-base font-bold text-cropguard-forest truncate flex-1">{farmer.full_name}</h2>
        </div>

        {/* Farmer identity strip */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0">
            {farmer.photo_url ? (
              <img src={farmer.photo_url} alt={farmer.full_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <span className="text-cropguard-dark font-bold text-lg">{farmer.full_name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-cropguard-forest">{farmer.full_name}</p>
            <p className="text-[10px] text-gray-400">{farmer.phone} · {farmer.community}</p>
            <p className="text-[10px] text-gray-400">{CROP_LABELS[farmer.primary_crop]}</p>
          </div>
          <FRIMiniArc score={farmer.current_fri_score} />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => navigate(`/agent/farmers/${farmerId}/baseline`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cropguard-mint text-cropguard-forest text-xs font-semibold active:scale-[0.97] transition-transform"
          >
            <Award className="w-3.5 h-3.5" /> Baseline
          </button>
          <button
            onClick={() => navigate(`/agent/norvi?farmer=${farmerId}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cropguard-forest text-white text-xs font-semibold active:scale-[0.97] transition-transform"
          >
            <Brain className="w-3.5 h-3.5" /> Norvi AI
          </button>
        </div>

        {/* Tab scroll */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 snap-x no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-colors shrink-0',
                activeTab === key
                  ? 'bg-cropguard-dark text-white'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 pt-3 pb-6">
        {activeTab === 'profile'       && <ProfileTab farmer={farmer} />}
        {activeTab === 'score'         && <ScoreTab farmerId={farmer.id} />}
        {activeTab === 'checkins'      && <CheckinsTab farmerId={farmer.id} />}
        {activeTab === 'verify'        && <VerifyTab farmerId={farmer.id} />}
        {activeTab === 'interventions' && <InterventionsTab farmerId={farmer.id} />}
        {activeTab === 'visits'        && <VisitsTab farmerId={farmer.id} />}
      </div>
    </div>
  );
}
