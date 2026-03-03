import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Library, Trash2, Eye, Star } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusLabels: Record<string, string> = {
  draft: "Sin clasificar",
  convierte: "Convierte",
  no_convierte: "No convierte",
  mejorar: "Mejorar",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  convierte: "bg-green-500/20 text-green-400",
  no_convierte: "bg-destructive/20 text-destructive",
  mejorar: "bg-yellow-500/20 text-yellow-400",
};

const StarRating = ({ value, onChange, readonly = false }: { value: number | null; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => !readonly && onChange?.(star)}
        disabled={readonly}
        className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
      >
        <Star
          className={`w-4 h-4 ${(value || 0) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
        />
      </button>
    ))}
  </div>
);

const ScriptLibrary = () => {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [scripts, setScripts] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVideoType, setFilterVideoType] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [selectedScript, setSelectedScript] = useState<any>(null);

  const fetchScripts = async () => {
    let query = supabase
      .from("scripts")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterVideoType !== "all") query = query.eq("social_network", filterVideoType);
    if (filterClient !== "all") query = query.eq("client_id", filterClient);

    const { data } = await query;
    let filtered = data || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (sc) => sc.title?.toLowerCase().includes(s) || sc.content?.toLowerCase().includes(s) || sc.topic?.toLowerCase().includes(s)
      );
    }
    setScripts(filtered);
  };

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => setClients(data || []));
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [filterStatus, filterVideoType, filterClient, search]);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("scripts").update({ status: newStatus }).eq("id", id);
    fetchScripts();
    if (selectedScript?.id === id) setSelectedScript({ ...selectedScript, status: newStatus });
    toast({ title: "Estado actualizado" });
  };

  const updateRating = async (id: string, rating: number) => {
    await supabase.from("scripts").update({ user_rating: rating } as any).eq("id", id);
    fetchScripts();
    if (selectedScript?.id === id) setSelectedScript({ ...selectedScript, user_rating: rating });
    toast({ title: `Puntuación: ${rating} estrellas` });
  };

  const deleteScript = async (id: string) => {
    await supabase.from("scripts").delete().eq("id", id);
    fetchScripts();
    setSelectedScript(null);
    toast({ title: "Script eliminado" });
  };

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold font-display gradient-text"
      >
        Biblioteca de Scripts
      </motion.h1>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar scripts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px] bg-secondary/50"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Sin clasificar</SelectItem>
            <SelectItem value="convierte">Convierte</SelectItem>
            <SelectItem value="no_convierte">No convierte</SelectItem>
            <SelectItem value="mejorar">Mejorar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterVideoType} onValueChange={setFilterVideoType}>
          <SelectTrigger className="w-[200px] bg-secondary/50"><SelectValue placeholder="Tipo de Video" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Meta Ads">Meta Ads</SelectItem>
            <SelectItem value="Orgánico">Orgánico</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[200px] bg-secondary/50"><SelectValue placeholder="Todos los clientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scripts table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden">
        {scripts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Library className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No se encontraron scripts. ¡Genera tu primer script!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="p-3">Producto / Servicio</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Tipo de Video</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Puntuación</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-medium max-w-[200px] truncate">{s.topic || s.title}</td>
                    <td className="p-3 text-sm text-muted-foreground">{s.clients?.name || "—"}</td>
                    <td className="p-3 text-sm">{s.social_network || "—"}</td>
                    <td className="p-3">
                      <Badge className={statusColors[s.status] || ""}>{statusLabels[s.status] || s.status}</Badge>
                    </td>
                    <td className="p-3">
                      <StarRating value={s.user_rating} readonly />
                    </td>
                    <td className="p-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedScript(s)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteScript(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Detail dialog */}
      <Dialog open={!!selectedScript} onOpenChange={() => setSelectedScript(null)}>
        <DialogContent className="glass-strong max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text">{selectedScript?.topic || selectedScript?.title}</DialogTitle>
          </DialogHeader>
          {selectedScript && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge>{selectedScript.social_network || "—"}</Badge>
                <Badge className={statusColors[selectedScript.status]}>{statusLabels[selectedScript.status] || selectedScript.status}</Badge>
              </div>

              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Puntuación</span>
                <StarRating
                  value={selectedScript.user_rating}
                  onChange={(v) => updateRating(selectedScript.id, v)}
                />
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Estado</span>
                <Select
                  value={selectedScript.status}
                  onValueChange={(val) => updateStatus(selectedScript.id, val)}
                >
                  <SelectTrigger className="w-[200px] mt-1">
                    <SelectValue placeholder="Cambiar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Sin clasificar</SelectItem>
                    <SelectItem value="convierte">Convierte</SelectItem>
                    <SelectItem value="no_convierte">No convierte</SelectItem>
                    <SelectItem value="mejorar">Mejorar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Objetivo</span>
                <p className="text-sm mt-1">{selectedScript.objective}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Contenido</span>
                <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed bg-secondary/30 p-4 rounded-lg">{selectedScript.content}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptLibrary;
