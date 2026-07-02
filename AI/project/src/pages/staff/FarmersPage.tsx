import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Check, UserPlus, Loader2, X,
  Users, ShieldCheck, Upload, Plus, Edit2,
  UserMinus, Download, AlertTriangle, Phone,
  MapPin, Sprout, Camera, UserCog,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { Farmer, Program, Cohort, Enrollment, User } from '@/types';
import type { CropType, RegionCode, Gender } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CROP_LABELS, CROP_OPTIONS, REGION_LABELS, REGION_OPTIONS,
  RISK_CATEGORY_COLORS, RISK_CATEGORY_LABELS, GENDER_LABELS,
  DISTRICTS_BY_REGION, phoneToEmail,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FarmerWithEnrollment extends Farmer {
  enrollment?: Enrollment;
}

interface FarmerForm {
  full_name: string;
  phone: string;
  national_id: string;
  date_of_birth: string;
  gender: Gender | '';
  region_code: RegionCode | '';
  district: string;
  community: string;
  primary_crop: CropType | '';
  total_farm_size_ha: string;
}

const EMPTY_FARMER: FarmerForm = {
  full_name: '', phone: '', national_id: '', date_of_birth: '', gender: '',
  region_code: '', district: '', community: '', primary_crop: '', total_farm_size_ha: '',
};

// ── CSV template headers ──────────────────────────────────────────────────────
const CSV_HEADERS = ['full_name', 'phone', 'national_id', 'date_of_birth', 'gender', 'region_code', 'district', 'community', 'primary_crop', 'total_farm_size_ha'];

