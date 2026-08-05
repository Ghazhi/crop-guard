import { useEffect, useState } from 'react';
import { MapPin, Sprout, Ruler, Droplets, Mountain, Loader2, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';

interface FarmRow {
  id: string;
  name: string | null;
  size_ha: number | null;
  crop_type: string | null;
  district: string | null;
  community: string | null;
  soil_type: string | null;
  irrigation: boolean | null;
  created_at: string | null;
}

interface FarmerRow {
  primary_crop: string | null;
  total_farm_size_ha: number | null;
  district: string | null;
  community: string | null;
  gps_address: string | null;
  years_farm_experience: number | null;
}

export default function FarmerFarmPage() {
  const profile = useAuthStore(s => s.profile);
  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [farmer, setFarmer] = useState<FarmerRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('farmers')
      .select('id, primary_crop, total_farm_size_ha, district, community, gps_address, years_farm_experience')
      .eq('user_id', profile.id).maybeSingle()
      .then(({ data: f }) => {
        if (!f) { setLoading(false); return; }
        setFarmer(f as FarmerRow);
        supabase.from('farm_details')
          .select('id, name, size_ha, crop_type, district, community, soil_type, irrigation, created_at')
          .eq('farmer_id', (f as any).id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setFarms((data as FarmRow[]) ?? []);
            setLoading(false);
          });
      });
  }, [profile]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-cropguard-mid animate-spin" />
      </div>
    );
  }

  const totalSize = farms.reduce((sum, f) => sum + (f.size_ha ?? 0), 0) || farmer?.total_farm_size_ha ?? 0;

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="pt-2">
        <h2 className="text-xl font-bold text-cropguard-forest">My Farm</h2>
        <p className="text-sm text-cropguard-slate">Farm details and plots</p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cropguard-mint rounded-lg flex items-center justify-center shrink-0">
              <Ruler className="w-4 h-4 text-cropguard-dark" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Total Size</p>
              <p className="text-sm font-bold text-cropguard-forest">{totalSize ? `${totalSize} ha` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
              <Sprout className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Main Crop</p>
              <p className="text-sm font-bold text-cropguard-forest capitalize">{farmer?.primary_crop ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Location</p>
              <p className="text-sm font-bold text-cropguard-forest">{farmer?.community ?? farmer?.district ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">Experience</p>
              <p className="text-sm font-bold text-cropguard-forest">{farmer?.years_farm_experience ? `${farmer.years_farm_experience} yrs` : '—'}</p>
            </div>
          </div>
        </div>
        {farmer?.gps_address && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pt-1 border-t border-gray-50">
            <MapPin className="w-3 h-3" />
            GPS: {farmer.gps_address}
          </div>
        )}
      </div>

      {/* Farm plots */}
      {farms.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-cropguard-slate uppercase tracking-wide">Farm Plots</p>
          {farms.map(farm => (
            <div key={farm.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-cropguard-forest">{farm.name ?? 'Unnamed plot'}</p>
                {farm.size_ha != null && (
                  <span className="text-[10px] font-semibold text-cropguard-slate bg-gray-100 px-2 py-0.5 rounded-full">
                    {farm.size_ha} ha
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {farm.crop_type && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-600 bg-cropguard-mint px-2 py-1 rounded-lg">
                    <Sprout className="w-3 h-3" /> {farm.crop_type}
                  </span>
                )}
                {farm.community && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-600 bg-blue-50 px-2 py-1 rounded-lg">
                    <MapPin className="w-3 h-3" /> {farm.community}
                  </span>
                )}
                {farm.soil_type && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-600 bg-amber-50 px-2 py-1 rounded-lg">
                    <Mountain className="w-3 h-3" /> {farm.soil_type}
                  </span>
                )}
                {farm.irrigation !== null && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-600 bg-sky-50 px-2 py-1 rounded-lg">
                    <Droplets className="w-3 h-3" /> {farm.irrigation ? 'Irrigated' : 'Rain-fed'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No farm plots recorded yet.</p>
          <p className="text-xs text-gray-400 mt-1">Your agent will add farm details during enrolment.</p>
        </div>
      )}
    </div>
  );
}
