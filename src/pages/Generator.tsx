import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Sparkles, Copy, Save, Check, Loader2, RefreshCw } from "lucide-react";

const videoTypes = [
  { value: "meta_ads", label: "Meta Ads (Video Ads)" },
  { value: "organico_reels", label: "Orgánico (Reels/TikTok/Shorts)" },
];

const Generator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [savedIndexes, setSavedIndexes] = useState<number[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    product: "",
    videoType: "",
    offer: "",
    idealClient: "",
  });

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      setClients(data || []);
    });
  }, []);

  const generate = async () => {
    if (!form.product || !form.videoType || !form.offer || !form.idealClient) {
      toast({ title: "Error", description: "Completa los 4 campos obligatorios.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setVariations([]);
    setSavedIndexes([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-scripts", {
        body: {
          product: form.product,
          videoType: form.videoType === "meta_ads" ? "Meta Ads (Video Ads)" : "Orgánico (Reels/TikTok/Shorts)",
          offer: form.offer,
          idealClient: form.idealClient,
          clientName: clients.find((c) => c.id === form.clientId)?.name || "",
        },
      });

      if (error) throw error;
      setVariations(data.variations || []);
    } catch (err: any) {
      toast({ title: "Error al generar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const regenerateScript = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      // Extract angle from the script text (e.g., "GUION #1 — El Dolor Directo")
      const scriptText = variations[index];
      const angleMatch = scriptText.match(/GUION\s*#\d+\s*[—–-]\s*(.+?)(?:\n|$)/i);
      const scriptAngle = angleMatch ? angleMatch[1].trim() : `Ángulo ${index + 1}`;

      const { data, error } = await supabase.functions.invoke("generate-scripts", {
        body: {
          action: "regenerate",
          existingScript: scriptText,
          scriptAngle,
          product: form.product,
          videoType: form.videoType === "meta_ads" ? "Meta Ads (Video Ads)" : "Orgánico (Reels/TikTok/Shorts)",
          offer: form.offer,
          idealClient: form.idealClient,
          clientName: clients.find((c) => c.id === form.clientId)?.name || "",
        },
      });

      if (error) throw error;
      if (data.regenerated) {
        setVariations((prev) => prev.map((v, i) => (i === index ? data.regenerated : v)));
        // Remove from saved if it was saved
        setSavedIndexes((prev) => prev.filter((i) => i !== index));
        toast({ title: "¡Regenerado!", description: "Se generó una nueva variante del guion." });
      }
    } catch (err: any) {
      toast({ title: "Error al regenerar", description: err.message, variant: "destructive" });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const saveAsDraft = async (content: string, index: number) => {
    const title = form.product.slice(0, 100);

    const { error } = await supabase.from("scripts").insert({
      title,
      content,
      social_network: form.videoType === "meta_ads" ? "Meta Ads" : "Orgánico",
      objective: form.offer.slice(0, 200),
      tone: form.videoType === "meta_ads" ? "directo" : "natural",
      topic: form.product || null,
      client_id: form.clientId || null,
      collaborator_id: user?.id,
      status: "draft",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSavedIndexes((prev) => [...prev, index]);
      toast({ title: "¡Guardado!", description: "Script guardado como borrador." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "¡Copiado!", description: "Script copiado al portapapeles." });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold font-display gradient-text"
      >
        Generador de Scripts
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente (opcional)</Label>
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
              <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>¿Los videos son para Orgánico o Meta Ads? *</Label>
            <Select value={form.videoType} onValueChange={(v) => setForm({ ...form, videoType: v })}>
              <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar tipo de video" /></SelectTrigger>
              <SelectContent>
                {videoTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>¿Qué producto o servicio vendes exactamente? *</Label>
          <Textarea
            placeholder="Ej: Curso de automatización con IA para negocios digitales, Agencia de marketing para clínicas estéticas, Software SaaS de gestión..."
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            className="bg-secondary/50 border-border min-h-[70px]"
          />
        </div>

        <div className="space-y-2">
          <Label>¿Cuál es tu oferta concreta y el CTA? *</Label>
          <Textarea
            placeholder="Ej: Precio $997, garantía 30 días, bono de plantillas incluido, CTA: agendar llamada gratuita..."
            value={form.offer}
            onChange={(e) => setForm({ ...form, offer: e.target.value })}
            className="bg-secondary/50 border-border min-h-[70px]"
          />
        </div>

        <div className="space-y-2">
          <Label>¿Quién es tu cliente ideal y cuál es su mayor dolor? *</Label>
          <Textarea
            placeholder="Ej: Emprendedores digitales que facturan $5K-$20K/mes, frustrados porque invierten en ads pero solo llegan curiosos que nunca compran..."
            value={form.idealClient}
            onChange={(e) => setForm({ ...form, idealClient: e.target.value })}
            className="bg-secondary/50 border-border min-h-[70px]"
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          className="w-full gradient-primary hover:opacity-90 glow-blue"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando 10 guiones con IA...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generar 10 Guiones
            </span>
          )}
        </Button>
      </motion.div>

      {variations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-display">Guiones Generados ({variations.length})</h2>
          {variations.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="glass p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-accent">Guión {i + 1}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(v)}>
                    <Copy className="w-4 h-4 mr-1" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => regenerateScript(i)}
                    disabled={regeneratingIndex === i}
                  >
                    {regeneratingIndex === i ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Regenerando...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-1" /> Regenerar</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveAsDraft(v, i)}
                    disabled={savedIndexes.includes(i)}
                  >
                    {savedIndexes.includes(i) ? (
                      <><Check className="w-4 h-4 mr-1" /> Guardado</>
                    ) : (
                      <><Save className="w-4 h-4 mr-1" /> Guardar</>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{v}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Generator;
