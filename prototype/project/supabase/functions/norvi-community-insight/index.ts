import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Scope = "community" | "cooperative" | "organisation";

function buildCommunityPrompt(ctx: {
  name: string; region: string; district: string; nearest_town: string | null;
  socioeconomic_status: string | null; income_streams: string[];
  social_amenities: string[]; leader_name: string | null;
  farmer_count: number; avg_fri: number | null; avg_credit_score: number | null;
  active_enrollments: number; verified_farmers: number;
  cohorts: number; programs: number; cooperatives: number;
}): string {
  const amenities = ctx.social_amenities.length > 0
    ? `\nSocial amenities present: ${ctx.social_amenities.join(", ")}`
    : "\nSocial amenities: None recorded";
  const income = ctx.income_streams.length > 0
    ? `\nMajor income streams: ${ctx.income_streams.join(", ")}`
    : "";
  const friInfo = ctx.avg_fri != null
    ? `\nAverage FRI Score across ${ctx.farmer_count} farmers: ${ctx.avg_fri.toFixed(1)}/100`
    : `\nFarmers linked: ${ctx.farmer_count}`;
  const creditInfo = ctx.avg_credit_score != null
    ? `\nAverage credit score: ${ctx.avg_credit_score.toFixed(0)}`
    : "";
  const enrollment = ctx.active_enrollments > 0
    ? `\nActive program enrollments: ${ctx.active_enrollments} across ${ctx.cohorts} cohort(s) and ${ctx.programs} program(s)`
    : "\nNo active program enrollments";
  const verified = ctx.verified_farmers > 0
    ? `\nVerified farmers: ${ctx.verified_farmers}`
    : "";

  return `You are Norvi, an agricultural intelligence AI for a development organization working with smallholder farming communities in Ghana. Write a concise insight brief for the community of ${ctx.name} in ${ctx.region}, ${ctx.district}.

Context:
Community: ${ctx.name}
Location: ${ctx.district}, ${ctx.region}${ctx.nearest_town ? `\nNearest town: ${ctx.nearest_town}` : ""}
Socioeconomic status: ${ctx.socioeconomic_status ?? "Not classified"}
Leader: ${ctx.leader_name ?? "Not recorded"}${income}${amenities}${friInfo}${creditInfo}${enrollment}${verified}
Cooperatives in community: ${ctx.cooperatives}

Write exactly 3 short paragraphs:
1. Community overview — summarize the community's profile, location context, and socioeconomic characteristics
2. Farmer resilience assessment — interpret the average FRI scores, enrollment levels, and what this tells about the community's agricultural readiness
3. Recommendations — suggest 2-3 specific interventions or focus areas for this community

Keep it professional and concise. No headings, no bullet points.`;
}

