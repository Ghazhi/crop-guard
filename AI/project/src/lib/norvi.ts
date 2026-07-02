// Norvi AI client wrappers — all Anthropic API calls are proxied through
// Supabase Edge Functions to keep the API key server-side.

import { supabase } from '@/lib/supabase';

export type NorviOutputType = 'farmer_summary' | 'agent_report' | 'credit_brief' | 'opportunity';

export interface NorviResult {
  id:             string;
  content:        string;
  output_type:    NorviOutputType;
  is_provisional: boolean;
  week_number:    number;
  created_at:     string;
}

// ── Trigger a fresh Norvi interpretation ─────────────────────────────────────

export async function triggerNorvi(params: {
  farmer_id:    string;
  week_number:  number;
  fri_score_id: string;
  output_type:  NorviOutputType;
}): Promise<NorviResult | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/norvi-interpret`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json as NorviResult;
}

// ── Fetch cached Norvi output ────────────────────────────────────────────────

export async function getCachedNorvi(params: {
  farmer_id:   string;
  week_number: number;
  output_type: NorviOutputType;
}): Promise<NorviResult | null> {
  const { data } = await (supabase.from('norvi_outputs') as any)
    .select('id,content,output_type,is_provisional,week_number,created_at')
    .eq('farmer_id', params.farmer_id)
    .eq('week_number', params.week_number)
    .eq('output_type', params.output_type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as NorviResult | null);
}

// ── Trigger FRI scoring via edge function ────────────────────────────────────

export async function scoreFRI(params: {
  farmer_id:    string;
  enrollment_id: string;
  week_number:  number;
  responses:    Record<string, Record<string, number>>;
  checkin_id?:  string;
  is_verified?: boolean;
}): Promise<{ total_score: number; zone: string; credit_score: number | null } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-fri`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) return null;
  return await res.json();
}

// ── Check eligibility via edge function ──────────────────────────────────────

export async function checkEligibility(farmerId: string): Promise<{
  eligible_count: number;
  results: Array<{
    rule_id:    string;
    rule_name:  string;
    eligible:   boolean;
    gap:        number | null;
    steps:      string[];
  }>;
} | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-eligibility`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ farmer_id: farmerId }),
  });

  if (!res.ok) return null;
  return await res.json();
}
