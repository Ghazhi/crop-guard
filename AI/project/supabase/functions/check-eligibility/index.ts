import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type RuleOperator = ">=" | "<=" | "==" | "!=";

interface EligibilityRule {
  id:               string;
  name:             string;
  description:      string | null;
  field:            string;
  operator:         RuleOperator;
  value:            number;
  benefit_label:    string;
  benefit_amount:   number | null;
  benefit_currency: string;
}

interface FarmerFacts {
  total_score:      number;
  season_average:   number | null;
  zone:             string;
  credit_score:     number | null;
  p1_score:         number;
  p2_score:         number;
  p3_score:         number;
  p4_score:         number;
  eci_score:        number;
  enrollment_weeks: number;
  total_area_ha:    number | null;
  irrigation:       boolean;
}

function resolveField(facts: FarmerFacts, field: string): number | null {
  const val = (facts as unknown as Record<string, unknown>)[field];
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? 1 : 0;
  return null;
}

function evalRule(currentValue: number | null, operator: RuleOperator, threshold: number): boolean {
  if (currentValue === null) return false;
  switch (operator) {
    case ">=": return currentValue >= threshold;
    case "<=": return currentValue <= threshold;
    case "==": return currentValue === threshold;
    case "!=": return currentValue !== threshold;
    default:   return false;
  }
}

const IMPROVEMENT_HINTS: Record<string, string[]> = {
  total_score: [
    "Complete all weekly check-ins on time.",
    "Improve your weakest pillar score.",
    "Request an agent visit for personalised coaching.",
  ],
  p1_score: ["Apply recommended inputs at correct rates.", "Keep detailed farm records.", "Practice crop rotation."],
  p2_score: ["Use drought-tolerant varieties.", "Construct water-harvesting structures.", "Monitor weather forecasts."],
  p3_score: ["Save at least 10% of farm income.", "Join a farmer cooperative.", "Explore crop insurance options."],
  p4_score: ["Diversify household food sources.", "Ensure children attend school regularly.", "Access routine healthcare."],
  credit_score: ["Maintain good loan repayment history.", "Keep check-in data accurate.", "Achieve Green zone FRI."],
};

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

    const { farmer_id } = await req.json() as { farmer_id: string };
    if (!farmer_id) {
      return new Response(JSON.stringify({ error: "farmer_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load farmer facts in parallel
    const [
      { data: farmerRaw },
      { data: farmRaw },
      { data: enrollRaw },
      { data: scoreRaw },
    ] = await Promise.all([
      supabase.from("farmers").select("id").eq("id", farmer_id).maybeSingle(),
      supabase.from("farm_details").select("total_area_ha,irrigation").eq("farmer_id", farmer_id).maybeSingle(),
      supabase.from("enrollments").select("id,enrolled_at").eq("farmer_id", farmer_id).eq("status", "active").limit(1),
      supabase.from("farmer_fri_scores")
        .select("total_score,p1_score,p2_score,p3_score,p4_score,eci_score,credit_score,season_average,zone")
        .eq("farmer_id", farmer_id)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!farmerRaw) {
      return new Response(JSON.stringify({ error: "Farmer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const farm  = farmRaw  as { total_area_ha: number | null; irrigation: boolean } | null;
    const enrs  = (enrollRaw ?? []) as { id: string; enrolled_at: string }[];
    const enr   = enrs[0] ?? null;
    const score = scoreRaw as {
      total_score: number; p1_score: number; p2_score: number; p3_score: number;
      p4_score: number; eci_score: number; credit_score: number | null;
      season_average: number | null; zone: string;
    } | null;

    let enrollmentWeeks = 0;
    if (enr) {
      const ms = Date.now() - new Date(enr.enrolled_at).getTime();
      enrollmentWeeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
    }

    const facts: FarmerFacts = {
      total_score:      score?.total_score      ?? 0,
      season_average:   score?.season_average   ?? null,
      zone:             score?.zone             ?? "Red",
      credit_score:     score?.credit_score     ?? null,
      p1_score:         score?.p1_score         ?? 0,
      p2_score:         score?.p2_score         ?? 0,
      p3_score:         score?.p3_score         ?? 0,
      p4_score:         score?.p4_score         ?? 0,
      eci_score:        score?.eci_score        ?? 0,
      enrollment_weeks: enrollmentWeeks,
      total_area_ha:    farm?.total_area_ha     ?? null,
      irrigation:       farm?.irrigation        ?? false,
    };

    // Load active eligibility rules
    const { data: rulesRaw } = await supabase
      .from("eligibility_rules")
      .select("id,name,description,field,operator,value,benefit_label,benefit_amount,benefit_currency")
      .eq("is_active", true);

    const rules = (rulesRaw ?? []) as EligibilityRule[];

    // Evaluate each rule
    const results = rules.map(rule => {
      const currentValue = resolveField(facts, rule.field);
      const eligible     = evalRule(currentValue, rule.operator as RuleOperator, rule.value);
      const gap = !eligible && currentValue !== null
        ? Math.max(0, rule.operator === ">=" ? rule.value - currentValue : currentValue - rule.value)
        : null;

      const hints = IMPROVEMENT_HINTS[rule.field] ?? IMPROVEMENT_HINTS["total_score"];
      const steps = eligible ? [] : (gap !== null && gap > 20 ? hints : hints.slice(0, 2));

      return {
        rule_id:        rule.id,
        rule_name:      rule.name,
        description:    rule.description,
        benefit_label:  rule.benefit_label,
        benefit_amount: rule.benefit_amount,
        eligible,
        current_value:  currentValue,
        gap,
        steps,
      };
    });

    return new Response(JSON.stringify({
      farmer_id,
      facts,
      eligible_count: results.filter(r => r.eligible).length,
      total_rules:    results.length,
      results,
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
