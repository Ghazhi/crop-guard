import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NorviOutput } from '@/components/NorviOutput';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { NorviOutputType } from '@/lib/norvi';

export default function NorviPage() {
  const { profile } = useAuthStore();
  const [searchParams] = useSearchParams();

  const [farmers, setFarmers]       = useState<{ id: string; full_name: string }[]>([]);
  const [selectedFarmer, setFarmer] = useState(searchParams.get('farmer') ?? '');
  const [outputType, setType]       = useState<NorviOutputType>('agent_report');
  const [friScoreId, setFriScoreId] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState<number>(1);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: enrRaw } = await supabase
        .from('enrollments').select('farmer_id').eq('agent_id', profile.id).eq('status', 'active');
      const ids = ((enrRaw ?? []) as { farmer_id: string }[]).map(e => e.farmer_id);
      if (!ids.length) return;
      const { data: fRaw } = await supabase.from('farmers').select('id,full_name').in('id', ids);
      setFarmers((fRaw ?? []) as { id: string; full_name: string }[]);
    })();
  }, [profile]);

  const loadScore = useCallback(async (farmerId: string) => {
    const { data } = await (supabase.from('farmer_fri_scores') as any)
      .select('id,week_number')
      .eq('farmer_id', farmerId)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const score = data as { id: string; week_number: number } | null;
    if (score) { setFriScoreId(score.id); setWeekNumber(score.week_number); }
    else { setFriScoreId(null); }
  }, []);

  useEffect(() => {
    if (selectedFarmer) loadScore(selectedFarmer);
    else setFriScoreId(null);
  }, [selectedFarmer, loadScore]);

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-cropguard-mint rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-cropguard-forest" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Norvi AI</h1>
          <p className="text-xs text-gray-500">Contextual farm intelligence</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Farmer</p>
            <Select value={selectedFarmer} onValueChange={setFarmer}>
              <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
              <SelectContent>
                {farmers.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Output Type</p>
            <Select value={outputType} onValueChange={v => setType(v as NorviOutputType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="farmer_summary">Farmer Summary</SelectItem>
                <SelectItem value="agent_report">Agent Report</SelectItem>
                <SelectItem value="credit_brief">Credit Brief</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedFarmer && friScoreId ? (
        <NorviOutput
          farmerId={selectedFarmer}
          weekNumber={weekNumber}
          friScoreId={friScoreId}
          outputType={outputType}
          autoFetch
        />
      ) : selectedFarmer && !friScoreId ? (
        <Card className="border-dashed border-2 border-gray-200 shadow-none">
          <CardContent className="py-8 text-center text-gray-400 text-sm">
            No FRI scores yet. Complete a baseline assessment first.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
