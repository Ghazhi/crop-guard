import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type OutputType = "farmer_summary" | "agent_report" | "credit_brief" | "opportunity";

const MAX_TOKENS: Record<OutputType, number> = {
  farmer_summary: 300,
  agent_report:   400,
  credit_brief:   600,
  opportunity:    250,
};

interface ScoreContext {
  farmer_name:    string;
  week_number:    number;
  total_score:    number;
  zone:           string;
  p1_score:       number;
  p2_score:       number;
  p3_score:       number;
  p4_score:       number;
  eci_score:      number;
  credit_score:   number | null;
  season_average: number | null;
  is_provisional: boolean;
  risk_flags:     string[];
}

// ── §7.2 Prompt Templates ────────────────────────────────────────────────────

function buildPrompt(type: OutputType, ctx: ScoreContext): string {
  const scoreStatus = ctx.is_provisional ? "provisional (pending verification)" : "verified";
  const flags = ctx.risk_flags.length > 0
    ? `\nActive risk flags: ${ctx.risk_flags.join("; ")}`
    : "";

  // §7.2.1 Farmer-facing summary — 3 sentences, plain language, encouraging
  if (type === "farmer_summary") {
    return `You are Norvi, a friendly farm advisor AI helping smallholder farmers in Ghana improve their resilience and access to finance. Write exactly 3 short, encouraging sentences addressed directly to ${ctx.farmer_name} (use "you/your"). Be specific about their scores and zone. Use plain language — no jargon. Focus on what they are doing well and one clear next step.

Context:
Week ${ctx.week_number} FRI Score: ${ctx.total_score}/100 (${ctx.zone}, ${scoreStatus})
Pillar scores — Farm Management: ${ctx.p1_score}/30, Climate Resilience: ${ctx.p2_score}/30, Economic Resilience: ${ctx.p3_score}/20, Welfare: ${ctx.p4_score}/20${ctx.season_average !== null ? `\nSeason average: ${ctx.season_average}/100` : ""}${flags}

Write exactly 3 sentences. No greeting, no sign-off, no bullet points.`;
  }

  // §7.2.2 Agent guidance report — 3-4 bullet points, actionable, field-focused
  if (type === "agent_report") {
    return `You are Norvi, an AI assistant for agricultural field agents conducting on-farm assessments. Write a concise field report with 3 to 4 bullet points for the agent visiting ${ctx.farmer_name}. Each bullet must be specific, actionable, and grounded in the scores. Include at least one observation about pillar weaknesses and one recommended follow-up action.

Context:
Farmer: ${ctx.farmer_name}
Week ${ctx.week_number} FRI Score: ${ctx.total_score}/100 (${ctx.zone}, ${scoreStatus})
Pillar scores — P1 Farm Mgmt: ${ctx.p1_score}/30 | P2 Climate: ${ctx.p2_score}/30 | P3 Economic: ${ctx.p3_score}/20 | P4 Welfare: ${ctx.p4_score}/20 | ECI: ${ctx.eci_score}${ctx.season_average !== null ? `\nSeason average: ${ctx.season_average}/100` : ""}${flags}

Output exactly 3–4 bullet points, one per line, starting with a dash (-). No header, no footer, no introduction.`;
  }

  // §7.2.3 Credit officer brief — 3 paragraphs, objective, professional
  if (type === "credit_brief") {
    return `You are Norvi, a credit analysis AI for an agricultural finance institution in Ghana. Write a structured credit assessment brief in exactly 3 paragraphs:
1. Score summary and zone context — what the FRI indicates about this farmer's overall resilience posture
2. Key risk factors — identify pillar weaknesses, active risk flags, and any concerns that may affect creditworthiness
3. Credit recommendation — state whether credit is recommended, any conditions or mitigants, and a suggested next review point

Farmer: ${ctx.farmer_name}
Week ${ctx.week_number} FRI Score: ${ctx.total_score}/100 (${ctx.zone}, ${scoreStatus})
Credit Score: ${ctx.credit_score !== null ? ctx.credit_score : "Not computed"}
Pillar scores — P1 Farm Mgmt: ${ctx.p1_score}/30 | P2 Climate: ${ctx.p2_score}/30 | P3 Economic: ${ctx.p3_score}/20 | P4 Welfare: ${ctx.p4_score}/20 | ECI: ${ctx.eci_score}${ctx.season_average !== null ? `\nSeason average: ${ctx.season_average}/100` : ""}${flags}

Write exactly 3 paragraphs separated by a blank line. Professional tone. No headings or bullet points.`;
  }

  // §7.2.4 Opportunity eligibility — 2 sentences, farmer-facing, motivating
  return `You are Norvi, an agricultural support AI that helps farmers in Ghana understand their eligibility for financial and technical opportunities. Write exactly 2 sentences for ${ctx.farmer_name} explaining what opportunities they are close to qualifying for based on their FRI score, and what specific action would most quickly improve their eligibility. Be encouraging and specific. Use simple language.

Context:
FRI Score: ${ctx.total_score}/100 (${ctx.zone}, ${scoreStatus})
Pillar scores — Farm Management: ${ctx.p1_score}/30, Climate Resilience: ${ctx.p2_score}/30, Economic Resilience: ${ctx.p3_score}/20, Welfare: ${ctx.p4_score}/20${flags}

Write exactly 2 sentences. No greeting, no sign-off.`;
}

