import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Activity, Plus, Trash2, Brain, Save, Loader2, KeyRound } from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import KnowledgeFileUpload from "@/components/admin/KnowledgeFileUpload";

const Admin = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [activity, setActivity] = useState<any[]>([]);

  // GPT Config state
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setActivity(data || []);
  };

  const fetchGptConfig = async () => {
    const { data } = await supabase
      .from("gpt_config")
      .select("config_key, config_value")
      .in("config_key", ["system_prompt", "knowledge_base"]);

    if (data) {
      const prompt = data.find((c: any) => c.config_key === "system_prompt");
      const knowledge = data.find((c: any) => c.config_key === "knowledge_base");
      if (prompt) setSystemPrompt(prompt.config_value);
      if (knowledge) setKnowledgeBase(knowledge.config_value);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchActivity();
    fetchGptConfig();
  }, []);

  const addClient = async () => {
    if (!newClientName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("clients").insert({ name: newClientName.trim(), user_id: user?.id } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewClientName("");
      fetchClients();
      toast({ title: "Cliente agregado" });
    }
  };

  const deleteClient = async (id: string) => {
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
    toast({ title: "Cliente eliminado" });
  };

  const saveGptConfig = async () => {
    setSavingConfig(true);
    try {
      const { error: e1 } = await supabase
        .from("gpt_config")
        .update({ config_value: systemPrompt })
        .eq("config_key", "system_prompt");

      const { error: e2 } = await supabase
        .from("gpt_config")
        .update({ config_value: knowledgeBase })
        .eq("config_key", "knowledge_base");

      if (e1 || e2) {
        toast({ title: "Error", description: (e1 || e2)?.message, variant: "destructive" });
      } else {
        toast({ title: "¡Guardado!", description: "Configuración del GPT actualizada correctamente." });
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const actionLabels: Record<string, string> = {
    created: "Creado",
    updated: "Actualizado",
    deleted: "Eliminado",
    published: "Publicado",
  };

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold font-display gradient-text"
      >
        Administración
      </motion.h1>

      <Tabs defaultValue="access">
        <TabsList className="glass">
          <TabsTrigger value="access" className="gap-2"><KeyRound className="w-4 h-4" /> Accesos</TabsTrigger>
          <TabsTrigger value="clients" className="gap-2"><Building className="w-4 h-4" /> Clientes</TabsTrigger>
          <TabsTrigger value="gpt" className="gap-2"><Brain className="w-4 h-4" /> GPT Config</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="w-4 h-4" /> Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-4">
          <div className="glass p-4 flex gap-3">
            <Input
              placeholder="Nombre del nuevo cliente"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="bg-secondary/50 border-border"
              onKeyDown={(e) => e.key === "Enter" && addClient()}
            />
            <Button onClick={addClient} className="gradient-primary shrink-0">
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="glass p-3 flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteClient(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No hay clientes registrados.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gpt" className="mt-4 space-y-4">
          <div className="glass p-5 space-y-4">
            <div>
              <h3 className="text-lg font-semibold font-display mb-1">Instrucciones del Sistema</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Define el rol, personalidad, tipos de video, formato de guiones y reglas de escritura del GPT.
              </p>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="bg-secondary/50 border-border min-h-[300px] font-mono text-xs"
                placeholder="Instrucciones del sistema..."
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold font-display mb-1">Base de Conocimiento</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Transcripciones de referentes, frameworks de copywriting, patrones y ejemplos reales que alimentan al GPT.
              </p>
              <Textarea
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                className="bg-secondary/50 border-border min-h-[200px] font-mono text-xs"
                placeholder="Base de conocimiento..."
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold font-display mb-1">Archivos de Conocimiento</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sube archivos (PDF, documentos, texto, imágenes, audio) para alimentar la memoria del GPT.
              </p>
              <KnowledgeFileUpload />
            </div>

            <Button
              onClick={saveGptConfig}
              disabled={savingConfig}
              className="gradient-primary hover:opacity-90"
            >
              {savingConfig ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Configuración GPT
                </span>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="glass p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.entity_type}</Badge>
                    <span className="text-sm">{actionLabels[a.action] || a.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No hay actividad registrada.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
