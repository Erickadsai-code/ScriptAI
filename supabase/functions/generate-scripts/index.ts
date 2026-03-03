import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    const { product, videoType, offer, idealClient, clientName, action, existingScript, scriptAngle } = await req.json();

    // Fetch GPT config from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: configs } = await supabase
      .from("gpt_config")
      .select("config_key, config_value")
      .in("config_key", ["system_prompt", "knowledge_base"]);

    const systemPrompt = configs?.find((c: any) => c.config_key === "system_prompt")?.config_value || "";
    const knowledgeBase = configs?.find((c: any) => c.config_key === "knowledge_base")?.config_value || "";

    // Fetch high-rated converting scripts as additional knowledge
    const { data: topScripts } = await supabase
      .from("scripts")
      .select("content, topic, social_network")
      .eq("status", "convierte")
      .gte("user_rating", 4)
      .order("user_rating", { ascending: false })
      .limit(10);

    let topScriptsContext = "";
    if (topScripts && topScripts.length > 0) {
      topScriptsContext = "\n\n---\n\n# GUIONES QUE HAN CONVERTIDO (REFERENCIA DE ESTILO)\n\n" +
        topScripts.map((s: any, i: number) => `## Ejemplo ${i + 1} (${s.social_network})\n${s.content}`).join("\n\n---\n\n");
    }

    // Fetch knowledge files
    const { data: knowledgeFiles } = await supabase
      .from("knowledge_files")
      .select("file_name, extracted_text")
      .not("extracted_text", "is", null);

    let knowledgeFilesContext = "";
    if (knowledgeFiles && knowledgeFiles.length > 0) {
      knowledgeFilesContext = "\n\n---\n\n# ARCHIVOS DE CONOCIMIENTO\n\n" +
        knowledgeFiles.map((f: any) => `## ${f.file_name}\n${f.extracted_text}`).join("\n\n---\n\n");
    }

    const fullSystemPrompt = [
      systemPrompt,
      knowledgeBase ? `\n\n---\n\n# BASE DE CONOCIMIENTO (REFERENTES)\n\n${knowledgeBase}` : "",
      knowledgeFilesContext,
      topScriptsContext,
      "\n\nIMPORTANTE: NO incluyas análisis, inferencias, comentarios ni explicaciones previas. Ve directo a los guiones. Solo entrega los guiones en el formato especificado, separados por ---GUION---."
    ].join("");

    let userPrompt: string;

    if (action === "regenerate") {
      userPrompt = `Regenera una variante MEJOR del siguiente guion. Mantén el mismo ángulo psicológico (${scriptAngle}) y tipo de video, pero mejora los hooks, el desarrollo y el CTA. Hazlo más persuasivo y con mejor ritmo de lectura.

Guion original:
${existingScript}

Contexto:
- Producto/Servicio: ${product}
- Tipo de video: ${videoType}
- Oferta y CTA: ${offer}
- Cliente ideal: ${idealClient}
${clientName ? `- Marca/Cliente: ${clientName}` : ""}

Entrega SOLO el guion mejorado, sin comentarios ni análisis previos. Sin separador ---GUION---.`;
    } else {
      userPrompt = `Genera 10 guiones de respuesta directa con la siguiente información:

- Producto/Servicio: ${product}
- Tipo de video: ${videoType}
- Oferta y CTA: ${offer}
- Cliente ideal y dolor principal: ${idealClient}
${clientName ? `- Marca/Cliente: ${clientName}` : ""}

IMPORTANTE: Ve directo a los guiones. NO incluyas análisis, inferencias, comentarios de avatar, tono ni explicaciones previas. Solo los 10 guiones.

Recuerda:
- Exactamente 10 guiones separados por "---GUION---"
- Mínimo 40 segundos cada uno (apunta a 45-60s)
- Formato: GUION #N — [Ángulo] con secciones HOOK, DESARROLLO, CTA y Nota de producción
- Indica qué Tipo de Video (1-6) usas en cada guion y por qué
- Varía los 10 ángulos psicológicos obligatorios
- Frases cortas, máximo 12 palabras
- Ofrece 3 variantes de hook alternativas al final de toda la entrega`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Agrega fondos en tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Error del gateway IA: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (action === "regenerate") {
      return new Response(JSON.stringify({ regenerated: content.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variations = content
      .split("---GUION---")
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);

    return new Response(JSON.stringify({ variations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scripts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
