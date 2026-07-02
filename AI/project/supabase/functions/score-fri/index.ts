import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── §5.3 Pillar weights ───────────────────────────────────────────────────────
const PILLAR_WEIGHTS = { P1: 0.30, P2: 0.30, P3: 0.20, P4: 0.20 };
const CREDIT_MIN = 300;
const CREDIT_MAX = 850;

// ── §5.3 Weekly activities (18 total) ────────────────────────────────────────
const P1_ACTIVITIES = [
  "farming_experience", "weed_management", "proper_planting",
  "fertilizer_use", "pest_disease",
];
const P2_ACTIVITIES = [
  "mulching", "composting", "crop_rotation",
  "water_harvesting", "conservation_till",
];
const P3_ACTIVITIES = [
  "attends_training", "follows_agronomist",
  "cooperative_visits", "cooperative_member",
];
const P4_ACTIVITIES = [
  "repayment_history", "savings_habit",
  "additional_income", "offtaker_confirmed",
];

// ── §5.2 Binary activity scoring ─────────────────────────────────────────────
type FarmerResponse = "yes" | "partial" | "no";
type AgentVerification = "verified" | "not_verified" | "under_review";

function activityScoreValue(
  farmerResponse: FarmerResponse,
  agentVerification: AgentVerification,
): number {
  if (agentVerification !== "verified") return 0;
  if (farmerResponse === "yes") return 1.0;
  if (farmerResponse === "partial") return 0.5;
  return 0;
}

// ── §5.1 Pillar score ─────────────────────────────────────────────────────────
function calcPillarScore(
  activities: string[],
  farmerResponses: Record<string, FarmerResponse>,
  agentVerifications: Record<string, AgentVerification>,
  weight: number,
  excludeUnderReview = true,
): number {
  let sum = 0;
  let applicable = 0;
  for (const key of activities) {
    const fr = farmerResponses[key] ?? "no";
    const av = agentVerifications[key] ?? "not_verified";
    if (excludeUnderReview && av === "under_review") continue;
    sum += activityScoreValue(fr, av);
    applicable++;
  }
  if (applicable === 0) return 0;
  return (sum / applicable) * weight * 100;
}

// ── §5.4 Zone labels ──────────────────────────────────────────────────────────
function zone(total: number): string {
  if (total >= 80) return "Resilience Leader";
  if (total >= 60) return "Resilience Builder";
  if (total >= 40) return "Resilience Learner";
  return "Resilience Starter";
}

// ── §5.1 Credit score ─────────────────────────────────────────────────────────
function creditScore(friTotal: number, eciRaw: number): number {
  const eciNorm = (eciRaw / 40) * 100;
  const composite = friTotal * 0.60 + eciNorm * 0.40;
  return Math.round(CREDIT_MIN + (composite / 100) * (CREDIT_MAX - CREDIT_MIN));
}

// ── §5.8 ECI score (5 items × 8 = 40 max) ────────────────────────────────────
const ECI_ITEMS = [
  "income_debt", "financial_stability", "identity_eligibility",
  "production_commitment", "declaration_consent",
];

function calcECIRaw(eciResponses: Record<string, number>): number {
  return ECI_ITEMS.reduce((s, k) => {
    const val = eciResponses[k] ?? 0;
    return s + Math.min(val, 8);
  }, 0);
}

// ── Risk flag detection ───────────────────────────────────────────────────────
async function detectRiskFlags(
  supabase: ReturnType<typeof createClient>,
  farmerId: string,
  enrollmentId: string,
  newTotal: number,
  p4Score: number,
  weekNumber: number,
) {
  const flags: Array<{ farmer_id: string; enrollment_id: string; flag_type: string; severity: string; description: string }> = [];

  const { data: recent } = await supabase
    .from("farmer_fri_scores")
    .select("week_number, total_score, p4_score, is_provisional")
    .eq("farmer_id", farmerId)
    .order("week_number", { ascending: false })
    .limit(4);

  const history = (recent ?? []) as Array<{ week_number: number; total_score: number; p4_score: number; is_provisional: boolean }>;

  // Consecutive provisional (3+)
  const provisionalStreak = history.filter(r => r.is_provisional).length;
  if (provisionalStreak >= 3) {
    flags.push({
      farmer_id: farmerId, enrollment_id: enrollmentId,
      flag_type: "unverified_streak", severity: "medium",
      description: `${provisionalStreak} consecutive check-ins remain unverified.`,
    });
  }

  // P4 deterioration (≥15 pts drop)
  if (history.length >= 1) {
    const lastP4 = history[0].p4_score;
    if (lastP4 - p4Score >= 15) {
      flags.push({
        farmer_id: farmerId, enrollment_id: enrollmentId,
        flag_type: "p4_deterioration", severity: "high",
        description: `Enterprise score dropped from ${lastP4} to ${p4Score}.`,
      });
    }
  }

  // Zone drop
  if (history.length >= 1) {
    const prevZone = zone(history[0].total_score);
    const newZone = zone(newTotal);
    if (prevZone !== newZone) {
      const zoneOrder = ["Resilience Starter", "Resilience Learner", "Resilience Builder", "Resilience Leader"];
      if (zoneOrder.indexOf(newZone) < zoneOrder.indexOf(prevZone)) {
        flags.push({
          farmer_id: farmerId, enrollment_id: enrollmentId,
          flag_type: "zone_drop", severity: "high",
          description: `FRI zone dropped from ${prevZone} to ${newZone}.`,
        });
      }
    }
  }

  if (flags.length > 0) {
    await supabase.from("risk_flags").insert(flags);
  }
}

