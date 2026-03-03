import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Trophy, Star } from "lucide-react";

const ClientTop10 = () => {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [scripts, setScripts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => setClients(data || []));
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setScripts([]);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, topic, social_network, user_rating, status, format_tags, clients(name), created_at")
        .eq("client_id", selectedClient)
        .eq("status", "convierte")
        .not("user_rating", "is", null)
        .order("user_rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      setScripts(data || []);
    };
    fetch();
  }, [selectedClient]);

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold font-display gradient-text"
      >
        Top 10 Guiones
      </motion.h1>

      <div className="glass p-4">
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[280px] bg-secondary/50">
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClient ? (
        <div className="glass p-12 text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Selecciona un cliente para ver sus mejores guiones.</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="glass p-12 text-center text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No hay guiones con estado "Convierte" para este cliente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                {i < 3 ? <Trophy className="w-5 h-5 text-primary-foreground" /> : <span className="font-bold text-primary-foreground">#{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.topic || s.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{s.clients?.name || "Sin cliente"}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{s.social_network}</span>
                </div>
                {s.format_tags && s.format_tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.format_tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="flex gap-0.5 justify-end">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${(s.user_rating || 0) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
                    />
                  ))}
                </div>
                <Badge className="bg-green-500/20 text-green-400">Convierte</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientTop10;
