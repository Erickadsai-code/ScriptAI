import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Sparkles,
  Send,
  Check,
  Loader2,
  Image as ImageIcon,
  Video,
  RefreshCw,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";

type ContentDraft = {
  id: string;
  media_url: string;
  media_type: string;
  content_type: string;
  generated_copy: string | null;
  approved_copy: string | null;
  status: string;
  ig_permalink: string | null;
  error_message: string | null;
  connection_id: string | null;
  client_id: string | null;
  script_id: string | null;
  created_at: string;
};

const ContentCreator = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Config state
  const [contentType, setContentType] = useState<"post" | "reel">("post");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("profesional");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState("");

  // Data
  const [connections, setConnections] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);

  // Draft state
  const [currentDraft, setCurrentDraft] = useState<ContentDraft | null>(null);
  const [editedCopy, setEditedCopy] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // History
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [connectionsRes, clientsRes, scriptsRes, draftsRes] = await Promise.all([
      supabase.from("social_connections").select("id, account_name, account_id, platform, client_id, clients(name)"),
      supabase.from("clients").select("id, name"),
      supabase.from("scripts").select("id, title, content, status").in("status", ["approved", "published", "with_metrics"]),
      supabase.from("content_drafts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (connectionsRes.data) setConnections(connectionsRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (scriptsRes.data) setScripts(scriptsRes.data);
    if (draftsRes.data) setDrafts(draftsRes.data as ContentDraft[]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isVideo = selected.type.startsWith("video/");
    const isImage = selected.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast({ title: "Error", description: "Solo se permiten imágenes o videos", variant: "destructive" });
      return;
    }

    setFile(selected);
    setContentType(isVideo ? "reel" : "post");

    const url = URL.createObjectURL(selected);
    setFilePreview(url);
  };

  const uploadAndGenerate = async () => {
    if (!file || !selectedConnectionId) {
      toast({ title: "Error", description: "Selecciona un archivo y una cuenta de Instagram", variant: "destructive" });
      return;
    }

    setUploading(true);
    setGenerating(true);

    try {
      // Upload file to storage
      const ext = file.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("content-media")
        .getPublicUrl(fileName);

      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      // Create draft
      const { data: draft, error: draftError } = await supabase
        .from("content_drafts")
        .insert({
          user_id: user?.id,
          connection_id: selectedConnectionId,
          client_id: selectedClientId || null,
          script_id: selectedScriptId || null,
          media_url: publicUrl,
          media_type: mediaType,
          content_type: contentType,
          status: "generating",
        })
        .select()
        .single();

      if (draftError) throw draftError;

      setUploading(false);

      // Get client name for context
      const clientName = clients.find(c => c.id === selectedClientId)?.name;

      // Get script content if selected
      let fullContext = context;
      if (selectedScriptId) {
        const script = scripts.find(s => s.id === selectedScriptId);
        if (script) {
          fullContext = `${context}\n\nScript de referencia: ${script.content}`.trim();
        }
      }

      // Generate copy with AI
      const { data: copyData, error: copyError } = await supabase.functions.invoke("generate-copy", {
        body: {
          mediaUrl: publicUrl,
          mediaType,
          contentType,
          context: fullContext,
          clientName,
          tone,
        },
      });

      if (copyError) throw copyError;

      const generatedCopy = copyData?.copy || "";

      // Update draft
      await supabase
        .from("content_drafts")
        .update({ generated_copy: generatedCopy, status: "pending_approval" })
        .eq("id", draft.id);

      const updatedDraft = { ...draft, generated_copy: generatedCopy, status: "pending_approval" } as ContentDraft;
      setCurrentDraft(updatedDraft);
      setEditedCopy(generatedCopy);
      setDrafts(prev => [updatedDraft, ...prev]);

      toast({ title: "¡Copy generado!", description: "Revisa y aprueba el copy antes de publicar." });
    } catch (e: any) {
      console.error("Error:", e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setGenerating(false);
    }
  };

  const regenerateCopy = async () => {
    if (!currentDraft) return;
    setGenerating(true);

    try {
      const clientName = clients.find(c => c.id === selectedClientId)?.name;
      let fullContext = context;
      if (selectedScriptId) {
        const script = scripts.find(s => s.id === selectedScriptId);
        if (script) fullContext = `${context}\n\nScript de referencia: ${script.content}`.trim();
      }

      const { data, error } = await supabase.functions.invoke("generate-copy", {
        body: {
          mediaUrl: currentDraft.media_url,
          mediaType: currentDraft.media_type,
          contentType: currentDraft.content_type,
          context: fullContext,
          clientName,
          tone,
        },
      });

      if (error) throw error;

      const newCopy = data?.copy || "";
      setEditedCopy(newCopy);
      await supabase.from("content_drafts").update({ generated_copy: newCopy }).eq("id", currentDraft.id);
      setCurrentDraft(prev => prev ? { ...prev, generated_copy: newCopy } : null);

      toast({ title: "Copy regenerado" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const approveDraft = async () => {
    if (!currentDraft) return;

    await supabase
      .from("content_drafts")
      .update({ approved_copy: editedCopy, status: "approved" })
      .eq("id", currentDraft.id);

    setCurrentDraft(prev => prev ? { ...prev, approved_copy: editedCopy, status: "approved" } : null);
    toast({ title: "✅ Copy aprobado", description: "Listo para publicar en Instagram." });
  };

  const publishToInstagram = async () => {
    if (!currentDraft) return;
    setPublishing(true);

    try {
      const { data, error } = await supabase.functions.invoke("publish-instagram", {
        body: { draft_id: currentDraft.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCurrentDraft(prev => prev ? {
        ...prev,
        status: "published",
        ig_permalink: data.permalink,
      } : null);

      toast({ title: "🎉 ¡Publicado!", description: "Tu contenido ya está en Instagram." });
    } catch (e: any) {
      toast({ title: "Error al publicar", description: e.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFilePreview(null);
    setCurrentDraft(null);
    setEditedCopy("");
    setContext("");
    setSelectedScriptId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Borrador", variant: "secondary" },
    generating: { label: "Generando...", variant: "outline" },
    pending_approval: { label: "Pendiente", variant: "default" },
    approved: { label: "Aprobado", variant: "default" },
    publishing: { label: "Publicando...", variant: "outline" },
    published: { label: "Publicado", variant: "default" },
    failed: { label: "Error", variant: "destructive" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold gradient-text">Crear Contenido</h1>
        {currentDraft && (
          <Button variant="outline" onClick={resetForm} className="gap-2">
            <X className="w-4 h-4" /> Nuevo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload & Config */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Subir Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!filePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Haz clic para subir imagen o video</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, MP4, MOV</p>
                </div>
              ) : (
                <div className="relative">
                  {file?.type.startsWith("video/") ? (
                    <video src={filePreview} controls className="w-full rounded-lg max-h-64 object-cover" />
                  ) : (
                    <img src={filePreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => { setFile(null); setFilePreview(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Badge className="absolute bottom-2 left-2" variant="secondary">
                    {file?.type.startsWith("video/") ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                    {contentType === "reel" ? "Reel" : "Post"}
                  </Badge>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cuenta de Instagram *</Label>
                <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona cuenta" /></SelectTrigger>
                  <SelectContent>
                    {connections.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        @{c.account_name || c.account_id} {(c as any).clients?.name ? `(${(c as any).clients.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de publicación</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as "post" | "reel")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post de Feed</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cliente (opcional)</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Script de referencia (opcional)</Label>
                <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                  <SelectTrigger><SelectValue placeholder="Sin script" /></SelectTrigger>
                  <SelectContent>
                    {scripts.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tono</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="agresivo">Agresivo / Confrontativo</SelectItem>
                    <SelectItem value="inspiracional">Inspiracional</SelectItem>
                    <SelectItem value="educativo">Educativo</SelectItem>
                    <SelectItem value="casual">Casual / Cercano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contexto adicional (opcional)</Label>
                <Textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Describe el contenido del video/imagen o agrega instrucciones..."
                  rows={3}
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={uploadAndGenerate}
                disabled={!file || !selectedConnectionId || uploading || generating}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                ) : generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generando copy...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Subir y Generar Copy</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Copy preview & actions */}
        <div className="space-y-4">
          {currentDraft ? (
            <>
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Copy Generado
                    </CardTitle>
                    <Badge variant={statusLabels[currentDraft.status]?.variant || "secondary"}>
                      {statusLabels[currentDraft.status]?.label || currentDraft.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={editedCopy}
                    onChange={e => setEditedCopy(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="El copy aparecerá aquí..."
                    disabled={currentDraft.status === "published"}
                  />

                  {currentDraft.status === "pending_approval" && (
                    <div className="flex gap-2">
                      <Button onClick={regenerateCopy} variant="outline" className="gap-2" disabled={generating}>
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Regenerar
                      </Button>
                      <Button onClick={approveDraft} className="gap-2 flex-1">
                        <Check className="w-4 h-4" /> Aprobar Copy
                      </Button>
                    </div>
                  )}

                  {currentDraft.status === "approved" && (
                    <Button
                      onClick={publishToInstagram}
                      className="w-full gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      disabled={publishing}
                    >
                      {publishing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Publicando en Instagram...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Publicar en Instagram</>
                      )}
                    </Button>
                  )}

                  {currentDraft.status === "published" && currentDraft.ig_permalink && (
                    <a
                      href={currentDraft.ig_permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver en Instagram
                    </a>
                  )}

                  {currentDraft.status === "failed" && currentDraft.error_message && (
                    <p className="text-sm text-destructive">{currentDraft.error_message}</p>
                  )}
                </CardContent>
              </Card>

              {/* Media preview */}
              {currentDraft.media_url && (
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    {currentDraft.media_type === "video" ? (
                      <video src={currentDraft.media_url} controls className="w-full rounded-lg max-h-80" />
                    ) : (
                      <img src={currentDraft.media_url} alt="Media" className="w-full rounded-lg max-h-80 object-cover" />
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Sube una imagen o video</p>
                <p className="text-sm mt-1">La IA generará un copy optimizado para Instagram</p>
              </CardContent>
            </Card>
          )}

          {/* Recent drafts */}
          {drafts.length > 0 && !currentDraft && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Historial Reciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {drafts.slice(0, 5).map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setCurrentDraft(d); setEditedCopy(d.approved_copy || d.generated_copy || ""); }}
                  >
                    <div className="flex items-center gap-3">
                      {d.media_type === "video" ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      <span className="text-sm truncate max-w-48">
                        {d.generated_copy?.slice(0, 50) || "Sin copy"}...
                      </span>
                    </div>
                    <Badge variant={statusLabels[d.status]?.variant || "secondary"} className="text-xs">
                      {statusLabels[d.status]?.label || d.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentCreator;
