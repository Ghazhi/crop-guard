import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FARMER_EMAIL_DOMAIN = "@cropguard.ag";

function phoneToEmail(phone: string): string {
  const normalized = phone.replace(/\s+/g, "").replace(/^0/, "+233");
  return `${normalized}${FARMER_EMAIL_DOMAIN}`;
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (callerErr || !caller) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = caller.app_metadata?.role ?? caller.user_metadata?.role;
    if (!["admin", "staff", "super_admin", "agent"].includes(callerRole)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { farmer_id, phone, full_name, organisation_id } = body;

    if (!farmer_id || !phone || !full_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: farmer_id, phone, full_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = phoneToEmail(phone);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const found = (existingUser?.users ?? []).find((u: any) => u.email === email);
    if (found) {
      // Link farmer_id to existing user if not already linked
      await supabaseAdmin.from("users").update({ farmer_id }).eq("id", found.id).eq("farmer_id", null);
      return new Response(JSON.stringify({ ok: true, userId: found.id, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "654321",
      email_confirm: true,
      app_metadata: {
        role: "farmer",
        organisation_id: organisation_id ?? caller.app_metadata?.organisation_id,
      },
      user_metadata: {
        full_name,
        farmer_id,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = data.user.id;

    await supabaseAdmin.from("users").upsert({
      id: newUserId,
      organisation_id: organisation_id ?? caller.app_metadata?.organisation_id,
      role: "farmer",
      full_name,
      phone,
      is_active: true,
      must_change_password: true,
      farmer_id,
    });

    return new Response(JSON.stringify({ ok: true, userId: newUserId, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
