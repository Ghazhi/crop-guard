import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ChevronLeft, ChevronRight, Camera, MapPin, Check, Loader2,
  UserCheck, Upload, Mic, MicOff, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { zodResolver } from '@/lib/form-resolver';
import { CROP_OPTIONS } from '@/lib/constants';
import type { Gender } from '@/types';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────

export interface FarmerFormData {
  // Personal
  first_name:          string;
  last_name:           string;
  gender:              Gender | '';
  date_of_birth:       string;
  phone:               string;
  national_id_type:    string;
  national_id:         string;
  photo_url:           string;
  id_front_url:        string;
  id_back_url:         string;
  voice_consent_url:   string;
  community_id:        string;
  cooperative_id:      string;
  program_id:          string;
  cohort_id_ref:       string;
  // Farm
  years_farm_experience:      string;
  acres_cultivated:            string;
  primary_crop:                string;
  primary_crop_other:          string;
  secondary_crop:              string;
  secondary_crop_other:        string;
  primary_bags_prev_season:    string;
  secondary_bags_prev_season:  string;
  owns_tractor:                string;
  // Community/Household
  owns_house:              string;
  marital_status:          string;
  wives_count:             string;
  children_count:          string;
  other_business:          string;
  other_business_specify:  string;
  is_community_native:     string;
  origin_if_not_native:    string;
  community_preferences:   string[];
  // Support
  other_agric_companies:          string;
  other_agric_companies_specify:  string;
  desired_assets:                 string[];
  input_credit_participation:     string;
  other_org_engagement:           string;
  other_org_activities:           string;
  other_org_name:                 string;
  asinyo_improvement_notes:       string;
  gps_address:                    string;
}

interface Community { id: string; name: string; }
interface Cooperative { id: string; name: string; }
interface Program { id: string; name: string; }
interface Cohort { id: string; name: string; program_id: string; }

interface FarmerRegistrationFormProps {
  onComplete: (data: FarmerFormData) => Promise<void>;
  onBack?: () => void;
  saving?: boolean;
  saveError?: string;
  initialStep?: number;
  compact?: boolean; // staff drawer mode: no full-page header
  mode?: 'create' | 'edit';
  initialData?: Partial<FarmerFormData>;
}

// ─── Constants ───────────────────────────────────────────────

const STEPS = ['Personal', 'Identity', 'Farm', 'Household', 'Support'];

const ID_TYPES = [
  { value: 'ghana_card',        label: 'Ghana Card' },
  { value: 'health_insurance',  label: 'Health Insurance' },
  { value: 'voters_id',         label: "Voter's ID" },
  { value: 'passport',          label: 'Passport' },
  { value: 'other',             label: 'Other' },
];

const MARITAL_OPTIONS = [
  { value: 'single',   label: 'Single'   },
  { value: 'married',  label: 'Married'  },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed',  label: 'Widowed'  },
];

const COMMUNITY_PREFS = [
  'School', 'Roads', 'Water', 'Hospital', 'Police station', 'Banks',
];

const DESIRED_ASSETS = [
  'Tractor', 'Irrigation system', 'Storage facility', 'Processing equipment',
  'Solar pump', 'Drone sprayer', 'Motorbike', 'Other',
];

const SECONDARY_CROP_OPTIONS = [
  ...CROP_OPTIONS,
  { value: 'none', label: 'None' },
];

// ─── Zod schemas per step ────────────────────────────────────

const step1Schema = z.object({
  first_name:    z.string().min(1, 'First name required'),
  last_name:     z.string().min(1, 'Last name required'),
  gender:        z.string().optional(),
  date_of_birth: z.string().optional(),
  phone:         z.string().min(10, 'Enter a valid phone number'),
  community_id:  z.string().optional(),
  cooperative_id: z.string().optional(),
  program_id:    z.string().optional(),
  cohort_id_ref: z.string().optional(),
});

