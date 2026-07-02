import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit2, Trash2, AlertTriangle, Loader2, X,
  MapPin, Users, ChevronRight, Search, Navigation,
  Building2, Sprout, Upload, Image,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drawer } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { REGION_LABELS, REGION_OPTIONS, DISTRICTS_BY_REGION, CROP_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RegionCode } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const SOCIOECONOMIC_OPTIONS = [
  { value: 'rural',      label: 'Rural'      },
  { value: 'urban',      label: 'Urban'      },
  { value: 'peri_urban', label: 'Peri-urban' },
];

const INCOME_STREAM_OPTIONS = [
  { value: 'farming', label: 'Farming' },
  { value: 'trading', label: 'Trading' },
  { value: 'other',   label: 'Other (specify)' },
];

const SOCIAL_AMENITY_KEYS = [
  { key: 'schools',          label: 'Schools'               },
  { key: 'hospital_clinic',  label: 'Hospital / Clinic'     },
  { key: 'police_station',   label: 'Police Station'        },
  { key: 'portable_water',   label: 'Portable Water Source' },
  { key: 'financial_inst',   label: 'Financial Institution' },
  { key: 'good_road',        label: 'Good Road Network'     },
  { key: 'network_services', label: 'Network Services (MTN, Telecel)' },
];

