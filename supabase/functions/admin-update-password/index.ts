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
  const serviceRoleKey =
    Deno.env.get("MUFC_SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json({ error: "Missing authorization token" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const requester = await admin.auth.getUser(token);
  if (requester.error || !requester.data.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const profile = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", requester.data.user.id)
    .single();

  if (profile.error || !profile.data?.is_admin) {
    return json({ error: "Admin access required" }, 403);
  }

  const { userId, password } = await request.json();
  const targetUserId = String(userId || "").trim();
  const nextPassword = String(password || "");

  if (!targetUserId || nextPassword.length < 6) {
    return json({ error: "User id and a password of at least 6 characters are required" }, 400);
  }

  const updated = await admin.auth.admin.updateUserById(targetUserId, {
    password: nextPassword,
  });

  if (updated.error) {
    return json({ error: updated.error.message }, 400);
  }

  return json({ message: "Password updated" });
});
