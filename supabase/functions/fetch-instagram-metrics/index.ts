import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      action,
      connection_id,
      post_id,
      script_id,
      redirect_uri,
      code,
      state,
      user_access_token,
    } = body;

    const staticMetaToken = Deno.env.get("META_ACCESS_TOKEN");
    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");

    const buildAccountsData = async (accessToken: string) => {
      const [pagesRes, permissionsRes] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`
        ),
        fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`),
      ]);

      const pagesData = await pagesRes.json();
      const permissionsData = await permissionsRes.json();

      if (pagesData.error) {
        throw new Error(pagesData.error.message || "No se pudo listar páginas");
      }

      const pages = pagesData.data || [];
      const accounts = pages
        .filter((p: any) => p.instagram_business_account)
        .map((p: any) => ({
          page_id: p.id,
          page_name: p.name,
          ig_account_id: p.instagram_business_account.id,
          ig_name: p.instagram_business_account.name,
          ig_username: p.instagram_business_account.username,
          ig_profile_picture: p.instagram_business_account.profile_picture_url,
        }));

      const grantedPermissions = (permissionsData?.data || [])
        .filter((p: any) => p.status === "granted")
        .map((p: any) => p.permission);

      const hints: string[] = [];
      if (pages.length === 0) {
        hints.push("El token no tiene páginas de Facebook disponibles para este usuario.");
      }
      if (pages.length > 0 && accounts.length === 0) {
        hints.push("Tus páginas existen, pero no tienen una cuenta de Instagram Business conectada.");
      }
      if (!grantedPermissions.includes("pages_show_list")) {
        hints.push("Falta permiso pages_show_list.");
      }
      if (!grantedPermissions.includes("instagram_basic")) {
        hints.push("Falta permiso instagram_basic.");
      }
      if (!grantedPermissions.includes("instagram_manage_insights")) {
        hints.push("Falta permiso instagram_manage_insights.");
      }

      return {
        accounts,
        debug: {
          pages_count: pages.length,
          pages_with_ig_count: accounts.length,
          granted_permissions: grantedPermissions,
          hints,
        },
      };
    };

    // Action: get_oauth_url - Build Meta OAuth URL for redirect flow
    if (action === "get_oauth_url") {
      if (!redirect_uri || !state) {
        return new Response(JSON.stringify({ error: "redirect_uri and state required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!appId) {
        return new Response(JSON.stringify({ error: "META_APP_ID not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scopes = [
        "pages_show_list",
        "instagram_basic",
        "instagram_manage_insights",
        "pages_read_engagement",
        "instagram_content_publish",
        "pages_manage_posts",
      ].join(",");

      const url =
        `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code&auth_type=rerequest`;

      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: exchange_oauth_code - Exchange OAuth code for token and accounts
    if (action === "exchange_oauth_code") {
      if (!code || !redirect_uri || !state) {
        return new Response(JSON.stringify({ error: "code, redirect_uri and state required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!appId || !appSecret) {
        return new Response(
          JSON.stringify({ error: "META_APP_ID or META_APP_SECRET not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(
          redirect_uri
        )}&code=${encodeURIComponent(code)}`
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(
          JSON.stringify({
            error: tokenData?.error?.message || "No se pudo obtener access token",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const longTokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(
          tokenData.access_token
        )}`
      );
      const longTokenData = await longTokenRes.json();
      const finalToken = longTokenData?.access_token || tokenData.access_token;

      try {
        const accountsData = await buildAccountsData(finalToken);
        return new Response(
          JSON.stringify({
            access_token: finalToken,
            ...accountsData,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (accountsError) {
        const msg = accountsError instanceof Error ? accountsError.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: list_accounts - Get Instagram Business accounts linked to token
    if (action === "list_accounts") {
      const listToken = user_access_token || staticMetaToken;

      if (!listToken) {
        return new Response(
          JSON.stringify({ error: "META_ACCESS_TOKEN not configured and no user token provided" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const accountsData = await buildAccountsData(listToken);
        return new Response(JSON.stringify(accountsData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (accountsError) {
        const msg = accountsError instanceof Error ? accountsError.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Action: fetch_media - Get recent media for an IG account
    if (action === "fetch_media") {
      if (!connection_id) {
        return new Response(JSON.stringify({ error: "connection_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conn } = await supabase
        .from("social_connections")
        .select("account_id, access_token")
        .eq("id", connection_id)
        .single();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mediaToken = conn.access_token || staticMetaToken;
      if (!mediaToken) {
        return new Response(JSON.stringify({ error: "No token available for this connection" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=25&access_token=${mediaToken}`
      );
      const mediaData = await mediaRes.json();

      if (mediaData.error) {
        return new Response(JSON.stringify({ error: mediaData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ media: mediaData.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: fetch_insights - Get insights for a specific media
    if (action === "fetch_insights") {
      if (!post_id || !script_id || !connection_id) {
        return new Response(
          JSON.stringify({ error: "post_id, script_id, and connection_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: conn } = await supabase
        .from("social_connections")
        .select("access_token")
        .eq("id", connection_id)
        .maybeSingle();

      const insightsToken = conn?.access_token || staticMetaToken;
      if (!insightsToken) {
        return new Response(JSON.stringify({ error: "No token available for this connection" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get media details
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${post_id}?fields=id,caption,media_type,permalink,like_count,comments_count,timestamp&access_token=${insightsToken}`
      );
      const media = await mediaRes.json();

      if (media.error) {
        return new Response(JSON.stringify({ error: media.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get insights (metrics vary by media type)
      const metrics = "impressions,reach,saved,shares,video_views,plays";
      const insightsRes = await fetch(
        `https://graph.facebook.com/v21.0/${post_id}/insights?metric=${metrics}&access_token=${insightsToken}`
      );
      const insightsData = await insightsRes.json();

      const insightsMap: Record<string, number> = {};
      if (insightsData.data) {
        for (const item of insightsData.data) {
          insightsMap[item.name] = item.values?.[0]?.value || 0;
        }
      }

      const views = insightsMap.video_views || insightsMap.plays || 0;
      const reach = insightsMap.reach || 0;
      const impressions = insightsMap.impressions || 0;
      const saves = insightsMap.saved || 0;
      const shares = insightsMap.shares || 0;
      const likes = media.like_count || 0;
      const comments = media.comments_count || 0;
      const totalInteractions = likes + comments + saves + shares;
      const engagementRate = reach > 0 ? (totalInteractions / reach) * 100 : 0;

      // Upsert metrics
      const { data: existing } = await supabase
        .from("social_metrics")
        .select("id")
        .eq("script_id", script_id)
        .eq("post_id", post_id)
        .maybeSingle();

      const metricsPayload = {
        script_id,
        connection_id,
        platform: "instagram",
        post_id,
        post_url: media.permalink,
        views,
        likes,
        comments,
        shares,
        saves,
        reach,
        impressions,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        fetched_at: new Date().toISOString(),
        raw_data: { media, insights: insightsMap },
      };

      if (existing) {
        await supabase.from("social_metrics").update(metricsPayload).eq("id", existing.id);
      } else {
        await supabase.from("social_metrics").insert(metricsPayload);
      }

      // Update script performance_score
      const perfScore = Math.min(100, Math.round(engagementRate * 10));
      await supabase
        .from("scripts")
        .update({
          views,
          interactions: totalInteractions,
          reach,
          ctr: engagementRate,
          performance_score: perfScore,
          status: "with_metrics",
        })
        .eq("id", script_id);

      return new Response(JSON.stringify({ success: true, metrics: metricsPayload }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