const step2Schema = z.object({
  national_id_type: z.string().min(1, 'Select ID type'),
  national_id:      z.string().min(4, 'ID number required'),
});

const step3Schema = z.object({
  primary_crop: z.string().min(1, 'Select a crop'),
});

type S1 = z.infer<typeof step1Schema>;
type S2 = z.infer<typeof step2Schema>;
type S3 = z.infer<typeof step3Schema>;

// ─── Sub-components ──────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-5">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
            i < current ? 'bg-cropguard-green text-white' :
            i === current ? 'bg-cropguard-dark text-white' :
            'bg-gray-200 text-gray-400'
          )}>
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-5 h-0.5 transition-colors', i < current ? 'bg-cropguard-green' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-cropguard-slate mb-3 mt-4 first:mt-0">
      {children}
    </h3>
  );
}

function Field({ label, required, error, children, half }: {
  label: string; required?: boolean; error?: string;
  children: React.ReactNode; half?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', half && 'col-span-1')}>
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function YesNoField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {['yes', 'no'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'flex-1 h-9 rounded-lg border text-sm font-medium transition-colors capitalize',
              value === v
                ? 'bg-cropguard-dark text-white border-cropguard-dark'
                : 'border-gray-200 text-gray-600 hover:border-cropguard-mid'
            )}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </Field>
  );
}

function MultiSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
              value.includes(opt)
                ? 'bg-cropguard-dark text-white border-cropguard-dark'
                : 'border-gray-200 text-gray-600 hover:border-cropguard-mid'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}

