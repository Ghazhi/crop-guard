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
  custom_prompt?:  string | null;
}

export interface SavedNorviReport {
  id:            string;
  content:       string;
  output_type:   NorviOutputType;
  week_number:   number;
  created_at:    string;
  custom_prompt: string | null;
  is_provisional: boolean;
}

// ── Trigger a fresh Norvi interpretation ─────────────────────────────────────

export async function triggerNorvi(params: {
  farmer_id:     string;
  week_number:   number;
  fri_score_id:  string;
  output_type:   NorviOutputType;
  custom_prompt?: string;
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
    .select('id,content,output_type,is_provisional,week_number,created_at,custom_prompt')
    .eq('farmer_id', params.farmer_id)
    .eq('week_number', params.week_number)
    .eq('output_type', params.output_type)
    .is('custom_prompt', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as NorviResult | null);
}

// ── Fetch all saved custom-prompt reports for a farmer ────────────────────────

export async function getSavedNorviReports(farmerId: string): Promise<SavedNorviReport[]> {
  const { data } = await (supabase.from('norvi_outputs') as any)
    .select('id,content,output_type,week_number,created_at,custom_prompt,is_provisional')
    .eq('farmer_id', farmerId)
    .not('custom_prompt', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as SavedNorviReport[]) ?? [];
}

// ── Delete a saved Norvi report ────────────────────────────────────────────────

export async function deleteSavedNorviReport(reportId: string): Promise<boolean> {
  const { error } = await (supabase.from('norvi_outputs') as any)
    .delete()
    .eq('id', reportId);
  return !error;
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

// ── Community / Cooperative AI insights ───────────────────────────────────────

export type CommunityInsightScope = 'community' | 'cooperative';

export interface CommunityInsightResult {
  id:         string;
  content:    string;
  scope:      CommunityInsightScope;
  scope_id:   string;
  created_at: string;
}

export async function getCachedCommunityInsight(params: {
  scope:    CommunityInsightScope;
  scope_id: string;
}): Promise<CommunityInsightResult | null> {
  const { data } = await (supabase.from('norvi_community_outputs') as any)
    .select('id,content,scope,scope_id,created_at')
    .eq('scope', params.scope)
    .eq('scope_id', params.scope_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CommunityInsightResult | null);
}

export async function triggerCommunityInsight(params: {
  scope:    CommunityInsightScope;
  scope_id: string;
  org_id:   string;
}): Promise<CommunityInsightResult | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/norvi-community-insight`;
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
  if (!json || !json.content) return null;
  return json as CommunityInsightResult;
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