function buildCoopPrompt(ctx: {
  name: string; community_name: string | null; member_count: number;
  primary_crops: string[]; secondary_crops: string[]; farm_animals: string[];
  chairman_name: string | null; secretary_name: string | null;
  farmer_count: number; avg_fri: number | null;
  active_enrollments: number; verified_farmers: number;
  cohorts: number; programs: number;
}): string {
  const crops = ctx.primary_crops.length > 0
    ? `\nPrimary crops: ${ctx.primary_crops.join(", ")}`
    : "";
  const secondary = ctx.secondary_crops.length > 0
    ? `\nSecondary crops: ${ctx.secondary_crops.join(", ")}`
    : "";
  const animals = ctx.farm_animals.length > 0
    ? `\nFarm animals: ${ctx.farm_animals.join(", ")}`
    : "";
  const friInfo = ctx.avg_fri != null
    ? `\nAverage FRI Score across linked farmers: ${ctx.avg_fri.toFixed(1)}/100`
    : "";
  const enrollment = ctx.active_enrollments > 0
    ? `\nActive enrollments: ${ctx.active_enrollments} across ${ctx.cohorts} cohort(s)`
    : "\nNo active enrollments";

  return `You are Norvi, an agricultural intelligence AI for a development organization working with farmer cooperatives and groups in Ghana. Write a concise insight brief for the cooperative "${ctx.name}".

Context:
Cooperative: ${ctx.name}
Community: ${ctx.community_name ?? "Not linked"}
Members: ${ctx.member_count}
Chairman: ${ctx.chairman_name ?? "Not set"}
Secretary: ${ctx.secretary_name ?? "Not set"}${crops}${secondary}${animals}
Linked farmers: ${ctx.farmer_count}${friInfo}${enrollment}
Verified farmers: ${ctx.verified_farmers}

Write exactly 3 short paragraphs:
1. Cooperative overview — summarize the group's profile, crop focus, and organizational structure
2. Member resilience assessment — interpret the FRI scores and enrollment data to assess the group's agricultural readiness
3. Recommendations — suggest 2-3 specific interventions or opportunities for this cooperative

Keep it professional and concise. No headings, no bullet points.`;
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
      scope: Scope;
      scope_id: string;
      org_id: string;
      custom_prompt?: string;
      output_type?: string;
      title?: string;
      report_type?: string;
      generated_by?: string;
    };
    const { scope, scope_id, org_id, custom_prompt, output_type, title, report_type, generated_by } = body;

    if (!scope || !scope_id || !org_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: skip when a custom prompt is provided (user-initiated)
    if (!custom_prompt) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("norvi_community_outputs")
        .select("id,content,scope,scope_id,created_at")
        .eq("scope", scope)
        .eq("scope_id", scope_id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify(existing), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (scope === "organisation") {
      const { data: orgFarmers } = await supabase
        .from("farmers")
        .select("id,is_verified,primary_crop,region_code")
        .eq("organisation_id", org_id);
      const farmerIds = (orgFarmers ?? []).map((f: any) => f.id);

      const [
        { data: friScores },
        { count: activeEnrollments },
        { count: totalAgents },
        { data: programs },
        { data: cohorts },
        { count: cooperatives },
        { count: communities },
        { count: interventions },
        { count: applications },
      ] = await Promise.all([
        farmerIds.length > 0
          ? supabase.from("farmer_fri_scores").select("total_score,zone").in("farmer_id", farmerIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("organisation_id", org_id).eq("role", "agent"),
        supabase.from("programs").select("id,name").eq("organisation_id", org_id),
        supabase.from("cohorts").select("id,name").eq("organisation_id", org_id),
        supabase.from("cooperatives").select("id", { count: "exact", head: true }).eq("organisation_id", org_id),
        supabase.from("communities").select("id", { count: "exact", head: true }).eq("organisation_id", org_id),
        supabase.from("interventions").select("id", { count: "exact", head: true }).eq("organisation_id", org_id),
        supabase.from("farmer_intervention_applications").select("id", { count: "exact", head: true }).eq("organisation_id", org_id),
      ]);

      const scores = (friScores ?? []) as any[];
      const avgFri = scores.length
        ? scores.reduce((a, s) => a + (s.total_score ?? 0), 0) / scores.length
        : null;
      const verifiedCount = (orgFarmers ?? []).filter((f: any) => f.is_verified).length;

      const zoneCounts: Record<string, number> = {};
      scores.forEach((s: any) => {
        const z = s.zone ?? "Unknown";
        zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
      });

      const cropCounts: Record<string, number> = {};
      (orgFarmers ?? []).forEach((f: any) => {
        const c = f.primary_crop ?? "unknown";
        cropCounts[c] = (cropCounts[c] ?? 0) + 1;
      });

      const regionCounts: Record<string, number> = {};
      (orgFarmers ?? []).forEach((f: any) => {
        const r = f.region_code ?? "Unknown";
        regionCounts[r] = (regionCounts[r] ?? 0) + 1;
      });

      const orgCtx = `Organisation ID: ${org_id}
Total farmers: ${farmerIds.length}
Verified farmers: ${verifiedCount}
Active enrollments: ${activeEnrollments ?? 0}
Field agents: ${totalAgents ?? 0}
Programs: ${programs?.length ?? 0}
Cohorts: ${cohorts?.length ?? 0}
Cooperatives: ${cooperatives ?? 0}
Communities: ${communities ?? 0}
Interventions: ${interventions ?? 0}
Applications: ${applications ?? 0}
Average FRI: ${avgFri != null ? avgFri.toFixed(1) : "N/A"}
FRI Zone distribution: ${Object.entries(zoneCounts).map(([z, c]) => `${z}: ${c}`).join(", ")}
Top crops: ${Object.entries(cropCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c} (${n})`).join(", ")}
Regions: ${Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, n]) => `${r}: ${n}`).join(", ")}`;

      const orgPrompt = custom_prompt
        ? `You are Norvi, an agricultural intelligence AI for a development organization working with smallholder farming communities in Ghana. ${custom_prompt}`
        : `You are Norvi, an agricultural intelligence AI for a development organization working with smallholder farming communities in Ghana. Write a concise program-wide intelligence brief based on the following data:\n\n${orgCtx}\n\nWrite exactly 3 short paragraphs:\n1. Program overview — summarize the organization's farmer base, governance structures, and program reach\n2. Resilience assessment — interpret the FRI scores, enrollment levels, and risk distribution to assess the program's impact\n3. Recommendations — suggest 2-3 specific actions or focus areas for the program team\n\nKeep it professional and concise. No headings, no bullet points.`;

      const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: orgPrompt }],
      });
      const content = (message.content[0] as { type: string; text: string }).text.trim();

      const { data: saved } = await supabase
        .from("norvi_community_outputs")
        .insert({
          scope, scope_id, content,
          output_type: output_type ?? (custom_prompt ? "report" : "insight"),
          custom_prompt: custom_prompt ?? null,
          title: title ?? null,
          report_type: report_type ?? null,
          generated_by: generated_by ?? null,
        })
        .select("id,content,scope,scope_id,created_at,title,generated_by")
        .single();

      return new Response(JSON.stringify(saved), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (scope === "community") {
      const { data: commRaw } = await supabase
        .from("communities")
        .select("*")
        .eq("id", scope_id)
        .maybeSingle();
      const comm = commRaw as any;
      if (!comm) {
        return new Response(JSON.stringify({ error: "Community not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: farmersData } = await supabase
        .from("farmers")
        .select("id,is_verified")
        .eq("community_id", scope_id);
      const farmerIds = (farmersData ?? []).map((f: any) => f.id);

      const [{ data: friScores }, { data: enrolls }, { data: coops }, { data: cohorts }] = await Promise.all([
        farmerIds.length > 0
          ? supabase.from("farmer_fri_scores").select("total_score,credit_score").in("farmer_id", farmerIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("enrollments").select("id,farmer_id,cohort_id,status").eq("organisation_id", org_id),
        supabase.from("cooperatives").select("id").eq("community_id", scope_id),
        supabase.from("cohorts").select("id,program_id").eq("organisation_id", org_id),
      ]);

      const farmerIdSet = new Set(farmerIds);
      const scopedEnrolls = (enrolls ?? []).filter((e: any) => farmerIdSet.has(e.farmer_id));
      const activeEnrolls = scopedEnrolls.filter((e: any) => e.status === "active");
      const cohortIds = new Set(activeEnrolls.map((e: any) => e.cohort_id).filter(Boolean));
      const programIds = new Set(
        [...cohortIds].map((cid: any) => (cohorts ?? []).find((c: any) => c.id === cid)?.program_id).filter(Boolean)
      );
      const scopedFri = (friScores ?? []) as any[];
      const avgFri = scopedFri.length
        ? scopedFri.reduce((a, s) => a + (s.total_score ?? 0), 0) / scopedFri.length
        : null;
      const creditScores = scopedFri.map((s: any) => s.credit_score).filter((v: any) => v != null) as number[];
      const avgCredit = creditScores.length
        ? creditScores.reduce((a, b) => a + b, 0) / creditScores.length
        : null;
      const verifiedCount = (farmersData ?? []).filter((f: any) => f.is_verified).length;
      const amenities = Object.entries(comm.social_amenities ?? {})
        .filter(([, v]: any) => v?.exists)
        .map(([k]) => k.replace(/_/g, " "));

      const prompt = custom_prompt
        ? `You are Norvi, an agricultural intelligence AI for a development organization working with smallholder farming communities in Ghana. ${custom_prompt}`
        : buildCommunityPrompt({
            name: comm.name,
            region: comm.region_code ?? "",
            district: comm.district ?? "",
            nearest_town: comm.nearest_town,
            socioeconomic_status: comm.socioeconomic_status,
            income_streams: comm.income_streams ?? [],
            social_amenities: amenities,
            leader_name: comm.leader_name,
            farmer_count: farmerIds.length,
            avg_fri: avgFri,
            avg_credit_score: avgCredit,
            active_enrollments: activeEnrolls.length,
            verified_farmers: verifiedCount,
            cohorts: cohortIds.size,
            programs: programIds.size,
            cooperatives: (coops ?? []).length,
          });

      const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      const content = (message.content[0] as { type: string; text: string }).text.trim();

      const { data: saved } = await supabase
        .from("norvi_community_outputs")
        .insert({
          scope, scope_id, content,
          output_type: output_type ?? (custom_prompt ? "report" : "insight"),
          custom_prompt: custom_prompt ?? null,
          title: title ?? null,
          report_type: report_type ?? null,
          generated_by: generated_by ?? null,
        })
        .select("id,content,scope,scope_id,created_at,title,generated_by")
        .single();

      return new Response(JSON.stringify(saved), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cooperative scope
    const { data: coopRaw } = await supabase
      .from("cooperatives")
      .select("*, community:communities(name)")
      .eq("id", scope_id)
      .maybeSingle();
    const coop = coopRaw as any;
    if (!coop) {
      return new Response(JSON.stringify({ error: "Cooperative not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: farmersData } = await supabase
      .from("farmers")
      .select("id,is_verified")
      .eq("cooperative_id", scope_id);
    const farmerIds = (farmersData ?? []).map((f: any) => f.id);

    const [{ data: friScores }, { data: enrolls }, { data: cohorts }] = await Promise.all([
      farmerIds.length > 0
        ? supabase.from("farmer_fri_scores").select("total_score").in("farmer_id", farmerIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("enrollments").select("id,farmer_id,cohort_id,status").eq("organisation_id", org_id),
      supabase.from("cohorts").select("id,program_id").eq("organisation_id", org_id),
    ]);

    const farmerIdSet = new Set(farmerIds);
    const scopedEnrolls = (enrolls ?? []).filter((e: any) => farmerIdSet.has(e.farmer_id));
    const activeEnrolls = scopedEnrolls.filter((e: any) => e.status === "active");
    const cohortIds = new Set(activeEnrolls.map((e: any) => e.cohort_id).filter(Boolean));
    const programIds = new Set(
      [...cohortIds].map((cid: any) => (cohorts ?? []).find((c: any) => c.id === cid)?.program_id).filter(Boolean)
    );
    const scopedFri = (friScores ?? []) as any[];
    const avgFri = scopedFri.length
      ? scopedFri.reduce((a, s) => a + (s.total_score ?? 0), 0) / scopedFri.length
      : null;
    const verifiedCount = (farmersData ?? []).filter((f: any) => f.is_verified).length;

    const prompt = custom_prompt
      ? `You are Norvi, an agricultural intelligence AI for a development organization working with farmer cooperatives and groups in Ghana. ${custom_prompt}`
      : buildCoopPrompt({
          name: coop.name,
          community_name: coop.community?.name ?? null,
          member_count: coop.member_count ?? 0,
          primary_crops: coop.primary_crops ?? [],
          secondary_crops: coop.secondary_crops ?? [],
          farm_animals: coop.farm_animals ?? [],
          chairman_name: coop.chairman_name,
          secretary_name: coop.secretary_name,
          farmer_count: farmerIds.length,
          avg_fri: avgFri,
          active_enrollments: activeEnrolls.length,
          verified_farmers: verifiedCount,
          cohorts: cohortIds.size,
          programs: programIds.size,
        });

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const content = (message.content[0] as { type: string; text: string }).text.trim();

    const { data: saved } = await supabase
      .from("norvi_community_outputs")
      .insert({
        scope, scope_id, content,
        output_type: output_type ?? (custom_prompt ? "report" : "insight"),
        custom_prompt: custom_prompt ?? null,
        title: title ?? null,
        report_type: report_type ?? null,
        generated_by: generated_by ?? null,
      })
      .select("id,content,scope,scope_id,created_at,title,generated_by")
      .single();

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