async function detectRiskFlags(
  supabase: ReturnType<typeof createClient>,
  farmerId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("risk_flags")
    .select("flag_type,description")
    .eq("farmer_id", farmerId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(5);

  return ((data ?? []) as { flag_type: string; description: string }[])
    .map(f => `${f.flag_type}: ${f.description}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json() as {
      farmer_id:    string;
      week_number:  number;
      fri_score_id: string;
      output_type:  OutputType;
    };
    const { farmer_id, week_number, fri_score_id, output_type } = body;

    if (!farmer_id || week_number == null || !fri_score_id || !output_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: check for existing output in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("norvi_outputs")
      .select("id,content,output_type,is_provisional,week_number,created_at")
      .eq("farmer_id", farmer_id)
      .eq("week_number", week_number)
      .eq("output_type", output_type)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load farmer + FRI score data in parallel
    const [{ data: farmerRaw }, { data: scoreRaw }, enrollRaw] = await Promise.all([
      supabase.from("farmers").select("full_name").eq("id", farmer_id).maybeSingle(),
      supabase.from("farmer_fri_scores")
        .select("total_score,p1_score,p2_score,p3_score,p4_score,eci_score,credit_score,season_average,zone,is_provisional")
        .eq("id", fri_score_id).maybeSingle(),
      supabase.from("enrollments").select("id").eq("farmer_id", farmer_id).eq("status", "active").limit(1),
    ]);

    const farmer = farmerRaw as { full_name: string } | null;
    const score  = scoreRaw as {
      total_score: number; p1_score: number; p2_score: number; p3_score: number;
      p4_score: number; eci_score: number; credit_score: number | null;
      season_average: number | null; zone: string; is_provisional: boolean;
    } | null;

    if (!farmer || !score) {
      return new Response(JSON.stringify({ error: "Farmer or score not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrList = ((enrollRaw as any)?.data ?? []) as { id: string }[];
    const enrollmentId = enrList[0]?.id ?? null;

    const riskFlags = await detectRiskFlags(supabase, farmer_id);

    const prompt = buildPrompt(output_type, {
      farmer_name:    farmer.full_name,
      week_number,
      total_score:    score.total_score,
      zone:           score.zone,
      p1_score:       score.p1_score,
      p2_score:       score.p2_score,
      p3_score:       score.p3_score,
      p4_score:       score.p4_score,
      eci_score:      score.eci_score,
      credit_score:   score.credit_score,
      season_average: score.season_average,
      is_provisional: score.is_provisional,
      risk_flags:     riskFlags,
    });

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: MAX_TOKENS[output_type],
      messages:   [{ role: "user", content: prompt }],
    });

    const content = (message.content[0] as { type: string; text: string }).text.trim();

    const { data: saved } = await supabase
      .from("norvi_outputs")
      .insert({
        farmer_id,
        enrollment_id:  enrollmentId,
        fri_score_id,
        week_number,
        output_type,
        content,
        is_provisional: score.is_provisional,
      })
      .select("id,content,output_type,is_provisional,week_number,created_at")
      .single();

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
