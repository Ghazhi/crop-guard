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
    const DEFAULT_PIN = "123456";

    // Staff / agent / partner accounts
    const staffUsers = [
      { email: "agent@asinyo.org", password: "Agent1234!", role: "agent", fullName: "Kwame Asante", phone: "0241234567", profileId: "10000000-0000-0000-0000-000000000001" },
      { email: "+233241234567@cropguard.ag", password: "654321", role: "farmer", fullName: "Ama Mensah", phone: "0241234567", profileId: "10000000-0000-0000-0000-000000000002" },
      { email: "staff@asinyo.org", password: "Staff1234!", role: "staff", fullName: "Abena Owusu", phone: "0200000003", profileId: "10000000-0000-0000-0000-000000000003" },
      { email: "partner@asinyo.org", password: "Partner1234!", role: "partner", fullName: "Kofi Mensah", phone: "0200000005", profileId: "10000000-0000-0000-0000-000000000005" },
      { email: "admin@asinyo.org", password: "Admin1234!", role: "admin", fullName: "Admin User", phone: "0200000006", profileId: "10000000-0000-0000-0000-000000000006" },
      { email: "agro@asinyo.org", password: "Agro1234!", role: "agronomist", fullName: "Agronomist User", phone: "0200000007", profileId: "10000000-0000-0000-0000-000000000007" },
      { email: "credits@asinyo.org", password: "Credits1234!", role: "credits", fullName: "Credits User", phone: "0200000008", profileId: "10000000-0000-0000-0000-000000000008" },
    ];

    // Farmers that need auth accounts — fetch from farmers table where user_id is null
    const { data: farmersNeedingAuth, error: fetchErr } = await supabaseAdmin
      .from("farmers")
      .select("id, full_name, phone, organisation_id")
      .is("user_id", null)
      .order("full_name");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: `Failed to fetch farmers: ${fetchErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; ok: boolean; error?: string; newId?: string }[] = [];

    // Process staff users (skip if already exists)
    for (const u of staffUsers) {
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const alreadyExists = existing?.users?.some((eu: any) => eu.email === u.email);

      if (alreadyExists) {
        results.push({ email: u.email, ok: true, newId: "already exists" });
        continue;
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          role: u.role,
          full_name: u.fullName,
          organisation_id: ORG_ID,
          phone: u.phone,
        },
      });

      if (createErr || !newUser) {
        results.push({ email: u.email, ok: false, error: createErr?.message ?? "unknown" });
        continue;
      }

      const newId = newUser.user.id;

      const { error: profileErr } = await supabaseAdmin
        .from("users")
        .update({ id: newId, must_change_password: false })
        .eq("id", u.profileId);

      if (profileErr) {
        results.push({ email: u.email, ok: false, error: `Profile link failed: ${profileErr.message}`, newId });
      } else {
        results.push({ email: u.email, ok: true, newId });
      }
    }

    // Process farmers needing auth accounts
    for (const f of farmersNeedingAuth ?? []) {
      const normalizedPhone = f.phone.replace(/\s+/g, "").replace(/^0/, "+233");
      const email = `${normalizedPhone}@cropguard.ag`;

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEFAULT_PIN,
        email_confirm: true,
        user_metadata: {
          role: "farmer",
          full_name: f.full_name,
          organisation_id: f.organisation_id ?? ORG_ID,
          phone: f.phone,
        },
      });

      if (createErr || !newUser) {
        results.push({ email, ok: false, error: createErr?.message ?? "unknown" });
        continue;
      }

      const newId = newUser.user.id;

      const { error: linkErr } = await supabaseAdmin
        .from("farmers")
        .update({ user_id: newId })
        .eq("id", f.id);

      if (linkErr) {
        results.push({ email, ok: false, error: `Farmer link failed: ${linkErr.message}`, newId });
      } else {
        results.push({ email, ok: true, newId });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