const FARM_ANIMAL_OPTIONS = [
  'Cattle', 'Goats', 'Sheep', 'Pigs', 'Poultry (Chickens)',
  'Poultry (Turkeys)', 'Poultry (Ducks)', 'Rabbits', 'Donkeys', 'Other',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface AmenityData {
  exists:    boolean;
  quantity:  number | null;
  comment:   string;
  image_url: string | null;
}

interface Community {
  id:                   string;
  name:                 string;
  region_code:          string;
  district:             string;
  nearest_town:         string | null;
  socioeconomic_status: string | null;
  income_streams:       string[];
  income_streams_other: string | null;
  social_amenities:     Record<string, AmenityData>;
  gps_lat:              number | null;
  gps_lng:              number | null;
  leader_name:          string | null;
  leader_contact:       string | null;
  image_url:            string | null;
  created_at:           string;
}

interface Cooperative {
  id:              string;
  name:            string;
  community_id:    string | null;
  community_name:  string | null;
  member_count:    number;
  primary_crops:   string[];
  secondary_crops: string[];
  farm_animals:    string[];
  chairman_name:   string | null;
  secretary_name:  string | null;
  created_at:      string;
}

interface FarmerRow {
  id:        string;
  full_name: string;
  phone:     string;
}

// ── Empty forms ───────────────────────────────────────────────────────────────

const emptyCommunityForm = () => ({
  name:                 '',
  region_code:          '' as RegionCode | '',
  district:             '',
  nearest_town:         '',
  socioeconomic_status: '',
  income_streams:       [] as string[],
  income_streams_other: '',
  social_amenities:     Object.fromEntries(
    SOCIAL_AMENITY_KEYS.map(a => [a.key, { exists: false, quantity: null as number | null, comment: '', image_url: null as string | null }])
  ) as Record<string, AmenityData>,
  gps_lat:        null as number | null,
  gps_lng:        null as number | null,
  leader_name:    '',
  leader_contact: '',
  image_url:      null as string | null,
});

const emptyCoopForm = () => ({
  name:            '',
  community_id:    '',
  member_count:    '',
  primary_crops:   [] as string[],
  secondary_crops: [] as string[],
  farm_animals:    [] as string[],
  chairman_name:   '',
  secretary_name:  '',
});

// ── Image upload helper ───────────────────────────────────────────────────────

async function uploadImage(file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('community-images')
    .upload(path, file, { upsert: true });
  if (error || !data) return null;
  const { data: urlData } = supabase.storage.from('community-images').getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ── Image picker button ───────────────────────────────────────────────────────

function ImagePicker({
  value,
  onChange,
  label = 'Upload Image',
  compact = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const url = await uploadImage(file, path);
    setUploading(false);
    if (url) onChange(url);
    e.target.value = '';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {value ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Photo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={value} alt="Community" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-cropguard-mid flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Image className="w-6 h-6" />}
          <span className="text-xs font-medium">{uploading ? 'Uploading…' : label}</span>
        </button>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MultiCheck({
  options, value, onChange, columns = 2,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  columns?: number;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map(o => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="w-4 h-4 accent-cropguard-dark rounded"
          />
          <span className="text-sm text-gray-700">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function MultiSelect({
  options, value, onChange, max,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, v]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition-colors font-medium',
            value.includes(o.value)
              ? 'bg-cropguard-dark text-white border-cropguard-dark'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Community form drawer ─────────────────────────────────────────────────────

function CommunityForm({
  open, onClose, onSaved, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Community | null;
}) {
  const profile = useAuthStore(s => s.profile);
  const [form, setForm] = useState(emptyCommunityForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const mergedAmenities = Object.fromEntries(
        SOCIAL_AMENITY_KEYS.map(a => [
          a.key,
          { exists: false, quantity: null, comment: '', image_url: null, ...(editing.social_amenities?.[a.key] ?? {}) },
        ])
      );
      setForm({
        name:                 editing.name,
        region_code:          editing.region_code as RegionCode,
        district:             editing.district,
        nearest_town:         editing.nearest_town ?? '',
        socioeconomic_status: editing.socioeconomic_status ?? '',
        income_streams:       editing.income_streams ?? [],
        income_streams_other: editing.income_streams_other ?? '',
        social_amenities:     mergedAmenities,
        gps_lat:              editing.gps_lat,
        gps_lng:              editing.gps_lng,
        leader_name:          editing.leader_name ?? '',
        leader_contact:       editing.leader_contact ?? '',
        image_url:            editing.image_url ?? null,
      });
    } else {
      setForm(emptyCommunityForm());
    }
    setError('');
  }, [open, editing]);

  const captureGPS = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }));
        setGpsLoading(false);
      },
      () => { setError('Could not get location'); setGpsLoading(false); }
    );
  };

  const updateAmenity = (key: string, patch: Partial<AmenityData>) => {
    setForm(f => ({
      ...f,
      social_amenities: {
        ...f.social_amenities,
        [key]: { ...f.social_amenities[key], ...patch },
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.region_code || !form.district) {
      setError('Name, Region, and District are required.'); return;
    }
    setSaving(true); setError('');
    const payload = {
      organisation_id:      profile!.organisation_id,
      name:                 form.name.trim(),
      region_code:          form.region_code,
      district:             form.district,
      nearest_town:         form.nearest_town || null,
      socioeconomic_status: form.socioeconomic_status || null,
      income_streams:       form.income_streams,
      income_streams_other: form.income_streams.includes('other') ? form.income_streams_other || null : null,
      social_amenities:     form.social_amenities,
      gps_lat:              form.gps_lat,
      gps_lng:              form.gps_lng,
      leader_name:          form.leader_name || null,
      leader_contact:       form.leader_contact || null,
      image_url:            form.image_url,
      updated_at:           new Date().toISOString(),
    };
    if (editing) {
      await supabase.from('communities').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('communities').insert({ ...payload, created_by: profile!.id });
    }
    setSaving(false);
    onSaved();
  };

  const districts = form.region_code ? (DISTRICTS_BY_REGION[form.region_code as RegionCode] ?? []) : [];

  return (
    <Drawer open={open} onClose={onClose} title={editing ? 'Edit Community' : 'New Community'} width="max-w-2xl">
      <div className="space-y-5">
        {/* Community image */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community Photo</Label>
          <ImagePicker
            value={form.image_url}
            onChange={url => setForm(f => ({ ...f, image_url: url }))}
            label="Upload community photo"
          />
        </div>

        {/* Basic details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community Name *</Label>
            <Input placeholder="e.g. Akumadan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region *</Label>
            <Select
              value={form.region_code}
              onValueChange={v => setForm(f => ({ ...f, region_code: v as RegionCode, district: '' }))}
            >
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">District *</Label>
            <Select
              value={form.district}
              onValueChange={v => setForm(f => ({ ...f, district: v }))}
              disabled={!form.region_code}
            >
              <SelectTrigger><SelectValue placeholder={form.region_code ? 'Select district' : 'Select region first'} /></SelectTrigger>
              <SelectContent>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nearest Town</Label>
            <Input placeholder="e.g. Techiman" value={form.nearest_town} onChange={e => setForm(f => ({ ...f, nearest_town: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Socioeconomic Status</Label>
            <Select value={form.socioeconomic_status} onValueChange={v => setForm(f => ({ ...f, socioeconomic_status: v }))}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {SOCIOECONOMIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Income streams */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Major Income Streams</Label>
          <MultiCheck options={INCOME_STREAM_OPTIONS} value={form.income_streams} onChange={v => setForm(f => ({ ...f, income_streams: v }))} />
          {form.income_streams.includes('other') && (
            <Input placeholder="Specify other income streams…" value={form.income_streams_other} onChange={e => setForm(f => ({ ...f, income_streams_other: e.target.value }))} className="mt-2" />
          )}
        </div>

        {/* Social amenities */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Social Amenities</Label>
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {SOCIAL_AMENITY_KEYS.map(({ key, label }) => {
              const am = form.social_amenities[key] ?? { exists: false, quantity: null, comment: '', image_url: null };
              return (
                <div key={key} className="p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateAmenity(key, { exists: false })}
                        className={cn('px-3 py-1 text-xs font-semibold rounded-full border transition-colors', !am.exists ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100')}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAmenity(key, { exists: true })}
                        className={cn('px-3 py-1 text-xs font-semibold rounded-full border transition-colors', am.exists ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100')}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                  {am.exists && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-gray-400 uppercase tracking-wide">Quantity</Label>
                          <Input
                            type="number" min="1" placeholder="e.g. 2" className="h-7 text-xs mt-0.5"
                            value={am.quantity ?? ''}
                            onChange={e => updateAmenity(key, { quantity: e.target.value ? Number(e.target.value) : null })}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-400 uppercase tracking-wide">Comment</Label>
                          <Input
                            placeholder="Optional note" className="h-7 text-xs mt-0.5"
                            value={am.comment}
                            onChange={e => updateAmenity(key, { comment: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0">Photo</Label>
                        <ImagePicker
                          value={am.image_url ?? null}
                          onChange={url => updateAmenity(key, { image_url: url })}
                          compact
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* GPS */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GPS Location</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={captureGPS} disabled={gpsLoading} className="shrink-0">
              {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Navigation className="w-3.5 h-3.5 mr-1.5" />}
              Capture GPS
            </Button>
            {form.gps_lat != null && (
              <p className="text-xs text-gray-600 font-medium">
                {form.gps_lat.toFixed(5)}, {form.gps_lng?.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        {/* Leader */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community Leader Name</Label>
            <Input placeholder="Chief or other leader" value={form.leader_name} onChange={e => setForm(f => ({ ...f, leader_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leader Contact</Label>
            <Input placeholder="+233 …" value={form.leader_contact} onChange={e => setForm(f => ({ ...f, leader_contact: e.target.value }))} />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest text-white" onClick={handleSave}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editing ? 'Save Changes' : 'Create Community'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ── Cooperative form drawer ───────────────────────────────────────────────────

function CoopForm({
  open, onClose, onSaved, editing, communities,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Cooperative | null;
  communities: Community[];
}) {
  const profile = useAuthStore(s => s.profile);
  const [form, setForm] = useState(emptyCoopForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name:            editing.name,
        community_id:    editing.community_id ?? '',
        member_count:    String(editing.member_count),
        primary_crops:   editing.primary_crops ?? [],
        secondary_crops: editing.secondary_crops ?? [],
        farm_animals:    editing.farm_animals ?? [],
        chairman_name:   editing.chairman_name ?? '',
        secretary_name:  editing.secretary_name ?? '',
      });
    } else {
      setForm(emptyCoopForm());
    }
    setError('');
  }, [open, editing]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = {
      organisation_id: profile!.organisation_id,
      name:            form.name.trim(),
      community_id:    form.community_id || null,
      member_count:    parseInt(form.member_count) || 0,
      primary_crops:   form.primary_crops,
      secondary_crops: form.secondary_crops,
      farm_animals:    form.farm_animals,
      chairman_name:   form.chairman_name || null,
      secretary_name:  form.secretary_name || null,
      updated_at:      new Date().toISOString(),
    };
    if (editing) {
      await supabase.from('cooperatives').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('cooperatives').insert({ ...payload, created_by: profile!.id });
    }
    setSaving(false);
    onSaved();
  };

  const cropOpts = CROP_OPTIONS.filter(c => c.value !== 'other');

  return (
    <Drawer open={open} onClose={onClose} title={editing ? 'Edit Cooperative' : 'New Cooperative / Farmer Group'} width="max-w-xl">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group / Cooperative Name *</Label>
          <Input placeholder="e.g. Akumadan Women Farmers Group" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</Label>
          <Select value={form.community_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, community_id: v === '__none__' ? '' : v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select community (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No community</SelectItem>
              {communities.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  <span className="text-gray-400 ml-1.5 text-xs">· {REGION_LABELS[c.region_code as RegionCode] ?? c.region_code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Number of Group Members</Label>
          <Input type="number" min="1" placeholder="e.g. 25" value={form.member_count} onChange={e => setForm(f => ({ ...f, member_count: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Crops (up to 2)</Label>
          <MultiSelect options={cropOpts} value={form.primary_crops} onChange={v => setForm(f => ({ ...f, primary_crops: v }))} max={2} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secondary Crops (up to 2)</Label>
          <MultiSelect options={cropOpts} value={form.secondary_crops} onChange={v => setForm(f => ({ ...f, secondary_crops: v }))} max={2} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Farm Animals</Label>
          <MultiSelect
            options={FARM_ANIMAL_OPTIONS.map(a => ({ value: a, label: a }))}
            value={form.farm_animals}
            onChange={v => setForm(f => ({ ...f, farm_animals: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chairman Name</Label>
            <Input placeholder="Full name" value={form.chairman_name} onChange={e => setForm(f => ({ ...f, chairman_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secretary Name</Label>
            <Input placeholder="Full name" value={form.secretary_name} onChange={e => setForm(f => ({ ...f, secretary_name: e.target.value }))} />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} className="flex-1 bg-cropguard-dark hover:bg-cropguard-forest text-white" onClick={handleSave}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editing ? 'Save Changes' : 'Create Cooperative'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ── Community detail drawer ───────────────────────────────────────────────────

function CommunityDetailDrawer({
  community, onClose, onEdit,
}: {
  community: Community | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!community) return;
    setLoading(true);
    supabase
      .from('farmers')
      .select('id, full_name, phone')
      .eq('community_id', community.id)
      .order('full_name')
      .then(({ data }) => { setFarmers(data ?? []); setLoading(false); });
  }, [community?.id]);

  const presentAmenities = community
    ? SOCIAL_AMENITY_KEYS.filter(a => community.social_amenities?.[a.key]?.exists)
    : [];

  return (
    <Drawer
      open={!!community}
      onClose={onClose}
      title={community?.name ?? ''}
      subtitle={community ? `${REGION_LABELS[community.region_code as RegionCode] ?? community.region_code} · ${community.district}` : undefined}
      width="max-w-2xl"
    >
      {community && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onEdit}>
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>
          </div>

          {/* Community photo */}
          {community.image_url && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <img src={community.image_url} alt={community.name} className="w-full h-48 object-cover" />
            </div>
          )}

          {/* Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Nearest Town',       value: community.nearest_town ?? '—' },
              { label: 'Socioeconomic',       value: SOCIOECONOMIC_OPTIONS.find(o => o.value === community.socioeconomic_status)?.label ?? '—' },
              { label: 'Community Leader',    value: community.leader_name ?? '—' },
              { label: 'Leader Contact',      value: community.leader_contact ?? '—' },
              { label: 'GPS',                 value: community.gps_lat != null ? `${community.gps_lat.toFixed(4)}, ${community.gps_lng?.toFixed(4)}` : '—' },
              { label: 'Farmers Linked',      value: loading ? '…' : String(farmers.length) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Income streams */}
          {(community.income_streams ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Income Streams</p>
              <div className="flex flex-wrap gap-2">
                {community.income_streams.map(s => (
                  <span key={s} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium capitalize">
                    {s === 'other' && community.income_streams_other ? community.income_streams_other : s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social amenities */}
          {presentAmenities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Social Amenities Present</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {presentAmenities.map(({ key, label }) => {
                  const am = community.social_amenities[key];
                  return (
                    <div key={key} className="bg-emerald-50 rounded-lg overflow-hidden">
                      {am?.image_url && (
                        <img src={am.image_url} alt={label} className="w-full h-24 object-cover" />
                      )}
                      <div className="flex items-start gap-2 p-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-800">{label}</p>
                          {am?.quantity != null && <p className="text-[11px] text-emerald-600">Qty: {am.quantity}</p>}
                          {am?.comment && <p className="text-[11px] text-gray-500 italic">{am.comment}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Farmers in community */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Farmers in Community ({loading ? '…' : farmers.length})
            </p>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : farmers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No farmers linked to this community yet.</p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {farmers.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-emerald-700 text-xs font-bold">{f.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.full_name}</p>
                      <p className="text-xs text-gray-400">{f.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ── Cooperative detail drawer ─────────────────────────────────────────────────

function CoopDetailDrawer({
  coop, onClose, onEdit,
}: {
  coop: Cooperative | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coop) return;
    setLoading(true);
    supabase
      .from('cooperative_farmers')
      .select('farmer:farmers(id, full_name, phone)')
      .eq('cooperative_id', coop.id)
      .then(({ data }) => {
        setFarmers((data ?? []).map((r: any) => r.farmer).filter(Boolean));
        setLoading(false);
      });
  }, [coop?.id]);

  const cropLabel = (v: string) => CROP_OPTIONS.find(c => c.value === v)?.label ?? v;

  return (
    <Drawer
      open={!!coop}
      onClose={onClose}
      title={coop?.name ?? ''}
      subtitle={coop?.community_name ?? undefined}
      width="max-w-xl"
    >
      {coop && (
        <div className="space-y-5">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onEdit}>
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Members',   value: String(coop.member_count) },
              { label: 'Chairman',  value: coop.chairman_name ?? '—' },
              { label: 'Secretary', value: coop.secretary_name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {(coop.primary_crops ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Primary Crops</p>
              <div className="flex flex-wrap gap-2">
                {coop.primary_crops.map(c => <span key={c} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">{cropLabel(c)}</span>)}
              </div>
            </div>
          )}

          {(coop.secondary_crops ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Secondary Crops</p>
              <div className="flex flex-wrap gap-2">
                {coop.secondary_crops.map(c => <span key={c} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{cropLabel(c)}</span>)}
              </div>
            </div>
          )}

          {(coop.farm_animals ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Farm Animals</p>
              <div className="flex flex-wrap gap-2">
                {coop.farm_animals.map(a => <span key={a} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-medium">{a}</span>)}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Farmers in Cooperative ({loading ? '…' : farmers.length})
            </p>
            {loading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : farmers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No farmers linked yet.</p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {farmers.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 text-xs font-bold">{f.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.full_name}</p>
                      <p className="text-xs text-gray-400">{f.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({
  open, name, onClose, onConfirm,
}: {
  open: boolean; name: string; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => { setDeleting(true); await onConfirm(); setDeleting(false); };
  return (
    <Drawer open={open} onClose={onClose} title="Confirm Delete">
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-red-50 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">Delete <strong>{name}</strong>? This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handle}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" />Delete</>}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CommunityProfilingPage() {
  const profile = useAuthStore(s => s.profile);
  const [tab, setTab] = useState<'community' | 'cooperative'>('community');

  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [commLoading,  setCommLoading]  = useState(true);
  const [commSearch,   setCommSearch]   = useState('');
  const [commFormOpen, setCommFormOpen] = useState(false);
  const [editComm,     setEditComm]     = useState<Community | null>(null);
  const [detailComm,   setDetailComm]   = useState<Community | null>(null);
  const [deleteComm,   setDeleteComm]   = useState<Community | null>(null);

  const [coops,        setCoops]        = useState<Cooperative[]>([]);
  const [coopLoading,  setCoopLoading]  = useState(true);
  const [coopSearch,   setCoopSearch]   = useState('');
  const [coopFormOpen, setCoopFormOpen] = useState(false);
  const [editCoop,     setEditCoop]     = useState<Cooperative | null>(null);
  const [detailCoop,   setDetailCoop]   = useState<Cooperative | null>(null);
  const [deleteCoop,   setDeleteCoop]   = useState<Cooperative | null>(null);

  const loadCommunities = useCallback(async () => {
    if (!profile) return;
    setCommLoading(true);
    const { data } = await supabase
      .from('communities')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name');
    setCommunities((data ?? []) as Community[]);
    setCommLoading(false);
  }, [profile]);

  const loadCoops = useCallback(async () => {
    if (!profile) return;
    setCoopLoading(true);
    const { data } = await supabase
      .from('cooperatives')
      .select('*, community:communities(name)')
      .eq('organisation_id', profile.organisation_id)
      .order('name');
    setCoops((data ?? []).map((c: any) => ({ ...c, community_name: c.community?.name ?? null })) as Cooperative[]);
    setCoopLoading(false);
  }, [profile]);

  useEffect(() => { loadCommunities(); }, [loadCommunities]);
  useEffect(() => { loadCoops(); }, [loadCoops]);

  const visibleComms = communities.filter(c =>
    !commSearch.trim() || c.name.toLowerCase().includes(commSearch.toLowerCase()) ||
    c.district.toLowerCase().includes(commSearch.toLowerCase())
  );

  const visibleCoops = coops.filter(c =>
    !coopSearch.trim() || c.name.toLowerCase().includes(coopSearch.toLowerCase()) ||
    (c.community_name ?? '').toLowerCase().includes(coopSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Community Profiling</h1>
        <p className="text-sm text-gray-500 mt-1">Manage community profiles and farmer cooperative/group registrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['community', 'cooperative'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'community' ? <MapPin className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
            {t === 'community' ? 'Communities' : 'Cooperatives'}
          </button>
        ))}
      </div>

      {/* ── Communities tab ── */}
      {tab === 'community' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search communities…" value={commSearch} onChange={e => setCommSearch(e.target.value)} className="pl-9" />
            </div>
            <Button
              onClick={() => { setEditComm(null); setCommFormOpen(true); }}
              className="bg-cropguard-dark hover:bg-cropguard-forest text-white shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" /> New Community
            </Button>
          </div>

          {commLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : visibleComms.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No communities yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your first community profile to get started.</p>
              <Button onClick={() => { setEditComm(null); setCommFormOpen(true); }} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Community
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleComms.map(c => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setDetailComm(c)}
                >
                  {/* Community image or placeholder */}
                  {c.image_url ? (
                    <div className="h-32 overflow-hidden">
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-emerald-300" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          onClick={e => { e.stopPropagation(); setEditComm(c); setCommFormOpen(true); }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                          onClick={e => { e.stopPropagation(); setDeleteComm(c); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {REGION_LABELS[c.region_code as RegionCode] ?? c.region_code} · {c.district}
                    </p>
                    {c.socioeconomic_status && (
                      <span className="inline-block mt-2 text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                        {c.socioeconomic_status.replace('_', '-')}
                      </span>
                    )}
                    {c.leader_name && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        Leader: <span className="font-medium">{c.leader_name}</span>
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {(c.income_streams ?? []).slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">{s}</span>
                        ))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cooperatives tab ── */}
      {tab === 'cooperative' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search cooperatives…" value={coopSearch} onChange={e => setCoopSearch(e.target.value)} className="pl-9" />
            </div>
            <Button
              onClick={() => { setEditCoop(null); setCoopFormOpen(true); }}
              className="bg-cropguard-dark hover:bg-cropguard-forest text-white shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" /> New Cooperative
            </Button>
          </div>

          {coopLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : visibleCoops.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No cooperatives yet</p>
              <p className="text-sm text-gray-400 mt-1">Register your first farmer group or cooperative.</p>
              <Button onClick={() => { setEditCoop(null); setCoopFormOpen(true); }} className="mt-4 bg-cropguard-dark hover:bg-cropguard-forest text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Cooperative
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCoops.map(coop => (
                <div
                  key={coop.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setDetailCoop(coop)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Sprout className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        onClick={e => { e.stopPropagation(); setEditCoop(coop); setCoopFormOpen(true); }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        onClick={e => { e.stopPropagation(); setDeleteCoop(coop); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{coop.name}</p>
                  {coop.community_name && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{coop.community_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    <Users className="w-3 h-3 inline mr-1" />{coop.member_count} members
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(coop.primary_crops ?? []).map(c => (
                      <span key={c} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium capitalize">
                        {CROP_OPTIONS.find(o => o.value === c)?.label ?? c}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate">
                      {coop.chairman_name ? `Chair: ${coop.chairman_name}` : 'No chairman set'}
                    </p>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Community form ── */}
      <CommunityForm
        open={commFormOpen}
        onClose={() => { setCommFormOpen(false); setEditComm(null); }}
        onSaved={() => { setCommFormOpen(false); setEditComm(null); loadCommunities(); }}
        editing={editComm}
      />

      {/* ── Cooperative form ── */}
      <CoopForm
        open={coopFormOpen}
        onClose={() => { setCoopFormOpen(false); setEditCoop(null); }}
        onSaved={() => { setCoopFormOpen(false); setEditCoop(null); loadCoops(); }}
        editing={editCoop}
        communities={communities}
      />

      {/* ── Community detail drawer ── */}
      <CommunityDetailDrawer
        community={detailComm}
        onClose={() => setDetailComm(null)}
        onEdit={() => { setEditComm(detailComm); setDetailComm(null); setCommFormOpen(true); }}
      />

      {/* ── Cooperative detail drawer ── */}
      <CoopDetailDrawer
        coop={detailCoop}
        onClose={() => setDetailCoop(null)}
        onEdit={() => { setEditCoop(detailCoop); setDetailCoop(null); setCoopFormOpen(true); }}
      />

      {/* ── Delete community ── */}
      <DeleteConfirm
        open={!!deleteComm}
        name={deleteComm?.name ?? ''}
        onClose={() => setDeleteComm(null)}
        onConfirm={async () => {
          if (deleteComm) await supabase.from('communities').delete().eq('id', deleteComm.id);
          setDeleteComm(null);
          loadCommunities();
        }}
      />

      {/* ── Delete cooperative ── */}
      <DeleteConfirm
        open={!!deleteCoop}
        name={deleteCoop?.name ?? ''}
        onClose={() => setDeleteCoop(null)}
        onConfirm={async () => {
          if (deleteCoop) await supabase.from('cooperatives').delete().eq('id', deleteCoop.id);
          setDeleteCoop(null);
          loadCoops();
        }}
      />
    </div>
  );
}
