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

function normalizeQqNumber(value: unknown) {
  const qqNumber = String(value || "").trim();
  if (!/^[1-9][0-9]{4,11}$/.test(qqNumber)) {
    throw new Error("A valid QQ number is required");
  }
  return qqNumber;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("MUFC_SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const { qqNumber, password, displayName, inviteCode } = await request.json();

  if (!qqNumber || !password || !displayName || !inviteCode) {
    return json({ error: "QQ number, password, displayName, and inviteCode are required" }, 400);
  }

  let phone = "";
  try {
    phone = normalizeQqNumber(qqNumber);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "A valid QQ number is required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: { display_name: displayName, qq_number: phone },
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
