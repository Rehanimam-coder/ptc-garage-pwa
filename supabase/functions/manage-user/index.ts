import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(
  withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

    try {
      const callerId = ctx.userClaims?.sub;
      if (!callerId) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

      const { data: caller, error: callerError } = await ctx.supabase
        .from("profiles")
        .select("role,is_active")
        .eq("user_id", callerId)
        .single();

      if (callerError || !caller || caller.role !== "admin" || !caller.is_active) {
        return Response.json({ error: "Only an active Admin can create accounts." }, { status: 403, headers: corsHeaders });
      }

      const body = await req.json();
      const userId = String(body.userId ?? "").trim().toLowerCase();
      const fullName = String(body.fullName ?? "").trim();
      const password = String(body.password ?? "");
      const role = String(body.role ?? "");
      const siteId = body.siteId ? String(body.siteId) : null;

      if (!/^[a-z0-9._-]{3,32}$/.test(userId)) {
        return Response.json({ error: "User ID must be 3–32 characters (letters, numbers, dot, underscore, hyphen)." }, { status: 400, headers: corsHeaders });
      }
      if (fullName.length < 2 || fullName.length > 100) {
        return Response.json({ error: "Enter a valid full name." }, { status: 400, headers: corsHeaders });
      }
      if (password.length < 12) {
        return Response.json({ error: "Password must contain at least 12 characters." }, { status: 400, headers: corsHeaders });
      }
      if (!["supervisor", "storekeeper"].includes(role)) {
        return Response.json({ error: "Admin can create Supervisor or Store Keeper accounts only." }, { status: 400, headers: corsHeaders });
      }
      if (role === "supervisor" && !siteId) {
        return Response.json({ error: "Select a site for the Supervisor." }, { status: 400, headers: corsHeaders });
      }
      if (role === "storekeeper" && siteId) {
        return Response.json({ error: "Store Keeper accounts are not assigned to a single site." }, { status: 400, headers: corsHeaders });
      }

      if (siteId) {
        const { data: site, error: siteError } = await ctx.supabase
          .from("sites").select("id").eq("id", siteId).eq("is_active", true).maybeSingle();
        if (siteError || !site) return Response.json({ error: "Selected site is invalid or inactive." }, { status: 400, headers: corsHeaders });
      }

      const email = userId + "@ptc-garage.local";
      const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role, site_id: siteId },
        user_metadata: {},
      });
      if (createError || !created.user) {
        return Response.json({ error: createError?.message ?? "Unable to create account." }, { status: 400, headers: corsHeaders });
      }

      const { error: profileError } = await ctx.supabaseAdmin.from("profiles").insert({
        user_id: created.user.id,
        username: userId,
        full_name: fullName,
        role,
        site_id: siteId,
        is_active: true,
      });

      if (profileError) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);
        return Response.json({ error: "Account setup failed. No user was kept. " + profileError.message }, { status: 500, headers: corsHeaders });
      }

      return Response.json({ ok: true, user: { userId, fullName, role, siteId } }, { status: 201, headers: corsHeaders });
    } catch (_error) {
      return Response.json({ error: "Unexpected server error." }, { status: 500, headers: corsHeaders });
    }
  })
);