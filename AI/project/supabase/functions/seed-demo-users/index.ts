import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const ORG_ID = "00000000-0000-0000-0000-000000000001";

    const results: Record<string, string> = {};

    // Create agent user
    const { data: agentData, error: agentErr } = await supabaseAdmin.auth.admin.createUser({
      email: "agent@asinyo.org",
      password: "Agent1234!",
      email_confirm: true,
      user_metadata: {
        role: "agent",
        full_name: "Kwame Asante",
        organisation_id: ORG_ID,
        phone: "0241234567",
      },
    });
    if (agentErr) {
      results.agent = `error: ${agentErr.message}`;
    } else {
      results.agent = `created: ${agentData.user.id}`;
    }

    // Create farmer user — phone mapped to email
    const { data: farmerData, error: farmerErr } = await supabaseAdmin.auth.admin.createUser({
      email: "+233241234567@cropguard.ag",
      password: "123456",
      email_confirm: true,
      user_metadata: {
        role: "farmer",
        full_name: "Ama Mensah",
        organisation_id: ORG_ID,
        phone: "0241234567",
      },
    });
    if (farmerErr) {
      results.farmer = `error: ${farmerErr.message}`;
    } else {
      results.farmer = `created: ${farmerData.user.id}`;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