function PhotoUpload({ label, url, onUpload, bucket = 'cropguard-avatars', path }: {
  label: string; url: string; onUpload: (url: string) => void;
  bucket?: string; path: string;
}) {
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const ext = file.name.split('.').pop();
    const fullPath = `${path}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      onUpload(data.publicUrl);
    }
    setLoading(false);
  };

  return (
    <Field label={label}>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors',
          url ? 'border-cropguard-green bg-cropguard-mint/30' : 'border-gray-200 hover:border-cropguard-mid'
        )}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-cropguard-mid mx-auto" />
        ) : url ? (
          <div className="flex items-center gap-3">
            <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            <p className="text-xs text-cropguard-green font-medium">Uploaded — tap to replace</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-center">
            <Camera className="w-5 h-5 text-gray-300" />
            <p className="text-sm text-gray-400">Take photo or upload</p>
          </div>
        )}
      </div>
    </Field>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function FarmerRegistrationForm({
  onComplete, onBack, saving = false, saveError = '', compact = false,
  mode = 'create', initialData = {},
}: FarmerRegistrationFormProps) {
  const profile = useAuthStore(s => s.profile);
  const [step, setStep] = useState(0);

  // Loaded options
  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [programs,     setPrograms]     = useState<Program[]>([]);
  const [cohorts,      setCohorts]      = useState<Cohort[]>([]);

  // Photo/media state
  const [photoUrl,      setPhotoUrl]      = useState(initialData.photo_url ?? '');
  const [idFrontUrl,    setIdFrontUrl]    = useState(initialData.id_front_url ?? '');
  const [idBackUrl,     setIdBackUrl]     = useState(initialData.id_back_url ?? '');
  const [voiceUrl,      setVoiceUrl]      = useState(initialData.voice_consent_url ?? '');
  const [recording,     setRecording]     = useState(false);
  const [gpsAddress,    setGpsAddress]    = useState(initialData.gps_address ?? '');
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const [consent,       setConsent]       = useState(mode === 'edit');

  // Free-form state for steps 3-5
  const [s1, setS1] = useState<S1 | null>(mode === 'edit' ? {
    first_name:    initialData.first_name ?? '',
    last_name:     initialData.last_name ?? '',
    gender:        (initialData.gender as Gender | undefined) ?? undefined,
    date_of_birth: initialData.date_of_birth ?? '',
    phone:         initialData.phone ?? '',
    community_id:  initialData.community_id ?? '',
    cooperative_id: initialData.cooperative_id ?? '',
    program_id:    initialData.program_id ?? '',
    cohort_id_ref: initialData.cohort_id_ref ?? '',
  } : null);
  const [s2, setS2] = useState<S2 | null>(mode === 'edit' ? {
    national_id_type: initialData.national_id_type ?? '',
    national_id:      initialData.national_id ?? '',
  } : null);

  const [farmData, setFarmData] = useState({
    years_farm_experience: initialData.years_farm_experience ?? '',
    acres_cultivated:      initialData.acres_cultivated ?? '',
    primary_crop:          initialData.primary_crop ?? 'soybean',
    primary_crop_other:    initialData.primary_crop_other ?? '',
    secondary_crop:        initialData.secondary_crop ?? '',
    secondary_crop_other:  initialData.secondary_crop_other ?? '',
    primary_bags_prev_season:   initialData.primary_bags_prev_season ?? '',
    secondary_bags_prev_season: initialData.secondary_bags_prev_season ?? '',
    owns_tractor:          initialData.owns_tractor ?? '',
  });

  const [hhData, setHhData] = useState({
    owns_house:             initialData.owns_house ?? '',
    marital_status:         initialData.marital_status ?? '',
    wives_count:            initialData.wives_count ?? '',
    children_count:         initialData.children_count ?? '',
    other_business:         initialData.other_business ?? '',
    other_business_specify: initialData.other_business_specify ?? '',
    is_community_native:    initialData.is_community_native ?? '',
    origin_if_not_native:   initialData.origin_if_not_native ?? '',
    community_preferences:  initialData.community_preferences ?? [] as string[],
  });

  const [supportData, setSupportData] = useState({
    other_agric_companies:         initialData.other_agric_companies ?? '',
    other_agric_companies_specify: initialData.other_agric_companies_specify ?? '',
    desired_assets:                initialData.desired_assets ?? [] as string[],
    input_credit_participation:    initialData.input_credit_participation ?? '',
    other_org_engagement:          initialData.other_org_engagement ?? '',
    other_org_activities:          initialData.other_org_activities ?? '',
    other_org_name:                initialData.other_org_name ?? '',
    asinyo_improvement_notes:      initialData.asinyo_improvement_notes ?? '',
  });

  const [selectedProgram, setSelectedProgram] = useState(initialData.program_id ?? '');
  const filteredCohorts = cohorts.filter(c => c.program_id === selectedProgram);

  const form1 = useForm<S1>({
    resolver: zodResolver(step1Schema),
    defaultValues: mode === 'edit' ? {
      first_name:    initialData.first_name ?? '',
      last_name:     initialData.last_name ?? '',
      gender:        (initialData.gender as Gender | undefined) ?? undefined,
      date_of_birth: initialData.date_of_birth ?? '',
      phone:         initialData.phone ?? '',
      community_id:  initialData.community_id ?? '',
      cooperative_id: initialData.cooperative_id ?? '',
      program_id:    initialData.program_id ?? '',
      cohort_id_ref: initialData.cohort_id_ref ?? '',
    } : undefined,
  });
  const form2 = useForm<S2>({
    resolver: zodResolver(step2Schema),
    defaultValues: mode === 'edit' ? {
      national_id_type: initialData.national_id_type ?? '',
      national_id:      initialData.national_id ?? '',
    } : undefined,
  });
  const form3 = useForm<S3>({
    resolver: zodResolver(step3Schema),
    defaultValues: mode === 'edit' ? {
      primary_crop: initialData.primary_crop ?? 'soybean',
    } : undefined,
  });

  const loadOptions = useCallback(async () => {
    if (!profile) return;
    const [{ data: comms }, { data: coops }, { data: progs }, { data: cohs }] = await Promise.all([
      supabase.from('communities').select('id,name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('cooperatives').select('id,name').eq('organisation_id', profile.organisation_id).order('name'),
      supabase.from('programs').select('id,name').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('cohorts').select('id,name,program_id').eq('is_active', true).order('name'),
    ]);
    setCommunities(comms ?? []);
    setCooperatives(coops ?? []);
    setPrograms(progs ?? []);
    setCohorts(cohs ?? []);
  }, [profile]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  // ── Voice consent recording ──
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const path = `${profile?.id}/voice-${Date.now()}.webm`;
        const { error } = await supabase.storage.from('cropguard-avatars').upload(path, blob, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('cropguard-avatars').getPublicUrl(path);
          setVoiceUrl(data.publicUrl);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { /* mic permission denied */ }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ── GPS ──
  const captureGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsAddress(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 10000 }
    );
  };

  // ── Navigation ──
  const goBack = () => step > 0 ? setStep(s => s - 1) : onBack?.();

  // ── Submit ──
  const handleFinalSubmit = async () => {
    if (!s1 || !s2) return;
    const data: FarmerFormData = {
      first_name:    s1.first_name,
      last_name:     s1.last_name,
      gender:        (s1.gender as Gender | '') ?? '',
      date_of_birth: s1.date_of_birth ?? '',
      phone:         s1.phone,
      national_id_type: s2.national_id_type,
      national_id:      s2.national_id,
      photo_url:         photoUrl,
      id_front_url:      idFrontUrl,
      id_back_url:       idBackUrl,
      voice_consent_url: voiceUrl,
      community_id:      s1.community_id ?? '',
      cooperative_id:    s1.cooperative_id ?? '',
      program_id:        s1.program_id ?? '',
      cohort_id_ref:     s1.cohort_id_ref ?? '',
      ...farmData,
      ...hhData,
      ...supportData,
      gps_address: gpsAddress,
    };
    await onComplete(data);
  };

  const photoPath = `${profile?.id}/farmer-${Date.now()}`;

  return (
    <div className={cn('space-y-0', compact ? '' : 'p-4 max-w-lg mx-auto')}>
      {!compact && (
        <div className="flex items-center gap-3 mb-5 pt-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-cropguard-mint">
            <ChevronLeft className="w-5 h-5 text-cropguard-dark" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-cropguard-forest">{mode === 'edit' ? 'Edit Farmer' : 'Register Farmer'}</h2>
            <p className="text-xs text-cropguard-slate">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-cropguard-forest">{STEPS[step]} Details</p>
          <p className="text-xs text-cropguard-slate">Step {step + 1} of {STEPS.length}</p>
        </div>
      )}

      <StepIndicator current={step} />

      {/* ── STEP 1: Personal Details ── */}
      {step === 0 && (
        <form onSubmit={form1.handleSubmit(d => { setS1(d); setSelectedProgram(d.program_id ?? ''); setStep(1); })} className="space-y-4">
          <SectionTitle>Name & Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required error={form1.formState.errors.first_name?.message}>
              <Input placeholder="Ama" {...form1.register('first_name')} />
            </Field>
            <Field label="Last Name" required error={form1.formState.errors.last_name?.message}>
              <Input placeholder="Mensah" {...form1.register('last_name')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <Select
                value={form1.watch('gender') ?? ''}
                onValueChange={v => form1.setValue('gender', v as Gender)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of Birth">
              <Input type="date" {...form1.register('date_of_birth')} />
            </Field>
          </div>
          <Field label="Phone Number" required error={form1.formState.errors.phone?.message}>
            <Input type="tel" placeholder="0241 234 567" {...form1.register('phone')} />
          </Field>

          <SectionTitle>Community & Program</SectionTitle>
          <Field label="Community">
            <Select
              value={form1.watch('community_id') ?? ''}
              onValueChange={v => form1.setValue('community_id', v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No community</SelectItem>
                {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Group / Cooperative">
            <Select
              value={form1.watch('cooperative_id') ?? ''}
              onValueChange={v => form1.setValue('cooperative_id', v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No group</SelectItem>
                {cooperatives.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Program (optional)">
              <Select
                value={form1.watch('program_id') ?? ''}
                onValueChange={v => { form1.setValue('program_id', v === '__none__' ? '' : v); setSelectedProgram(v === '__none__' ? '' : v); form1.setValue('cohort_id_ref', ''); }}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cohort (optional)">
              <Select
                value={form1.watch('cohort_id_ref') ?? ''}
                onValueChange={v => form1.setValue('cohort_id_ref', v === '__none__' ? '' : v)}
                disabled={!selectedProgram}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {filteredCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Button type="submit" className="w-full bg-cropguard-dark hover:bg-cropguard-forest">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      )}

      {/* ── STEP 2: Identity & Photos ── */}
      {step === 1 && (
        <form onSubmit={form2.handleSubmit(d => { setS2(d); setStep(2); })} className="space-y-4">
          <SectionTitle>ID Document</SectionTitle>
          <Field label="ID Type" required error={form2.formState.errors.national_id_type?.message}>
            <Select
              value={form2.watch('national_id_type') ?? ''}
              onValueChange={v => form2.setValue('national_id_type', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ID Number" required error={form2.formState.errors.national_id?.message}>
            <Input placeholder="GHA-XXXXXXXXX-X" {...form2.register('national_id')} />
          </Field>

          <SectionTitle>Photos</SectionTitle>
          <PhotoUpload
            label="Passport / Profile Photo"
            url={photoUrl}
            onUpload={setPhotoUrl}
            path={`${photoPath}-passport`}
          />
          <div className="grid grid-cols-2 gap-3">
            <PhotoUpload
              label="ID Front"
              url={idFrontUrl}
              onUpload={setIdFrontUrl}
              path={`${photoPath}-id-front`}
            />
            <PhotoUpload
              label="ID Back"
              url={idBackUrl}
              onUpload={setIdBackUrl}
              path={`${photoPath}-id-back`}
            />
          </div>

          <SectionTitle>Voice Consent</SectionTitle>
          <Field label="Voice Consent Recording">
            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  recording
                    ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                    : 'border-gray-200 hover:border-cropguard-mid text-gray-600'
                )}
              >
                {recording ? <><MicOff className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Record</>}
              </button>
              {voiceUrl && (
                <div className="flex items-center gap-2 text-xs text-cropguard-green font-medium">
                  <Check className="w-3.5 h-3.5" /> Recorded
                </div>
              )}
            </div>
          </Field>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button type="submit" className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Farm Information ── */}
      {step === 2 && (
        <form onSubmit={form3.handleSubmit(() => setStep(3))} className="space-y-4">
          <SectionTitle>Farm Experience</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Years of Experience">
              <Input
                type="number" min="0" placeholder="e.g. 5"
                value={farmData.years_farm_experience}
                onChange={e => setFarmData(d => ({ ...d, years_farm_experience: e.target.value }))}
              />
            </Field>
            <Field label="Acres Cultivated">
              <Input
                type="number" min="0" step="0.1" placeholder="e.g. 3.5"
                value={farmData.acres_cultivated}
                onChange={e => setFarmData(d => ({ ...d, acres_cultivated: e.target.value }))}
              />
            </Field>
          </div>

          <SectionTitle>Crops</SectionTitle>
          <Field label="Primary Crop" required error={form3.formState.errors.primary_crop?.message}>
            <Select
              value={farmData.primary_crop}
              onValueChange={v => { form3.setValue('primary_crop', v); setFarmData(d => ({ ...d, primary_crop: v, primary_crop_other: '' })); }}
            >
              <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
              <SelectContent>
                {CROP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {farmData.primary_crop === 'other' && (
            <Field label="Specify Primary Crop">
              <Input
                placeholder="Crop name"
                value={farmData.primary_crop_other}
                onChange={e => setFarmData(d => ({ ...d, primary_crop_other: e.target.value }))}
              />
            </Field>
          )}
          <Field label="Bags (100kg) — Primary Crop, Prev Season">
            <Input
              type="number" min="0" placeholder="e.g. 20"
              value={farmData.primary_bags_prev_season}
              onChange={e => setFarmData(d => ({ ...d, primary_bags_prev_season: e.target.value }))}
            />
          </Field>

          <Field label="Secondary Crop">
            <Select
              value={farmData.secondary_crop || '__none__'}
              onValueChange={v => setFarmData(d => ({ ...d, secondary_crop: v === '__none__' ? '' : v, secondary_crop_other: '' }))}
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {CROP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {farmData.secondary_crop === 'other' && (
            <Field label="Specify Secondary Crop">
              <Input
                placeholder="Crop name"
                value={farmData.secondary_crop_other}
                onChange={e => setFarmData(d => ({ ...d, secondary_crop_other: e.target.value }))}
              />
            </Field>
          )}
          {farmData.secondary_crop && farmData.secondary_crop !== '__none__' && (
            <Field label="Bags (100kg) — Secondary Crop, Prev Season">
              <Input
                type="number" min="0" placeholder="e.g. 10"
                value={farmData.secondary_bags_prev_season}
                onChange={e => setFarmData(d => ({ ...d, secondary_bags_prev_season: e.target.value }))}
              />
            </Field>
          )}

          <YesNoField label="Owns a Tractor?" value={farmData.owns_tractor} onChange={v => setFarmData(d => ({ ...d, owns_tractor: v }))} />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button type="submit" className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </form>
      )}

      {/* ── STEP 4: Community / Household ── */}
      {step === 3 && (
        <div className="space-y-4">
          <SectionTitle>Household</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <YesNoField label="Owns a House?" value={hhData.owns_house} onChange={v => setHhData(d => ({ ...d, owns_house: v }))} />
            <Field label="Marital Status">
              <Select value={hhData.marital_status} onValueChange={v => setHhData(d => ({ ...d, marital_status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {(hhData.marital_status === 'married') && (
            <Field label="Number of Wives (if applicable)">
              <Input
                type="number" min="0" placeholder="0"
                value={hhData.wives_count}
                onChange={e => setHhData(d => ({ ...d, wives_count: e.target.value }))}
              />
            </Field>
          )}
          <Field label="Number of Children">
            <Input
              type="number" min="0" placeholder="0"
              value={hhData.children_count}
              onChange={e => setHhData(d => ({ ...d, children_count: e.target.value }))}
            />
          </Field>

          <SectionTitle>Other Business</SectionTitle>
          <YesNoField label="Any Other Business?" value={hhData.other_business} onChange={v => setHhData(d => ({ ...d, other_business: v }))} />
          {hhData.other_business === 'yes' && (
            <Field label="Specify Business">
              <Input
                placeholder="e.g. Trading, Tailoring"
                value={hhData.other_business_specify}
                onChange={e => setHhData(d => ({ ...d, other_business_specify: e.target.value }))}
              />
            </Field>
          )}

          <SectionTitle>Community Background</SectionTitle>
          <YesNoField label="Native of this Community?" value={hhData.is_community_native} onChange={v => setHhData(d => ({ ...d, is_community_native: v }))} />
          {hhData.is_community_native === 'no' && (
            <Field label="Town / Region of Origin">
              <Input
                placeholder="e.g. Tamale, Northern Region"
                value={hhData.origin_if_not_native}
                onChange={e => setHhData(d => ({ ...d, origin_if_not_native: e.target.value }))}
              />
            </Field>
          )}

          <MultiSelect
            label="Community Preferences (select all that apply)"
            options={COMMUNITY_PREFS}
            value={hhData.community_preferences}
            onChange={v => setHhData(d => ({ ...d, community_preferences: v }))}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button type="button" className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => setStep(4)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 5: Support Activities ── */}
      {step === 4 && (
        <div className="space-y-4">
          <SectionTitle>Other Agric Engagements</SectionTitle>
          <YesNoField
            label="Engaged with other agric companies?"
            value={supportData.other_agric_companies}
            onChange={v => setSupportData(d => ({ ...d, other_agric_companies: v }))}
          />
          {supportData.other_agric_companies === 'yes' && (
            <Field label="Specify Companies">
              <Input
                placeholder="e.g. AGRA, etc."
                value={supportData.other_agric_companies_specify}
                onChange={e => setSupportData(d => ({ ...d, other_agric_companies_specify: e.target.value }))}
              />
            </Field>
          )}

          <MultiSelect
            label="Desired Assets (select all that apply)"
            options={DESIRED_ASSETS}
            value={supportData.desired_assets}
            onChange={v => setSupportData(d => ({ ...d, desired_assets: v }))}
          />

          <YesNoField
            label="Willing to participate in Input Credit?"
            value={supportData.input_credit_participation}
            onChange={v => setSupportData(d => ({ ...d, input_credit_participation: v }))}
          />

          <SectionTitle>Organisation Engagement</SectionTitle>
          <YesNoField
            label="Engaged with other organisations?"
            value={supportData.other_org_engagement}
            onChange={v => setSupportData(d => ({ ...d, other_org_engagement: v }))}
          />
          {supportData.other_org_engagement === 'yes' && (
            <>
              <Field label="Organisation Name">
                <Input
                  placeholder="Organisation name"
                  value={supportData.other_org_name}
                  onChange={e => setSupportData(d => ({ ...d, other_org_name: e.target.value }))}
                />
              </Field>
              <Field label="Activities / Services">
                <Input
                  placeholder="e.g. Training, Input supply"
                  value={supportData.other_org_activities}
                  onChange={e => setSupportData(d => ({ ...d, other_org_activities: e.target.value }))}
                />
              </Field>
            </>
          )}

          <SectionTitle>Feedback</SectionTitle>
          <Field label="What do you want Asinyo to improve?">
            <textarea
              rows={3}
              placeholder="Farmer's suggestions..."
              value={supportData.asinyo_improvement_notes}
              onChange={e => setSupportData(d => ({ ...d, asinyo_improvement_notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cropguard-mid resize-none"
            />
          </Field>

          <SectionTitle>GPS & Consent</SectionTitle>
          <Field label="GPS Location">
            <div className="flex gap-2">
              <Input
                readOnly value={gpsAddress}
                placeholder="Tap to capture location"
                className="flex-1 bg-gray-50 text-xs"
              />
              <Button type="button" size="icon" variant="outline" onClick={captureGPS} disabled={gpsLoading} className="shrink-0">
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-cropguard-mid" />}
              </Button>
            </div>
          </Field>

          <div className="bg-cropguard-mint/50 rounded-xl p-4 space-y-3 border border-cropguard-green/20">
            <h3 className="text-sm font-semibold text-cropguard-forest">Consent</h3>
            <p className="text-xs text-cropguard-slate leading-relaxed">
              I confirm that the farmer has consented to their personal data being collected and stored
              by ASINYO CropGuard for agricultural program management, insurance, and credit facilitation services.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-cropguard-dark"
              />
              <span className="text-xs text-cropguard-dark font-medium">
                Farmer has given informed consent *
              </span>
            </label>
          </div>

          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(3)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              type="button"
              disabled={saving || !consent}
              className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
              onClick={handleFinalSubmit}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving…</>
              ) : (
                <><UserCheck className="w-4 h-4 mr-1.5" /> {mode === 'edit' ? 'Save Changes' : 'Register Farmer'}</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
