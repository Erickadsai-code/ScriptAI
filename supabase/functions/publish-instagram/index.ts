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

    const { draft_id } = await req.json();
    if (!draft_id) {
      return new Response(JSON.stringify({ error: "draft_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get draft with connection info
    const { data: draft, error: draftError } = await supabase
      .from("content_drafts")
      .select("*, social_connections(account_id, access_token)")
      .eq("id", draft_id)
      .single();

    if (draftError || !draft) {
      return new Response(JSON.stringify({ error: "Draft not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (draft.status !== "approved") {
      return new Response(JSON.stringify({ error: "Draft must be approved before publishing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conn = draft.social_connections;
    const accessToken = conn?.access_token || Deno.env.get("META_ACCESS_TOKEN");
    const igAccountId = conn?.account_id;

    if (!accessToken || !igAccountId) {
      await supabase.from("content_drafts").update({ 
        status: "failed", 
        error_message: "No token or account ID available" 
      }).eq("id", draft_id);
      return new Response(JSON.stringify({ error: "No token or account available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to publishing
    await supabase.from("content_drafts").update({ status: "publishing" }).eq("id", draft_id);

    const caption = draft.approved_copy || draft.generated_copy || "";
    const mediaUrl = draft.media_url;
    const isReel = draft.content_type === "reel";

    try {
      // Step 1: Create media container
      let createUrl: string;
      if (isReel) {
        createUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?media_type=REELS&video_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      } else {
        createUrl = `https://graph.facebook.com/v21.0/${igAccountId}/media?image_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      }

      const createRes = await fetch(createUrl, { method: "POST" });
      const createData = await createRes.json();

      if (createData.error) {
        throw new Error(createData.error.message || "Failed to create media container");
      }

      const containerId = createData.id;

      // Step 2: For reels, wait for video processing
      if (isReel) {
        let ready = false;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(
            `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
          );
          const statusData = await statusRes.json();
          if (statusData.status_code === "FINISHED") {
            ready = true;
            break;
          }
          if (statusData.status_code === "ERROR") {
            throw new Error("Video processing failed on Instagram");
          }
        }
        if (!ready) {
          throw new Error("Video processing timed out");
        }
      }

      // Step 3: Publish
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
        { method: "POST" }
      );
      const publishData = await publishRes.json();

      if (publishData.error) {
        throw new Error(publishData.error.message || "Failed to publish");
      }

      // Get permalink
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${publishData.id}?fields=permalink&access_token=${accessToken}`
      );
      const mediaInfo = await mediaRes.json();

      // Update draft as published
      await supabase.from("content_drafts").update({
        status: "published",
        ig_media_id: publishData.id,
        ig_permalink: mediaInfo.permalink || null,
      }).eq("id", draft_id);

      return new Response(JSON.stringify({
        success: true,
        ig_media_id: publishData.id,
        permalink: mediaInfo.permalink,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (publishError) {
      const msg = publishError instanceof Error ? publishError.message : "Unknown error";
      await supabase.from("content_drafts").update({
        status: "failed",
        error_message: msg,
      }).eq("id", draft_id);

      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("publish-instagram error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
