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
    if (!["admin", "staff", "super_admin"].includes(callerRole)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden: admin, staff, or super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerOrgId: string =
      caller.app_metadata?.organisation_id ?? caller.user_metadata?.organisation_id;

    const body = await req.json();
    const { email, password, full_name, role, phone, department_id } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: email, password, full_name, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["staff", "admin", "agent", "partner", "agronomist", "credits", "team"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role,
        organisation_id: callerOrgId,
      },
      user_metadata: {
        full_name,
        phone: phone ?? null,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = data.user.id;

    // Insert profile row
    await supabaseAdmin.from("users").upsert({
      id: newUserId,
      organisation_id: callerOrgId,
      role,
      full_name,
      phone: phone ?? null,
      is_active: true,
      must_change_password: true,
      custom_role_id: body.custom_role_id ?? null,
    });

    // Assign to department if provided
    if (department_id) {
      await supabaseAdmin.from("user_departments").insert({
        user_id: newUserId,
        department_id,
      });
    }

    return new Response(JSON.stringify({ ok: true, userId: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
