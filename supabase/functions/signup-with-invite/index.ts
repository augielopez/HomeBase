import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODULES = ["career-resume", "financial-managment", "party-invite", "shopping"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase environment configuration");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const payload = await req.json();
    const validationError = validatePayload(payload);

    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const username = payload.username.trim();
    const displayName = payload.displayName?.trim() || username;

    // Reserve the invitation (increments uses inside transaction)
    const { data: invitation, error: redeemError } = await supabase
      .rpc("redeem_invitation", { p_code: payload.code.trim() });

    if (redeemError || !invitation) {
      console.error("redeem_invitation error:", redeemError?.message);
      return jsonResponse({ error: mapRedeemError(redeemError?.message) }, 400);
    }

    if (invitation.email && invitation.email.toLowerCase() !== normalizedEmail) {
      await revertInvitationUsage(supabase, invitation.id, invitation.uses);
      return jsonResponse({ error: "Invitation is registered to a different email address." }, 400);
    }

    const allowedModules = Array.isArray(invitation.allowed_modules) && invitation.allowed_modules.length
      ? invitation.allowed_modules
      : DEFAULT_MODULES;

    // Create the auth user
    const { data: userResult, error: createUserError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName,
        modules: allowedModules,
      },
    });

    if (createUserError || !userResult?.user) {
      console.error("createUser error:", createUserError?.message);
      await revertInvitationUsage(supabase, invitation.id, invitation.uses);
      return jsonResponse({ error: createUserError?.message || "Unable to create user" }, 400);
    }

    const authUserId = userResult.user.id;

    // Insert profile row
    const { error: profileError } = await supabase.from("user_profiles").insert({
      auth_user_id: authUserId,
      username,
      display_name: displayName,
      allowed_modules: allowedModules,
      invitation_id: invitation.id,
    });

    if (profileError) {
      console.error("user_profiles insert error:", profileError.message);
      await supabase.auth.admin.deleteUser(authUserId);
      await revertInvitationUsage(supabase, invitation.id, invitation.uses);
      return jsonResponse({ error: "Failed to finalize user profile" }, 400);
    }

    return jsonResponse({
      success: true,
      user_id: authUserId,
      allowed_modules: allowedModules,
      invitation_id: invitation.id,
    });
  } catch (error) {
    console.error("signup-with-invite error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function validatePayload(payload: Record<string, string>) {
  if (!payload) return "Missing request body.";
  if (!payload.code || payload.code.trim().length < 12) return "A valid invitation code is required.";
  if (!payload.email || !payload.email.includes("@")) return "A valid email address is required.";
  if (!payload.username || payload.username.trim().length < 3) return "Username must be at least 3 characters.";
  if (!payload.password || payload.password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function mapRedeemError(message?: string) {
  if (!message) return "Invalid invitation code.";
  if (message.includes("invitation_not_found")) return "Invitation code not found.";
  if (message.includes("invitation_expired")) return "Invitation code has expired.";
  if (message.includes("invitation_maxed")) return "Invitation code has already been used.";
  return "Unable to redeem invitation.";
}

async function revertInvitationUsage(supabase: ReturnType<typeof createClient>, invitationId: string, currentUses: number) {
  const newValue = Math.max((currentUses || 1) - 1, 0);
  await supabase
    .from("invitations")
    .update({ uses: newValue })
    .eq("id", invitationId);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

