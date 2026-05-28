import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const { email, password, displayName, inviteCode } = await request.json();

  if (!email || !password || !displayName || !inviteCode) {
    return json({ error: "Email, password, displayName, and inviteCode are required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (created.error || !created.data.user) {
    return json({ error: created.error?.message || "Unable to create user" }, 400);
  }

  const claimed = await admin.rpc("claim_invite", {
    p_code: String(inviteCode).trim(),
    p_user_id: created.data.user.id,
    p_display_name: String(displayName).trim(),
  });

  if (claimed.error || claimed.data !== true) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return json({ error: claimed.error?.message || "Invalid or used invite code" }, 400);
  }

  return json({ message: "Registration successful. Please sign in." });
});
