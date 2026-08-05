import { useEffect, useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Leaf, User, BookOpen, Loader2, GraduationCap, Video } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { SpeakButton } from '@/components/SpeakButton';
import { FarmerWeeklyMaterials, FarmerTrainingSessions } from '@/components/TrainingDisplay';

/* ── Norvi Q&A data ──────────────────────────────────────── */
interface FAQ { q: string; a: string; }
const FAQS: FAQ[] = [
  {
    q: 'How is my FRI score calculated?',
    a: 'Your Farm Risk Index is calculated across four pillars: Agronomy (30 pts), CSA practices (30 pts), Advisory engagement (20 pts), and Programme Discipline (20 pts). Each week you complete a check-in, your activities are scored Yes (full points), Partial (50%), or No (0 points). Your agent then verifies the score to convert it from Provisional to Verified.',
  },
  {
    q: 'What happens if I miss a weekly check-in?',
    a: 'Missing a check-in reduces your P4 Discipline score. You can still submit a late check-in for the current week until Friday midnight. After that, the week is locked. Consistent check-ins are the single most reliable way to maintain and grow your FRI score.',
  },
  {
    q: 'How do I move from the Learner zone to Builder?',
    a: 'To reach Builder (60 pts), focus on completing all Agronomy activities each week and applying at least one CSA technique. Recording soil moisture readings and attending agent advisory sessions are quick wins. Consistent reporting for 3–4 weeks should move you up.',
  },
  {
    q: 'Can I get insurance before my score is verified?',
    a: 'Crop Insurance requires a Verified score of 60 or above. Your agent must complete a farm visit and verify your check-in responses before the score converts from Provisional to Verified. Contact your assigned agent to schedule a visit.',
  },
  {
    q: 'What is the market linkage programme?',
    a: 'The Market Linkage programme connects qualifying farmers (FRI ≥ 70) directly with premium buyers who pay above-market prices for certified produce. Once eligible, your agent will share contract details and quantity commitments for the upcoming harvest.',
  },
];

/* ── Norvi accordion ─────────────────────────────────────── */
function NorviAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 pb-3 border-b border-gray-50">
        <div className="w-7 h-7 bg-cropguard-dark rounded-lg flex items-center justify-center shrink-0">
          <Leaf className="w-3.5 h-3.5 text-cropguard-light" />
        </div>
        <div>
          <p className="text-xs font-bold text-cropguard-dark uppercase tracking-wider">Norvi AI</p>
          <p className="text-[10px] text-cropguard-slate">Common questions answered</p>
        </div>
      </div>
      {FAQS.map((faq, i) => (
        <div key={i} className={cn('border-b border-gray-50 last:border-0')}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left"
          >
            <span className="text-xs font-semibold text-cropguard-forest flex-1 leading-snug">{faq.q}</span>
            {open === i
              ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
          </button>
          {open === i && (
            <div className="px-4 pb-4 -mt-1">
              <div className="bg-cropguard-mint/40 rounded-xl p-3 flex gap-2 items-start">
                <p className="text-xs text-gray-600 leading-relaxed flex-1">{faq.a}</p>
                <SpeakButton text={faq.a} className="shrink-0 mt-0.5" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── agent messages ──────────────────────────────────────── */
interface AgentMessage {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
}

function AgentThread({ farmerCrop }: { farmerCrop: string | null }) {
  const [msgs, setMsgs] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = (supabase.from('advisory_notes') as any)
      .select('id, title, body, created_at, author_id')
      .order('created_at', { ascending: false })
      .limit(20);
    if (farmerCrop) {
      query = query.or(`crop_type.is.null,crop_type.eq.${farmerCrop}`);
    }
    query.then(({ data }: any) => {
      if (data) {
        setMsgs((data as AgentMessage[]).map((m: any) => ({
          ...m,
          sender_name: 'Agent',
          body: m.title ? `${m.title}: ${m.body}` : m.body,
        })));
      }
      setLoading(false);
    });
  }, [farmerCrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (msgs.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">No messages from your agent yet.</p>
        <p className="text-[10px] text-gray-300 mt-0.5">Your agent's notes and advice will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {msgs.map(msg => (
        <div key={msg.id} className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-cropguard-mid flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-cropguard-dark">{msg.sender_name}</span>
              <span className="text-[9px] text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span>
            </div>
            <div className="bg-gray-50 rounded-xl rounded-tl-none p-3 flex gap-2 items-start">
              <p className="text-xs text-gray-700 leading-relaxed flex-1">{msg.body}</p>
              <SpeakButton text={msg.body} className="shrink-0 mt-0.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── advisory notes feed (live from DB) ───────────────────── */
interface AdvisoryNote {
  id: string;
  title: string | null;
  body: string;
  crop_type: string | null;
  created_at: string;
}

function AdvisoryNotesFeed({ farmerCrop }: { farmerCrop: string | null }) {
  const [notes, setNotes] = useState<AdvisoryNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = (supabase.from('advisory_notes') as any)
      .select('id, title, body, crop_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (farmerCrop) {
      query = query.or(`crop_type.is.null,crop_type.eq.${farmerCrop}`);
    }

    query.then(({ data }: any) => {
      setNotes((data as AdvisoryNote[]) ?? []);
      setLoading(false);
    });
  }, [farmerCrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-xs text-gray-400">No advisory notes yet.</p>
        <p className="text-[10px] text-gray-300 mt-0.5">Your agronomist's guidance will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-cropguard-mid" />
        <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Advisory Notes</p>
      </div>
      <div className="space-y-2">
        {notes.map(note => (
          <div key={note.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cropguard-mint">
              <Leaf className="w-4 h-4 text-cropguard-dark" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-cropguard-forest">{note.title ?? 'Advisory Note'}</p>
                <span className="text-[9px] text-gray-400 shrink-0">{new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-start gap-2 mt-0.5">
                <p className="text-[10px] text-gray-600 leading-relaxed flex-1">{note.body}</p>
                <SpeakButton text={`${note.title ?? ''}. ${note.body}`} className="shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── main page ───────────────────────────────────────────── */
export default function HelpPage() {
  const profile = useAuthStore(s => s.profile);
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'norvi' | 'messages' | 'notes' | 'training'>('norvi');

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers').select('id, primary_crop').eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (f) {
          setFarmerId((f as any).id ?? null);
          setFarmerCrop((f as any).primary_crop ?? null);
        }
      });
  }, [profile]);

  const sections = [
    { key: 'norvi',    label: 'Norvi AI' },
    { key: 'messages', label: 'Agent'    },
    { key: 'notes',    label: 'Notes'    },
    { key: 'training', label: 'Training' },
  ] as const;

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">Advisory</h2>
        <p className="text-sm text-cropguard-slate">Support and agent messages</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1.5 rounded-lg transition-colors',
              activeSection === s.key ? 'bg-white text-cropguard-dark shadow-sm' : 'text-gray-500'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'norvi'    && <NorviAccordion />}
      {activeSection === 'messages' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide mb-3">Agent Messages</p>
          <AgentThread farmerCrop={farmerCrop} />
        </div>
      )}
      {activeSection === 'notes'    && <AdvisoryNotesFeed farmerCrop={farmerCrop} />}
      {activeSection === 'training' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-cropguard-mid" />
              <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Weekly Training Materials</p>
            </div>
            <FarmerWeeklyMaterials farmerId={farmerId} farmerCrop={farmerCrop as any} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-cropguard-mid" />
              <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Upcoming Training Sessions</p>
            </div>
            <FarmerTrainingSessions farmerCrop={farmerCrop as any} />
          </div>
        </div>
      )}
    </div>
  );
}
