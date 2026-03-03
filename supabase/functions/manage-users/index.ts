import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, email, password, fullName, userId } = await req.json();

    // All actions require admin auth
    let caller: any = null;
    {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No autorizado");

      const token = authHeader.replace("Bearer ", "");
      // Decode JWT payload directly to avoid session_not_found errors
      const payloadBase64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.sub) throw new Error("No autorizado");
      caller = { id: payload.sub, email: payload.email };

      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleCheck) throw new Error("Solo administradores pueden gestionar usuarios");
    }

    if (action === "list") {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");

      const enriched = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: profiles?.find((p: any) => p.user_id === u.id)?.full_name || "",
        role: roles?.find((r: any) => r.user_id === u.id)?.role || "collaborator",
        created_at: u.created_at,
        banned: u.banned_until ? (new Date(u.banned_until) > new Date()) : false,
      }));

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      if (!email || !password) throw new Error("Email y contraseña requeridos");

      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "" },
      });
      if (error) throw error;

      return new Response(JSON.stringify({ user: { id: newUser.user.id, email, password } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle-access") {
      if (!userId) throw new Error("userId requerido");
      if (userId === caller.id) throw new Error("No puedes desactivar tu propia cuenta");

      const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
      if (!targetUser) throw new Error("Usuario no encontrado");

      const isBanned = targetUser.banned_until ? (new Date(targetUser.banned_until) > new Date()) : false;

      if (isBanned) {
        await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
      } else {
        await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      }

      return new Response(JSON.stringify({ success: true, banned: !isBanned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-credentials") {
      if (!userId) throw new Error("userId requerido");

      const updates: any = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (fullName !== undefined) {
        updates.user_metadata = { full_name: fullName };
      }

      const { error } = await supabase.auth.admin.updateUserById(userId, updates);
      if (error) throw error;

      // Update profile name if provided
      if (fullName !== undefined) {
        await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!userId) throw new Error("userId requerido");
      if (userId === caller.id) throw new Error("No puedes eliminar tu propia cuenta");

      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Acción no válida");
  } catch (e) {
    console.error("manage-users error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
