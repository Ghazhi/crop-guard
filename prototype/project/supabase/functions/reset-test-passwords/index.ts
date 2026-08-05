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

    const users = [
      { oldId: "10000000-0000-0000-0000-000000000001", email: "agent@asinyo.org", password: "Agent1234!", role: "agent", fullName: "Kwame Asante", orgId: "00000000-0000-0000-0000-000000000001", phone: "0241234567" },
      { oldId: "10000000-0000-0000-0000-000000000002", email: "+233241234567@cropguard.ag", password: "654321", role: "farmer", fullName: "Ama Mensah", orgId: "00000000-0000-0000-0000-000000000001", phone: "0241234567" },
      { oldId: "10000000-0000-0000-0000-000000000003", email: "staff@asinyo.org", password: "Staff1234!", role: "staff", fullName: "Abena Owusu", orgId: "00000000-0000-0000-0000-000000000001", phone: "0200000003" },
      { oldId: "10000000-0000-0000-0000-000000000005", email: "partner@asinyo.org", password: "Partner1234!", role: "partner", fullName: "Kofi Mensah", orgId: "00000000-0000-0000-0000-000000000001", phone: "0200000005" },
      { oldId: "10000000-0000-0000-0000-000000000006", email: "admin@asinyo.org", password: "Admin1234!", role: "admin", fullName: "Admin User", orgId: "00000000-0000-0000-0000-000000000001", phone: "0200000006" },
      { oldId: "10000000-0000-0000-0000-000000000007", email: "agro@asinyo.org", password: "Agro1234!", role: "agronomist", fullName: "Agronomist User", orgId: "00000000-0000-0000-0000-000000000001", phone: "0200000007" },
      { oldId: "10000000-0000-0000-0000-000000000008", email: "credits@asinyo.org", password: "Credits1234!", role: "credits", fullName: "Credits User", orgId: "00000000-0000-0000-0000-000000000001", phone: "0200000008" },
    ];

    const results: { email: string; ok: boolean; error?: string; newId?: string }[] = [];

    for (const u of users) {
      // Step 1: Create the new auth user via the admin API
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          role: u.role,
          full_name: u.fullName,
          organisation_id: u.orgId,
          phone: u.phone,
        },
      });

      if (createErr || !newUser) {
        results.push({ email: u.email, ok: false, error: `Create failed: ${createErr?.message ?? "unknown"}` });
        continue;
      }

      const newId = newUser.user.id;

      // Step 2: Update the public.users profile to point to the new auth user ID
      const { error: profileErr } = await supabaseAdmin
        .from("users")
        .update({ id: newId, must_change_password: false })
        .eq("id", u.oldId);

      if (profileErr) {
        results.push({ email: u.email, ok: false, error: `Profile update failed: ${profileErr.message}`, newId });
        continue;
      }

      // Step 3: Delete the old (broken) auth user
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(u.oldId);
      if (delErr) {
        results.push({ email: u.email, ok: true, newId, error: `Profile updated but old auth delete failed: ${delErr.message}` });
        continue;
      }

      results.push({ email: u.email, ok: true, newId });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), stack: err.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
