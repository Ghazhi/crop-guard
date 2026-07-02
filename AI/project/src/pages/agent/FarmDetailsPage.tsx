import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ChevronLeft, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { zodResolver } from '@/lib/form-resolver';
import { REGION_OPTIONS, CROP_OPTIONS } from '@/lib/constants';
import type { RegionCode, CropType } from '@/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  name:        z.string().min(2, 'Farm name required'),
  size_ha:     z.coerce.number().positive('Must be a positive number'),
  crop_type:   z.string().min(1, 'Select a crop type'),
  region_code: z.string().min(2, 'Select a region'),
  district:    z.string().min(2, 'District required'),
  community:   z.string().optional(),
  soil_type:   z.string().optional(),
  irrigation:  z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Label>
      {children}
      {error && <p className="text-xs text-cropguard-red">{error}</p>}
    </div>
  );
}

export default function FarmDetailsPage() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { irrigation: false },
  });

  const irrigation = watch('irrigation');

  const captureGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000 }
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!farmerId) return;
    setSaving(true);
    const { error } = await supabase.from('farm_details').insert({
      farmer_id:   farmerId,
      name:        data.name,
      size_ha:     data.size_ha,
      crop_type:   data.crop_type as CropType,
      region_code: data.region_code as RegionCode,
      district:    data.district,
      community:   data.community ?? '',
      latitude:    lat,
      longitude:   lng,
      soil_type:   data.soil_type ?? null,
      irrigation:  data.irrigation ?? false,
    });
    setSaving(false);
    if (!error) {
      navigate('/agent/farmers');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-cropguard-mint">
          <ChevronLeft className="w-5 h-5 text-cropguard-dark" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-cropguard-forest">Add Farm Details</h2>
          <p className="text-xs text-cropguard-slate">Record the farm plot information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Farm Name" error={errors.name?.message}>
          <Input placeholder="e.g. North Plot" {...register('name')} />
        </Field>

        <Field label="Farm Size (hectares)" error={errors.size_ha?.message}>
          <Input type="number" step="0.1" min="0.1" placeholder="e.g. 2.5" {...register('size_ha')} />
        </Field>

        <Field label="Crop Type" error={errors.crop_type?.message}>
          <Select onValueChange={v => setValue('crop_type', v)}>
            <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
            <SelectContent>
              {CROP_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Region" error={errors.region_code?.message}>
          <Select onValueChange={v => setValue('region_code', v)}>
            <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="District" error={errors.district?.message}>
          <Input placeholder="e.g. Kumasi Metro" {...register('district')} />
        </Field>

        <Field label="Community (optional)">
          <Input placeholder="e.g. Adum" {...register('community')} />
        </Field>

        <Field label="Soil Type (optional)">
          <Input placeholder="e.g. Loamy" {...register('soil_type')} />
        </Field>

        <Field label="GPS Coordinates (optional)">
          <div className="flex gap-2">
            <Input
              readOnly
              value={lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : ''}
              placeholder="Tap pin to capture location"
              className="flex-1 bg-gray-50 text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={captureGPS}
              disabled={gpsLoading}
              className="shrink-0"
            >
              {gpsLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <MapPin className={cn('w-4 h-4', lat ? 'text-cropguard-green' : 'text-cropguard-mid')} />}
            </Button>
          </div>
          {lat && (
            <p className="text-xs text-cropguard-green font-medium mt-1">Location captured</p>
          )}
        </Field>

        <div className="bg-cropguard-mint rounded-xl p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={irrigation}
              onChange={e => setValue('irrigation', e.target.checked)}
              className="w-4 h-4 accent-cropguard-dark"
            />
            <div>
              <p className="text-sm font-medium text-cropguard-forest">Irrigation Available</p>
              <p className="text-xs text-cropguard-slate">Does this farm have access to irrigation?</p>
            </div>
          </label>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-cropguard-dark hover:bg-cropguard-forest"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? 'Saving…' : 'Save Farm Details'}
        </Button>

        <button
          type="button"
          onClick={() => navigate('/agent/farmers')}
          className="w-full text-center text-xs text-cropguard-slate underline underline-offset-2 py-1"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
