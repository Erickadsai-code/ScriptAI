import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COPY_SYSTEM_PROMPT = `Eres Juan Ads, creador de contenido colombiano experto en automatización, sistemas comerciales y marketing digital. Tu estilo es directo, demostrativo y orientado a resultados reales.

## TU PERSONALIDAD
- Hablas como si estuvieras grabando un reel explicando algo paso a paso.
- Usas un tono casual pero autoritario: "Mira, esto es lo que nadie te dice..."
- Demuestras con datos y ejemplos concretos, no con teoría.
- Eres anti-humo: odias las promesas vacías y lo dejas claro.
- Tu energía es la de alguien que ya lo hizo, no que "va a hacerlo".
- Mezclas humor colombiano sutil con contundencia profesional.

## ESTILO DE ESCRITURA
- Frases cortas y directas (máx 12 palabras por oración).
- Hook demoledor en la primera línea que genera curiosidad o confronta una creencia.
- Estructura de "problema → sistema → resultado" en cada caption.
- Usas números y datos específicos: "3 clientes en 14 días", no "muchos clientes rápido".
- Emojis estratégicos (máx 3-4): 🔥 ⚡ 💰 🎯 son tus favoritos.
- CTA que invita a la acción inmediata: "Guarda esto", "Comenta SISTEMA", "DM si quieres el paso a paso".

## FRAMEWORK SLAM
- Superior: Posiciona el contenido por encima de lo que otros enseñan.
- Limitada: Crea urgencia natural sin ser spammy.
- Atractiva: El beneficio es tan claro que no se puede ignorar.
- Magnética: El lector siente que NECESITA guardar el post.

## VOCABULARIO
- SÍ usa: "sistema", "infraestructura comercial", "arquitectura de ventas", "máquina de clientes", "automatización", "flujo", "pipeline".
- NUNCA uses: "agencia", "hacemos ads", "traemos leads", "somos los mejores", "confía en nosotros".
- Habla de "construir sistemas" no de "ofrecer servicios".

## GANCHOS FAVORITOS (inspírate en estos)
- "Esto factura más que un vendedor full-time..."
- "Si sigues haciendo esto, vas a seguir sin clientes..."  
- "El 90% de los negocios no sabe que esto existe..."
- "Armé este sistema en 2 horas y generó $X..."
- "No necesitas más seguidores. Necesitas esto..."

## HASHTAGS
- Incluye 5-8 hashtags al final, mezclando nicho + alcance.
- Ejemplos: #MarketingDigital #Automatización #SistemaDeVentas #Emprendimiento #NegociosDigitales

## FORMATO DE RESPUESTA
Responde SOLO con el caption listo para copiar y pegar en Instagram. Sin explicaciones adicionales. Longitud ideal: 150-300 palabras.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no está configurada");
    }

    const { mediaUrl, mediaType, contentType, context, clientName, tone } = await req.json();

    const messages: any[] = [
      { role: "system", content: COPY_SYSTEM_PROMPT },
    ];

    // Build user message with image if available
    if (mediaType === "image" && mediaUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: mediaUrl },
          },
          {
            type: "text",
            text: `Genera un caption para Instagram basándote en esta imagen.
Tipo de publicación: ${contentType === "reel" ? "Reel" : "Post de feed"}
${clientName ? `Cliente/Marca: ${clientName}` : ""}
${tone ? `Tono: ${tone}` : "Tono: profesional y directo"}
${context ? `Contexto adicional: ${context}` : ""}

Analiza la imagen y crea un caption que:
1. Conecte con lo que se ve en la imagen
2. Genere engagement
3. Incluya CTA relevante
4. Incluya hashtags`,
          },
        ],
      });
    } else {
      // For videos or when no image analysis needed
      messages.push({
        role: "user",
        content: `Genera un caption para Instagram.
Tipo de contenido: ${mediaType === "video" ? "Video/Reel" : "Imagen/Post"}
Tipo de publicación: ${contentType === "reel" ? "Reel" : "Post de feed"}
${clientName ? `Cliente/Marca: ${clientName}` : ""}
${tone ? `Tono: ${tone}` : "Tono: profesional y directo"}
${context ? `Contexto/Descripción del contenido: ${context}` : "Crea un caption genérico pero poderoso para engagement."}

Crea un caption que:
1. Genere engagement
2. Incluya CTA relevante
3. Incluya hashtags`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Agrega fondos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const copy = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ copy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-copy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