// ── §5.6 Season average (Final + Provisional only) ────────────────────────────
function calcSeasonAverage(
  prevScores: { total_score: number; status?: string; is_provisional?: boolean }[],
  currentTotal: number,
  currentIsProvisional: boolean,
): number {
  const eligible = prevScores.filter(r => {
    const st = r.status;
    if (st) return st === "final" || st === "provisional";
    return true;
  });
  const all = [...eligible.map(r => r.total_score), currentTotal];
  return Math.round(all.reduce((s, v) => s + v, 0) / all.length);
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = await req.json();
    const {
      farmer_id,
      enrollment_id,
      week_number,
      farmer_responses,
      agent_verifications,
      eci_responses,
      checkin_id,
    } = body as {
      farmer_id: string;
      enrollment_id: string;
      week_number: number;
      farmer_responses: Record<string, FarmerResponse>;
      agent_verifications: Record<string, AgentVerification>;
      eci_responses?: Record<string, number>;
      checkin_id?: string;
    };

    if (!farmer_id || !enrollment_id || week_number == null || !farmer_responses || !agent_verifications) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // §5.1 Compute pillar scores
    const p1 = Math.round(calcPillarScore(P1_ACTIVITIES, farmer_responses, agent_verifications, PILLAR_WEIGHTS.P1));
    const p2 = Math.round(calcPillarScore(P2_ACTIVITIES, farmer_responses, agent_verifications, PILLAR_WEIGHTS.P2));
    const p3 = Math.round(calcPillarScore(P3_ACTIVITIES, farmer_responses, agent_verifications, PILLAR_WEIGHTS.P3));
    const p4 = Math.round(calcPillarScore(P4_ACTIVITIES, farmer_responses, agent_verifications, PILLAR_WEIGHTS.P4));
    const total = p1 + p2 + p3 + p4;

    // §5.5 Provisional if any verified but not all
    const allKeys = [...P1_ACTIVITIES, ...P2_ACTIVITIES, ...P3_ACTIVITIES, ...P4_ACTIVITIES];
    const verifiedCount = allKeys.filter(k => agent_verifications[k] === "verified").length;
    const isProvisional = verifiedCount > 0 && verifiedCount < allKeys.length;
    const scoreStatus: string = verifiedCount === allKeys.length ? "final" : isProvisional ? "provisional" : "pending";

    // §5.8 ECI
    const eciRaw = calcECIRaw(eci_responses ?? {});
    const credit = creditScore(total, eciRaw);

    // §5.4 Zone
    const zoneLabel = zone(total);

    const { data: farmerRaw } = await supabase
      .from("farmers").select("organisation_id").eq("id", farmer_id).maybeSingle();
    const farmer = farmerRaw as { organisation_id: string } | null;
    if (!farmer) {
      return new Response(JSON.stringify({ error: "Farmer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // §5.6 Season average
    const { data: prevScores } = await supabase
      .from("farmer_fri_scores")
      .select("total_score, is_provisional")
      .eq("farmer_id", farmer_id)
      .neq("week_number", week_number);

    const seasonAverage = calcSeasonAverage(
      (prevScores ?? []) as { total_score: number; is_provisional: boolean }[],
      total,
      isProvisional,
    );

    // Upsert score row
    const { data: upserted, error: upsertErr } = await supabase
      .from("farmer_fri_scores")
      .upsert({
        farmer_id,
        enrollment_id,
        organisation_id: farmer.organisation_id,
        week_number,
        total_score:     total,
        p1_score:        p1,
        p2_score:        p2,
        p3_score:        p3,
        p4_score:        p4,
        eci_score:       eciRaw,
        credit_score:    credit,
        zone:            zoneLabel,
        season_average:  seasonAverage,
        raw_responses:   { farmer_responses, agent_verifications, eci_responses },
        is_provisional:  isProvisional,
        score_status:    scoreStatus,
        ...(checkin_id ? { checkin_id } : {}),
      }, { onConflict: "farmer_id,week_number" })
      .select("id")
      .single();

    if (upsertErr) throw upsertErr;

    // Update checkin status
    if (checkin_id) {
      await supabase.from("farmer_checkins").update({
        status: scoreStatus === "final" ? "verified" : "submitted",
        verified_at: scoreStatus === "final" ? new Date().toISOString() : null,
      }).eq("id", checkin_id);
    }

    // Update farmer current_fri_score
    await supabase.from("farmers").update({ current_fri_score: total }).eq("id", farmer_id);

    // Background risk flag detection
    EdgeRuntime.waitUntil(
      detectRiskFlags(supabase, farmer_id, enrollment_id, total, p4, week_number)
    );

    return new Response(JSON.stringify({
      fri_score_id:   (upserted as { id: string }).id,
      total_score:    total,
      p1_score:       p1,
      p2_score:       p2,
      p3_score:       p3,
      p4_score:       p4,
      eci_raw:        eciRaw,
      credit_score:   credit,
      zone:           zoneLabel,
      season_average: seasonAverage,
      is_provisional: isProvisional,
      score_status:   scoreStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
