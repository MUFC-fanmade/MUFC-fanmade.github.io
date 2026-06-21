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
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey =
    Deno.env.get("MUFC_SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  if (serviceRoleKey === anonKey) {
    return json({ error: "Server service role key is not configured" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json({ error: "Missing authorization token" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const requester = await userClient.auth.getUser(token);
  if (requester.error || !requester.data.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const profile = await userClient
    .from("profiles")
    .select("id,is_admin")
    .eq("id", requester.data.user.id)
    .single();

  if (profile.error) {
    return json({ error: `Admin profile check failed: ${profile.error.message}` }, 403);
  }

  if (!profile.data?.is_admin) {
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