function downloadCsvTemplate() {
  const rows = [CSV_HEADERS.join(','), 'Ama Mensah,0241234567,GHA-XXXXXXXXX-X,1985-03-15,female,AH,Kumasi Metro,Adum,maize,2.5'];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'farmers_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(text: string): Partial<FarmerForm>[] {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj as Partial<FarmerForm>;
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffFarmersPage() {
  const profile = useAuthStore(s => s.profile);

  const [farmers, setFarmers] = useState<FarmerWithEnrollment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterCohort, setFilterCohort] = useState('');
  const [filterEnrolled, setFilterEnrolled] = useState<'all' | 'enrolled' | 'unenrolled'>('all');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Enroll dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollProgram, setEnrollProgram] = useState('');
  const [enrollCohort, setEnrollCohort] = useState('');
  const [enrollCohorts, setEnrollCohorts] = useState<Cohort[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<{ type: 'success' | 'error' | 'conflict'; text: string } | null>(null);
  const [enrollConflicts, setEnrollConflicts] = useState<string[]>([]); // farmer ids with active enrollments

  // Add farmer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FarmerForm>(EMPTY_FARMER);
  const [addStep, setAddStep] = useState<'form' | 'enroll'>('form');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [newFarmerId, setNewFarmerId] = useState('');
  const [addEnrollProgram, setAddEnrollProgram] = useState('');
  const [addEnrollCohort, setAddEnrollCohort] = useState('');
  const [addEnrollCohorts, setAddEnrollCohorts] = useState<Cohort[]>([]);
  const [addPhotoUrl, setAddPhotoUrl] = useState('');
  const [addPhotoLoading, setAddPhotoLoading] = useState(false);
  const [addGpsAddress, setAddGpsAddress] = useState('');
  const [addGpsLoading, setAddGpsLoading] = useState(false);
  const [addConsent, setAddConsent] = useState(false);
  const addPhotoRef = useRef<HTMLInputElement>(null);

  // Edit farmer dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<FarmerWithEnrollment | null>(null);
  const [editForm, setEditForm] = useState<FarmerForm>(EMPTY_FARMER);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Unenroll dialog
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [farmerToUnenroll, setFarmerToUnenroll] = useState<FarmerWithEnrollment | null>(null);

  // Per-farmer agent assignment
  const [agentAssignOpen, setAgentAssignOpen] = useState(false);
  const [agentAssignFarmer, setAgentAssignFarmer] = useState<FarmerWithEnrollment | null>(null);
  const [agentAssignId, setAgentAssignId] = useState('');
  const [agentAssignSaving, setAgentAssignSaving] = useState(false);
  const [agentAssignMsg, setAgentAssignMsg] = useState('');
  const [agentList, setAgentList] = useState<User[]>([]);

  // Bulk agent assign (for selected farmers)
  const [bulkAgentAssignOpen, setBulkAgentAssignOpen] = useState(false);
  const [bulkAgentAssignId, setBulkAgentAssignId] = useState('');
  const [bulkAgentAssignSaving, setBulkAgentAssignSaving] = useState(false);
  const [bulkAgentAssignMsg, setBulkAgentAssignMsg] = useState('');

  // Bulk upload
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Partial<FarmerForm>[]>([]);
  const [csvError, setCsvError] = useState('');
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const loadPrograms = useCallback(async () => {
    if (!profile) return;
    const [{ data: progs }, { data: coh }, { data: agts }] = await Promise.all([
      supabase.from('programs').select('*').eq('organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('cohorts').select('*, programs!inner(organisation_id)').eq('programs.organisation_id', profile.organisation_id).eq('is_active', true).order('name'),
      supabase.from('users').select('id,full_name,role,is_active,region_code,organisation_id').eq('organisation_id', profile.organisation_id).eq('role', 'agent').eq('is_active', true).order('full_name'),
    ]);
    setPrograms(progs ?? []);
    setCohorts((coh ?? []) as unknown as Cohort[]);
    setAgentList((agts ?? []) as unknown as User[]);
  }, [profile]);

  const loadFarmers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let q = supabase
      .from('farmers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name');

    if (search.trim()) {
      const s = search.trim();
      q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,national_id.ilike.%${s}%`);
    }

    const { data: farmerData } = await q.limit(300);
    const list = (farmerData ?? []) as Farmer[];

    if (list.length === 0) { setFarmers([]); setLoading(false); return; }

    let enrollQ = (supabase.from('enrollments') as any)
      .select('*')
      .in('farmer_id', list.map(f => f.id))
      .eq('status', 'active');

    if (filterProgram) enrollQ = enrollQ.eq('program_id', filterProgram);
    if (filterCohort)  enrollQ = enrollQ.eq('cohort_id', filterCohort);

    const { data: enrollData } = await enrollQ;
    const enrollMap: Record<string, Enrollment> = {};
    (enrollData ?? []).forEach((e: Enrollment) => { enrollMap[e.farmer_id] = e; });

    const merged: FarmerWithEnrollment[] = list.map(f => ({ ...f, enrollment: enrollMap[f.id] }));

    setFarmers(merged.filter(f => {
      if (filterEnrolled === 'enrolled')   return !!f.enrollment;
      if (filterEnrolled === 'unenrolled') return !f.enrollment;
      return true;
    }));
    setLoading(false);
  }, [profile, search, filterProgram, filterCohort, filterEnrolled]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadFarmers(), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [loadFarmers]);

  useEffect(() => { if (!filterProgram) setFilterCohort(''); }, [filterProgram]);

  useEffect(() => {
    if (!enrollProgram) { setEnrollCohorts([]); setEnrollCohort(''); return; }
    setEnrollCohorts(cohorts.filter(c => c.program_id === enrollProgram));
    setEnrollCohort('');
  }, [enrollProgram, cohorts]);

  useEffect(() => {
    if (!addEnrollProgram) { setAddEnrollCohorts([]); setAddEnrollCohort(''); return; }
    setAddEnrollCohorts(cohorts.filter(c => c.program_id === addEnrollProgram));
    setAddEnrollCohort('');
  }, [addEnrollProgram, cohorts]);

  const filteredCohorts = filterProgram ? cohorts.filter(c => c.program_id === filterProgram) : cohorts;

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelected(new Set(farmers.map(f => f.id)));
  const clearAll  = () => setSelected(new Set());

  // ── Bulk Enroll ───────────────────────────────────────────────────────────

  const openEnroll = () => {
    if (selected.size === 0) return;
    setEnrollProgram(''); setEnrollCohort(''); setEnrollMsg(null); setEnrollOpen(true);
  };

  const handleEnroll = async (forceReenroll = false) => {
    if (!enrollProgram) { setEnrollMsg({ type: 'error', text: 'Select a program.' }); return; }
    setEnrolling(true); setEnrollMsg(null);

    const farmerIds = [...selected];

    // Check for farmers already in an active enrollment
    if (!forceReenroll) {
      const { data: existing } = await (supabase.from('enrollments') as any)
        .select('farmer_id')
        .in('farmer_id', farmerIds)
        .eq('status', 'active');
      const conflicts = (existing ?? []).map((e: { farmer_id: string }) => e.farmer_id);
      if (conflicts.length > 0) {
        const conflictNames = farmers
          .filter(f => conflicts.includes(f.id))
          .map(f => f.full_name)
          .join(', ');
        setEnrollConflicts(conflicts);
        setEnrollMsg({
          type: 'conflict',
          text: `${conflicts.length} farmer${conflicts.length > 1 ? 's are' : ' is'} already in an active program: ${conflictNames}. Their current enrollment will be marked as graduated before enrolling in the new program.`,
        });
        setEnrolling(false);
        return;
      }
    }

    // Graduate existing active enrollments for conflicted farmers
    if (enrollConflicts.length > 0) {
      await Promise.all(enrollConflicts.map(farmer_id =>
        (supabase.rpc as any)('deactivate_farmer_active_enrollment', {
          p_farmer_id: farmer_id,
          p_reason: 'Re-enrolled in new program by staff',
        })
      ));
    }

    const rows = farmerIds.map(farmer_id => ({
      farmer_id, program_id: enrollProgram,
      cohort_id: enrollCohort || null,
      agent_id: profile!.id,
      status: 'active' as const,
    }));
    const { error } = await (supabase.from('enrollments') as any).insert(rows);
    setEnrolling(false);
    setEnrollConflicts([]);
    if (error) {
      setEnrollMsg({ type: 'error', text: 'Enrollment failed. Please try again.' });
    } else {
      setEnrollMsg({ type: 'success', text: `${selected.size} farmer${selected.size > 1 ? 's' : ''} enrolled successfully.` });
      setSelected(new Set());
      loadFarmers();
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAddPhotoLoading(true);
    const ext  = file.name.split('.').pop();
    const path = `${profile.id}/farmer-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('cropguard-avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('cropguard-avatars').getPublicUrl(path);
      setAddPhotoUrl(data.publicUrl);
    }
    setAddPhotoLoading(false);
  };

  const captureAddGPS = () => {
    if (!navigator.geolocation) return;
    setAddGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setAddGpsAddress(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
        setAddGpsLoading(false);
      },
      () => setAddGpsLoading(false),
      { timeout: 10000 }
    );
  };

  // ── Add Farmer ────────────────────────────────────────────────────────────

  const openAdd = () => {
    setAddForm(EMPTY_FARMER); setAddStep('form'); setAddError('');
    setNewFarmerId(''); setAddEnrollProgram(''); setAddEnrollCohort('');
    setAddPhotoUrl(''); setAddGpsAddress(''); setAddConsent(false);
    setAddOpen(true);
  };

  const handleAddFarmer = async () => {
    const f = addForm;
    if (!f.full_name || !f.phone || !f.national_id || !f.region_code || !f.district || !f.primary_crop) {
      setAddError('Please fill in all required fields.'); return;
    }
    if (!addConsent) {
      setAddError('Farmer consent is required to proceed.'); return;
    }
    setAddSaving(true); setAddError('');
    const { data: farmer, error } = await supabase.from('farmers').insert({
      full_name:          f.full_name,
      phone:              f.phone,
      national_id:        f.national_id,
      date_of_birth:      f.date_of_birth || null,
      gender:             f.gender || null,
      region_code:        f.region_code as RegionCode,
      district:           f.district,
      community:          f.community,
      primary_crop:       f.primary_crop as CropType,
      total_farm_size_ha: parseFloat(f.total_farm_size_ha) || 0,
      organisation_id:    profile!.organisation_id,
      photo_url:          addPhotoUrl || null,
      gps_address:        addGpsAddress || null,
    }).select().maybeSingle();

    if (error || !farmer) {
      setAddError(error?.message?.includes('unique') ? 'A farmer with this National ID already exists.' : (error?.message ?? 'Failed to save farmer.'));
      setAddSaving(false);
      return;
    }

    // Create auth account for farmer
    const { data: signUpResult } = await supabase.auth.signUp({
      email: phoneToEmail(f.phone),
      password: '654321',
      options: { data: { role: 'farmer', full_name: f.full_name, organisation_id: profile!.organisation_id, farmer_id: farmer.id } },
    });
    if (signUpResult?.user?.id) {
      await supabase.from('users').update({ must_change_password: true }).eq('id', signUpResult.user.id);
    }

    setNewFarmerId(farmer.id);
    setAddSaving(false);
    setAddStep('enroll');
  };

  const handleAddEnroll = async () => {
    if (!addEnrollProgram || !newFarmerId) { setAddOpen(false); loadFarmers(); return; }
    await (supabase.from('enrollments') as any).insert({
      farmer_id: newFarmerId,
      program_id: addEnrollProgram,
      cohort_id: addEnrollCohort || null,
      agent_id: profile!.id,
      status: 'active',
    });
    setAddOpen(false);
    loadFarmers();
  };

  // ── Edit Farmer ───────────────────────────────────────────────────────────

  const openEdit = (f: FarmerWithEnrollment) => {
    setEditingFarmer(f);
    setEditForm({
      full_name: f.full_name,
      phone: f.phone,
      national_id: f.national_id,
      date_of_birth: f.date_of_birth ?? '',
      gender: (f.gender as Gender | '') ?? '',
      region_code: f.region_code as RegionCode,
      district: f.district,
      community: f.community,
      primary_crop: f.primary_crop as CropType,
      total_farm_size_ha: f.total_farm_size_ha?.toString() ?? '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingFarmer) return;
    const f = editForm;
    if (!f.full_name || !f.phone || !f.national_id || !f.region_code || !f.district || !f.primary_crop) {
      setEditError('Please fill in all required fields.'); return;
    }
    setEditSaving(true); setEditError('');
    const { error } = await supabase.from('farmers').update({
      full_name:          f.full_name,
      phone:              f.phone,
      national_id:        f.national_id,
      date_of_birth:      f.date_of_birth || null,
      gender:             f.gender || null,
      region_code:        f.region_code as RegionCode,
      district:           f.district,
      community:          f.community,
      primary_crop:       f.primary_crop as CropType,
      total_farm_size_ha: parseFloat(f.total_farm_size_ha) || 0,
    }).eq('id', editingFarmer.id);
    setEditSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditOpen(false);
    loadFarmers();
  };

  // ── Unenroll ──────────────────────────────────────────────────────────────

  const openUnenroll = (f: FarmerWithEnrollment) => {
    setFarmerToUnenroll(f);
    setUnenrollOpen(true);
  };

  const handleUnenroll = async () => {
    if (!farmerToUnenroll?.enrollment) return;
    setUnenrolling(true);
    await (supabase.from('enrollments') as any)
      .update({ status: 'withdrawn' })
      .eq('id', farmerToUnenroll.enrollment.id);
    setUnenrolling(false);
    setUnenrollOpen(false);
    loadFarmers();
  };

  // ── Agent assignment ───────────────────────────────────────────────────────

  const openAgentAssign = (f: FarmerWithEnrollment) => {
    setAgentAssignFarmer(f);
    setAgentAssignId(f.enrollment?.agent_id ?? '');
    setAgentAssignMsg('');
    setAgentAssignOpen(true);
  };

  const handleAgentAssign = async () => {
    if (!agentAssignFarmer?.enrollment) return;
    setAgentAssignSaving(true); setAgentAssignMsg('');
    const { error } = await (supabase.from('enrollments') as any)
      .update({ agent_id: agentAssignId || null })
      .eq('id', agentAssignFarmer.enrollment.id);
    setAgentAssignSaving(false);
    if (error) { setAgentAssignMsg('Failed to assign. Please try again.'); return; }
    setAgentAssignMsg('Agent assigned successfully.');
    loadFarmers();
  };

  const openBulkAgentAssign = () => {
    if (selected.size === 0) return;
    const enrolledSelected = farmers.filter(f => selected.has(f.id) && f.enrollment);
    if (enrolledSelected.length === 0) { return; }
    setBulkAgentAssignId('');
    setBulkAgentAssignMsg('');
    setBulkAgentAssignOpen(true);
  };

  const handleBulkAgentAssign = async () => {
    if (!bulkAgentAssignId) { setBulkAgentAssignMsg('Select an agent.'); return; }
    setBulkAgentAssignSaving(true); setBulkAgentAssignMsg('');
    const enrollmentIds = farmers
      .filter(f => selected.has(f.id) && f.enrollment)
      .map(f => f.enrollment!.id);
    const { error } = await (supabase.from('enrollments') as any)
      .update({ agent_id: bulkAgentAssignId })
      .in('id', enrollmentIds);
    setBulkAgentAssignSaving(false);
    if (error) { setBulkAgentAssignMsg('Failed to assign. Please try again.'); return; }
    setBulkAgentAssignMsg(`${enrollmentIds.length} farmer${enrollmentIds.length !== 1 ? 's' : ''} assigned successfully.`);
    setSelected(new Set());
    loadFarmers();
  };

  // ── CSV Upload ────────────────────────────────────────────────────────────

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(''); setCsvMsg('');
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) { setCsvError('No data rows found in CSV.'); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (csvRows.length === 0) return;
    setCsvUploading(true); setCsvError(''); setCsvMsg('');
    let success = 0; let failed = 0; let skipped = 0;
    const errors: string[] = [];
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowLabel = `Row ${i + 2}`;
      if (!row.full_name || !row.phone || !row.national_id || !row.region_code || !row.district || !row.primary_crop) {
        errors.push(`${rowLabel} (${row.full_name || 'unnamed'}): missing required field`);
        failed++; continue;
      }
      const { error } = await supabase.from('farmers').insert({
        full_name:          row.full_name,
        phone:              row.phone!,
        national_id:        row.national_id!,
        date_of_birth:      row.date_of_birth || null,
        gender:             row.gender || null,
        region_code:        row.region_code as RegionCode,
        district:           row.district!,
        community:          row.community ?? '',
        primary_crop:       row.primary_crop as CropType,
        total_farm_size_ha: parseFloat(row.total_farm_size_ha ?? '0') || 0,
        organisation_id:    profile!.organisation_id,
      });
      if (error) {
        if (error.code === '23505') {
          errors.push(`${rowLabel} (${row.full_name}): duplicate national ID — skipped`);
          skipped++;
        } else {
          errors.push(`${rowLabel} (${row.full_name}): ${error.message}`);
          failed++;
        }
      } else {
        // Create auth account so farmer can log in with default PIN
        const { data: su } = await supabase.auth.signUp({
          email: phoneToEmail(row.phone!),
          password: '654321',
          options: { data: { role: 'farmer', full_name: row.full_name, organisation_id: profile!.organisation_id } },
        });
        if (su?.user?.id) {
          await supabase.from('users').update({ must_change_password: true }).eq('id', su.user.id);
        }
        success++;
      }
    }
    setCsvUploading(false);
    const parts = [`${success} added`];
    if (skipped > 0) parts.push(`${skipped} skipped (duplicate)`);
    if (failed > 0)  parts.push(`${failed} failed`);
    setCsvMsg(`Import complete: ${parts.join(', ')}.`);
    if (errors.length > 0) setCsvError(errors.join('\n'));
    if (success > 0) loadFarmers();
  };

  const activeFilters = [filterProgram, filterCohort, filterEnrolled !== 'all'].filter(Boolean).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cropguard-forest">Farmers</h1>
          <p className="text-sm text-cropguard-slate mt-0.5">{loading ? '…' : `${farmers.length.toLocaleString()} farmers`}</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-cropguard-slate">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={clearAll}>Clear</Button>
              <Button size="sm" variant="outline" className="border-cropguard-mid text-cropguard-dark" onClick={openBulkAgentAssign}>
                <UserCog className="w-4 h-4 mr-2" /> Assign Agent
              </Button>
              <Button size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest" onClick={openEnroll}>
                <UserPlus className="w-4 h-4 mr-2" /> Enroll {selected.size}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
          </Button>
          <Button size="sm" className="bg-cropguard-dark hover:bg-cropguard-forest" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Farmer
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search by name, phone or national ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Program</Label>
            <Select
                value={filterProgram || '__none__'}
                onValueChange={v => setFilterProgram(v === '__none__' ? '' : v)}
              >
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cohort</Label>
            <Select
                value={filterCohort || '__none__'}
                onValueChange={v => setFilterCohort(v === '__none__' ? '' : v)}
                disabled={filteredCohorts.length === 0}
              >
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All cohorts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All cohorts</SelectItem>
                {filteredCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Enrollment</Label>
            <Select value={filterEnrolled} onValueChange={v => setFilterEnrolled(v as typeof filterEnrolled)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All farmers</SelectItem>
                <SelectItem value="enrolled">Enrolled only</SelectItem>
                <SelectItem value="unenrolled">Not enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(activeFilters > 0 || search) && (
          <div className="flex items-center gap-2 flex-wrap">
            {search && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                "{search}" <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch('')} />
              </span>
            )}
            {filterProgram && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {programs.find(p => p.id === filterProgram)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterProgram('')} />
              </span>
            )}
            {filterCohort && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {cohorts.find(c => c.id === filterCohort)?.name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterCohort('')} />
              </span>
            )}
            {filterEnrolled !== 'all' && (
              <span className="flex items-center gap-1 text-xs bg-cropguard-mint text-cropguard-dark px-2 py-0.5 rounded-full">
                {filterEnrolled === 'enrolled' ? 'Enrolled' : 'Not enrolled'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterEnrolled('all')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Select all bar */}
      {!loading && farmers.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => selected.size === farmers.length ? clearAll() : selectAll()}
            className="flex items-center gap-2 text-sm text-cropguard-dark hover:text-cropguard-forest"
          >
            <div className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
              selected.size === farmers.length && farmers.length > 0
                ? 'bg-cropguard-dark border-cropguard-dark'
                : 'border-gray-300'
            )}>
              {selected.size === farmers.length && farmers.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            {selected.size === farmers.length && farmers.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-cropguard-slate">{selected.size} of {farmers.length} selected</span>
          )}
        </div>
      )}

      {/* Farmer list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : farmers.length === 0 ? (
        <div className="text-center py-20 text-cropguard-slate">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-cropguard-forest">No farmers found</p>
          <p className="text-sm mt-1">Adjust filters or add a farmer.</p>
          <Button onClick={openAdd} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest">
            <Plus className="w-4 h-4 mr-2" /> Add Farmer
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="divide-y">
            {farmers.map(f => {
              const isSelected = selected.has(f.id);
              const enr = f.enrollment;
              const enrolledProg = enr ? programs.find(p => p.id === enr.program_id) : null;
              const enrolledCohort = enr ? cohorts.find(c => c.id === enr.cohort_id) : null;
              return (
                <div
                  key={f.id}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                      isSelected ? 'bg-cropguard-dark border-cropguard-dark' : 'border-gray-300'
                    )}
                    onClick={() => toggleSelect(f.id)}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full bg-cropguard-mint flex items-center justify-center shrink-0 cursor-pointer"
                    onClick={() => openEdit(f)}
                  >
                    {f.photo_url ? (
                      <img src={f.photo_url} alt={f.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-cropguard-dark font-bold text-sm">{f.full_name.charAt(0)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(f)}>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-cropguard-forest text-sm truncate">{f.full_name}</p>
                      {f.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-cropguard-slate mt-0.5">
                      {f.phone} &middot; {REGION_LABELS[f.region_code as RegionCode]} &middot; {CROP_LABELS[f.primary_crop as CropType]} &middot; {f.total_farm_size_ha} ha
                    </p>
                    {enr ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                          {enrolledProg?.name ?? 'Enrolled'}
                        </span>
                        {enrolledCohort && (
                          <span className="text-[10px] bg-cropguard-mint text-cropguard-dark rounded-full px-2 py-0.5">
                            {enrolledCohort.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-1 inline-block">Not enrolled</span>
                    )}
                  </div>

                  {/* Badges + actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {f.risk_category && (
                      <Badge className={`text-[10px] border-0 ${RISK_CATEGORY_COLORS[f.risk_category]}`}>
                        {RISK_CATEGORY_LABELS[f.risk_category]}
                      </Badge>
                    )}
                    {f.current_fri_score !== null && (
                      <span className="text-[11px] font-semibold text-cropguard-dark">FRI {f.current_fri_score}</span>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-cropguard-dark transition-colors"
                        title="Edit farmer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {enr && (
                        <button
                          onClick={() => openAgentAssign(f)}
                          className="p-1 rounded hover:bg-cropguard-mint text-gray-400 hover:text-cropguard-dark transition-colors"
                          title="Assign agent"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {enr && (
                        <button
                          onClick={() => openUnenroll(f)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Unenroll from program"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enroll Drawer */}
      <Drawer
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={`Enroll ${selected.size} Farmer${selected.size !== 1 ? 's' : ''}`}
      >
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
              Farmers already enrolled in the selected program will have their cohort updated.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program *</Label>
              <Select value={enrollProgram} onValueChange={setEnrollProgram}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort (optional)</Label>
              <Select
                value={enrollCohort || '__none__'}
                onValueChange={v => setEnrollCohort(v === '__none__' ? '' : v)}
                disabled={!enrollProgram}
              >
                <SelectTrigger><SelectValue placeholder={enrollProgram ? 'Select cohort' : 'Select program first'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No cohort</SelectItem>
                  {enrollCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {enrollMsg && (
              <div className={cn('rounded-lg px-4 py-3 text-sm',
                enrollMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                enrollMsg.type === 'conflict' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                'bg-red-50 text-red-700'
              )}>
                {enrollMsg.text}
              </div>
            )}
            {enrollMsg?.type !== 'success' ? (
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEnrollOpen(false)}>Cancel</Button>
                {enrollMsg?.type === 'conflict' ? (
                  <Button disabled={enrolling || !enrollProgram} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleEnroll(true)}>
                    {enrolling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enrolling…</> : 'Graduate & Re-enroll'}
                  </Button>
                ) : (
                  <Button disabled={enrolling || !enrollProgram} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => handleEnroll(false)}>
                    {enrolling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enrolling…</> : `Enroll ${selected.size}`}
                  </Button>
                )}
              </div>
            ) : (
              <Button className="w-full bg-cropguard-dark hover:bg-cropguard-forest" onClick={() => setEnrollOpen(false)}>Done</Button>
            )}
          </div>
      </Drawer>

      {/* Add Farmer Drawer */}
      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={addStep === 'form' ? 'Add New Farmer' : 'Enroll in Program'}
        width="max-w-lg"
      >
          {addStep === 'form' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name *</Label>
                  <Input placeholder="Ama Mensah" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone *</Label>
                  <Input placeholder="0241 234 567" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">National ID *</Label>
                  <Input placeholder="GHA-XXXXXXXXX-X" value={addForm.national_id} onChange={e => setAddForm(f => ({ ...f, national_id: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</Label>
                  <Input type="date" value={addForm.date_of_birth} onChange={e => setAddForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</Label>
                  <Select value={addForm.gender} onValueChange={v => setAddForm(f => ({ ...f, gender: v as Gender }))}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(GENDER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region *</Label>
                  <Select value={addForm.region_code} onValueChange={v => setAddForm(f => ({ ...f, region_code: v as RegionCode, district: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>{REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District *</Label>
                  {addForm.region_code && (DISTRICTS_BY_REGION[addForm.region_code] ?? []).length > 0 ? (
                    <Select value={addForm.district} onValueChange={v => setAddForm(f => ({ ...f, district: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>{(DISTRICTS_BY_REGION[addForm.region_code] ?? []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="District name" value={addForm.district} onChange={e => setAddForm(f => ({ ...f, district: e.target.value }))} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</Label>
                  <Input placeholder="Community" value={addForm.community} onChange={e => setAddForm(f => ({ ...f, community: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Crop *</Label>
                  <Select value={addForm.primary_crop} onValueChange={v => setAddForm(f => ({ ...f, primary_crop: v as CropType }))}>
                    <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                    <SelectContent>{CROP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Farm Size (ha)</Label>
                  <Input type="number" min="0.1" step="0.1" placeholder="2.5" value={addForm.total_farm_size_ha} onChange={e => setAddForm(f => ({ ...f, total_farm_size_ha: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Farmer Photo (optional)</Label>
                <input ref={addPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
                <div onClick={() => addPhotoRef.current?.click()} className={cn('border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex items-center gap-4', addPhotoUrl ? 'border-cropguard-green bg-cropguard-mint/30' : 'border-gray-200 hover:border-cropguard-mid')}>
                  {addPhotoLoading ? <Loader2 className="w-5 h-5 animate-spin text-cropguard-mid mx-auto" /> : addPhotoUrl ? (
                    <><img src={addPhotoUrl} alt="Farmer" className="w-12 h-12 rounded-full object-cover shrink-0" /><p className="text-xs text-cropguard-green font-medium">Photo uploaded — click to replace</p></>
                  ) : <div className="flex items-center gap-3 mx-auto"><Camera className="w-5 h-5 text-gray-300" /><p className="text-sm text-gray-400">Click to upload photo</p></div>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GPS Location (optional)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={addGpsAddress} placeholder="Click to capture GPS location" className="flex-1 bg-gray-50 text-xs" />
                  <button type="button" onClick={captureAddGPS} disabled={addGpsLoading} className="shrink-0 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {addGpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-cropguard-mid" />}
                  </button>
                </div>
              </div>
              <div className="bg-cropguard-mint/50 rounded-xl p-4 space-y-3 border border-cropguard-green/20">
                <h3 className="text-sm font-semibold text-cropguard-forest">Consent Statement</h3>
                <p className="text-xs text-cropguard-slate leading-relaxed">I confirm that the farmer has consented to their personal data being collected and stored by ASINYO CropGuard for the purpose of agricultural program management, insurance, and credit facilitation services.</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={addConsent} onChange={e => setAddConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-cropguard-dark" />
                  <span className="text-xs text-cropguard-dark font-medium">Farmer has given informed consent *</span>
                </label>
              </div>
              {addError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{addError}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button disabled={addSaving || !addConsent} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAddFarmer}>
                  {addSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save Farmer'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700 font-medium">Farmer added successfully! Enroll them in a program now (optional).</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program</Label>
                <Select value={addEnrollProgram || '__none__'} onValueChange={v => setAddEnrollProgram(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Skip enrollment" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">Skip enrollment</SelectItem>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {addEnrollProgram && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cohort (optional)</Label>
                  <Select value={addEnrollCohort || '__none__'} onValueChange={v => setAddEnrollCohort(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="No cohort" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">No cohort</SelectItem>{addEnrollCohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setAddOpen(false); loadFarmers(); }}>Skip</Button>
                <Button className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAddEnroll}>{addEnrollProgram ? 'Enroll & Done' : 'Done'}</Button>
              </div>
            </div>
          )}
      </Drawer>

      {/* Edit Farmer Drawer */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Farmer — ${editingFarmer?.full_name ?? ''}`}
        width="max-w-lg"
      >
          <div className="space-y-4">
            {editingFarmer && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-cropguard-slate bg-gray-50 rounded-lg p-3 mb-2">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{editingFarmer.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{editingFarmer.district}</span>
                <span className="flex items-center gap-1"><Sprout className="w-3 h-3" />{CROP_LABELS[editingFarmer.primary_crop as CropType]}</span>
                {editingFarmer.enrollment && (
                  <span className="flex items-center gap-1 col-span-2 text-emerald-600">Enrolled: {programs.find(p => p.id === editingFarmer.enrollment?.program_id)?.name ?? '—'}</span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name *</Label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone *</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">National ID *</Label><Input value={editForm.national_id} onChange={e => setEditForm(f => ({ ...f, national_id: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</Label><Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</Label>
                <Select value={editForm.gender} onValueChange={v => setEditForm(f => ({ ...f, gender: v as Gender }))}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent>{Object.entries(GENDER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region *</Label>
                <Select value={editForm.region_code} onValueChange={v => setEditForm(f => ({ ...f, region_code: v as RegionCode, district: '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District *</Label>
                {editForm.region_code && (DISTRICTS_BY_REGION[editForm.region_code] ?? []).length > 0 ? (
                  <Select value={editForm.district} onValueChange={v => setEditForm(f => ({ ...f, district: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(DISTRICTS_BY_REGION[editForm.region_code] ?? []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                ) : (<Input value={editForm.district} onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))} />)}
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</Label><Input value={editForm.community} onChange={e => setEditForm(f => ({ ...f, community: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Crop *</Label>
                <Select value={editForm.primary_crop} onValueChange={v => setEditForm(f => ({ ...f, primary_crop: v as CropType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CROP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Farm Size (ha)</Label><Input type="number" min="0.1" step="0.1" value={editForm.total_farm_size_ha} onChange={e => setEditForm(f => ({ ...f, total_farm_size_ha: e.target.value }))} /></div>
            </div>
            {editError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button disabled={editSaving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleEditSave}>
                {editSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Unenroll Drawer */}
      <Drawer open={unenrollOpen} onClose={() => setUnenrollOpen(false)} title="Unenroll Farmer">
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700">Unenroll from program?</p>
                <p className="text-xs text-amber-600 mt-1"><strong>{farmerToUnenroll?.full_name}</strong> will be withdrawn from <strong>{programs.find(p => p.id === farmerToUnenroll?.enrollment?.program_id)?.name}</strong>. Their data and scores will be preserved.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setUnenrollOpen(false)}>Cancel</Button>
              <Button disabled={unenrolling} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleUnenroll}>
                {unenrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserMinus className="w-4 h-4 mr-2" />Unenroll</>}
              </Button>
            </div>
          </div>
      </Drawer>

      {/* Per-Farmer Agent Assignment Drawer */}
      <Drawer
        open={agentAssignOpen}
        onClose={() => setAgentAssignOpen(false)}
        title="Assign Agent to Farmer"
        width="max-w-sm"
      >
        <div className="space-y-4 pt-2">
          {agentAssignFarmer && (
            <div className="bg-cropguard-mint rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-cropguard-forest">{agentAssignFarmer.full_name}</p>
              <p className="text-xs text-cropguard-slate mt-0.5">{agentAssignFarmer.phone}</p>
              {agentAssignFarmer.enrollment && (
                <p className="text-xs text-cropguard-slate mt-0.5">
                  {programs.find(p => p.id === agentAssignFarmer.enrollment?.program_id)?.name}
                  {agentAssignFarmer.enrollment?.cohort_id && ` · ${cohorts.find(c => c.id === agentAssignFarmer.enrollment?.cohort_id)?.name}`}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Agent</Label>
            <Select value={agentAssignId || '__none__'} onValueChange={v => setAgentAssignId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Remove assignment</SelectItem>
                {agentList.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {agentAssignMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              agentAssignMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}>
              {agentAssignMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setAgentAssignOpen(false)}>Cancel</Button>
            <Button disabled={agentAssignSaving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleAgentAssign}>
              {agentAssignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Bulk Agent Assignment Drawer */}
      <Drawer
        open={bulkAgentAssignOpen}
        onClose={() => setBulkAgentAssignOpen(false)}
        title={`Assign Agent — ${selected.size} Farmer${selected.size !== 1 ? 's' : ''}`}
        width="max-w-sm"
      >
        <div className="space-y-4 pt-2">
          <div className="bg-cropguard-mint rounded-lg px-4 py-3">
            <p className="text-xs text-cropguard-slate">
              {farmers.filter(f => selected.has(f.id) && f.enrollment).length} enrolled farmer{farmers.filter(f => selected.has(f.id) && f.enrollment).length !== 1 ? 's' : ''} will be updated.
              {farmers.filter(f => selected.has(f.id) && !f.enrollment).length > 0 && (
                <span className="block mt-0.5 text-amber-700">
                  {farmers.filter(f => selected.has(f.id) && !f.enrollment).length} unenrolled farmer{farmers.filter(f => selected.has(f.id) && !f.enrollment).length !== 1 ? 's' : ''} will be skipped.
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to Agent</Label>
            <Select value={bulkAgentAssignId || '__none__'} onValueChange={v => setBulkAgentAssignId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select agent…</SelectItem>
                {agentList.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bulkAgentAssignMsg && (
            <div className={cn('rounded-lg px-4 py-3 text-sm',
              bulkAgentAssignMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}>
              {bulkAgentAssignMsg}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBulkAgentAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkAgentAssignSaving || !bulkAgentAssignId}
              className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest"
              onClick={handleBulkAgentAssign}
            >
              {bulkAgentAssignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCog className="w-4 h-4 mr-2" />Assign</>}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* CSV Upload Drawer */}
      <Drawer
        open={csvOpen}
        onClose={() => { setCsvOpen(false); setCsvRows([]); setCsvError(''); setCsvMsg(''); }}
        title="Bulk Upload Farmers"
        width="max-w-2xl"
      >
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-700">CSV Format</p>
              <p className="text-xs text-blue-600 font-mono">{CSV_HEADERS.join(', ')}</p>
              <Button size="sm" variant="outline" className="mt-1" onClick={downloadCsvTemplate}><Download className="w-3.5 h-3.5 mr-2" /> Download Template</Button>
            </div>
            <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-cropguard-mid transition-colors" onClick={() => csvInputRef.current?.click()}>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
            </div>
            {csvError && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 space-y-0.5">{csvError.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-cropguard-forest">{csvRows.length} rows detected</p>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setCsvRows([]); if (csvInputRef.current) csvInputRef.current.value = ''; }}><X className="w-3 h-3 mr-1" /> Clear</Button>
                </div>
                <div className="border rounded-lg overflow-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b"><tr>{['FULL_NAME','PHONE','NATIONAL_ID','REGION','DISTRICT','CROP'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y">
                      {csvRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={cn('hover:bg-gray-50', (!row.full_name || !row.phone || !row.national_id || !row.region_code || !row.district || !row.primary_crop) && 'bg-red-50')}>
                          <td className="px-3 py-2 truncate max-w-24">{row.full_name || <span className="text-red-400">missing</span>}</td>
                          <td className="px-3 py-2">{row.phone || <span className="text-red-400">missing</span>}</td>
                          <td className="px-3 py-2">{row.national_id || <span className="text-red-400">missing</span>}</td>
                          <td className="px-3 py-2">{row.region_code || <span className="text-red-400">missing</span>}</td>
                          <td className="px-3 py-2">{row.district || <span className="text-red-400">missing</span>}</td>
                          <td className="px-3 py-2 text-gray-500">{row.primary_crop || <span className="text-red-400">missing</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 10 && <p className="text-xs text-gray-400 px-3 py-2">… and {csvRows.length - 10} more rows</p>}
                </div>
              </div>
            )}
            {csvMsg && <div className={cn('rounded-lg px-4 py-3 text-sm', csvMsg.includes('failed') || csvMsg.includes('skipped') ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{csvMsg}</div>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCsvOpen(false)}>Close</Button>
              <Button disabled={csvUploading || csvRows.length === 0} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest" onClick={handleCsvUpload}>
                {csvUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing…</> : <><Upload className="w-4 h-4 mr-2" />Import {csvRows.length} Farmers</>}
              </Button>
            </div>
          </div>
      </Drawer>
    </div>
  );
}
