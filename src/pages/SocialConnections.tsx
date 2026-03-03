import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Instagram, Link2, RefreshCw, BarChart3, Loader2 } from "lucide-react";

type InstagramDebug = {
  pages_count: number;
  pages_with_ig_count: number;
  granted_permissions: string[];
  hints: string[];
};

const SocialConnections = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
  const [igDebug, setIgDebug] = useState<InstagramDebug | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | undefined>(undefined);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [redirectingToMeta, setRedirectingToMeta] = useState(false);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [oauthAccessToken, setOauthAccessToken] = useState<string | null>(null);

  const [publishedScripts, setPublishedScripts] = useState<any[]>([]);
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedScript, setSelectedScript] = useState<string | undefined>(undefined);
  const [linkingMetric, setLinkingMetric] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => setClients(data || []));
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data } = await supabase
      .from("social_connections")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    setConnections(data || []);
  };

  const clearOAuthParams = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("code") && !params.get("state") && !params.get("error")) return;

    window.history.replaceState({}, "", "/social");
    localStorage.removeItem("meta_oauth_state");
  };

  const startInstagramOAuth = async () => {
    setRedirectingToMeta(true);
    try {
      const state = crypto.randomUUID();
      localStorage.setItem("meta_oauth_state", state);

      const { data, error } = await supabase.functions.invoke("fetch-instagram-metrics", {
        body: {
          action: "get_oauth_url",
          redirect_uri: `${window.location.origin}/social`,
          state,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No se pudo generar la URL de autorización");

      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        const popup = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!popup) throw new Error("Tu navegador bloqueó la ventana emergente de Meta.");

        toast({
          title: "Sigue en la nueva pestaña",
          description: "Completa el login de Meta y luego vuelve a esta app.",
        });
        setRedirectingToMeta(false);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      localStorage.removeItem("meta_oauth_state");
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setRedirectingToMeta(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      clearOAuthParams();
      toast({
        title: "Conexión cancelada",
        description: "No se completó la autorización en Meta.",
        variant: "destructive",
      });
      return;
    }

    if (!code) return;

    const savedState = localStorage.getItem("meta_oauth_state");
    if (!state || !savedState || state !== savedState) {
      clearOAuthParams();
      toast({
        title: "Estado OAuth inválido",
        description: "Intenta conectar Instagram nuevamente.",
        variant: "destructive",
      });
      return;
    }

    const processOAuth = async () => {
      setProcessingOAuth(true);
      setFetchingAccounts(true);
      try {
        const { data, error } = await supabase.functions.invoke("fetch-instagram-metrics", {
          body: {
            action: "exchange_oauth_code",
            code,
            redirect_uri: `${window.location.origin}/social`,
            state,
          },
        });

        if (error) throw error;

        setOauthAccessToken(data.access_token || null);
        setIgAccounts(data.accounts || []);
        setIgDebug(data.debug || null);
        setShowLinkDialog(true);

        if (!data.accounts?.length && data.debug?.hints?.length) {
          toast({
            title: "No se encontraron cuentas",
            description: data.debug.hints[0],
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        clearOAuthParams();
        setRedirectingToMeta(false);
        setProcessingOAuth(false);
        setFetchingAccounts(false);
      }
    };

    processOAuth();
  }, [toast]);

  const linkAccount = async (account: any) => {
    if (!selectedClient) {
      toast({ title: "Selecciona un cliente primero", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await supabase.from("social_connections").insert({
        client_id: selectedClient,
        platform: "instagram",
        account_id: account.ig_account_id,
        account_name: account.ig_username || account.ig_name,
        access_token: oauthAccessToken,
        metadata: account,
      });
      toast({ title: "Cuenta vinculada exitosamente" });
      setShowLinkDialog(false);
      fetchConnections();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openMetrics = async (conn: any) => {
    setSelectedConnection(conn);
    setSelectedScript(undefined);
    setLoadingMedia(true);
    setShowMetricsDialog(true);

    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, title, social_network, status")
      .eq("client_id", conn.client_id)
      .in("status", ["published", "with_metrics"])
      .order("created_at", { ascending: false });
    setPublishedScripts(scripts || []);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram-metrics", {
        body: { action: "fetch_media", connection_id: conn.id },
      });
      if (error) throw error;
      setMediaList(data.media || []);
    } catch (e: any) {
      toast({ title: "Error cargando media", description: e.message, variant: "destructive" });
    } finally {
      setLoadingMedia(false);
    }
  };

  const fetchInsights = async (postId: string) => {
    if (!selectedScript || !selectedConnection?.id) {
      toast({ title: "Selecciona un script primero", variant: "destructive" });
      return;
    }

    setLinkingMetric(postId);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram-metrics", {
        body: {
          action: "fetch_insights",
          post_id: postId,
          script_id: selectedScript,
          connection_id: selectedConnection.id,
        },
      });
      if (error) throw error;

      toast({
        title: "Métricas importadas",
        description: `Views: ${data.metrics.views} | Reach: ${data.metrics.reach} | Engagement: ${data.metrics.engagement_rate}%`,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLinkingMetric(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display gradient-text">Conexiones Sociales</h1>
        <Button
          onClick={startInstagramOAuth}
          disabled={fetchingAccounts || redirectingToMeta || processingOAuth}
          className="gap-2"
        >
          {fetchingAccounts || redirectingToMeta || processingOAuth ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Instagram className="w-4 h-4" />
          )}
          Conectar Instagram
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.length === 0 ? (
          <div className="glass p-8 col-span-full text-center text-muted-foreground">
            <Link2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No hay cuentas vinculadas. Vincula tu primera cuenta de Instagram.</p>
          </div>
        ) : (
          connections.map((conn) => (
            <div key={conn.id} className="glass p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">@{conn.account_name}</p>
                  <p className="text-xs text-muted-foreground">{conn.clients?.name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{conn.platform}</Badge>
              </div>
              <Button size="sm" variant="secondary" className="w-full gap-2" onClick={() => openMetrics(conn)}>
                <BarChart3 className="w-4 h-4" />
                Ver Media & Métricas
              </Button>
            </div>
          ))
        )}
      </motion.div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle className="gradient-text">Vincular cuenta de Instagram</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecciona cliente y vincula una cuenta detectada automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {igAccounts.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No se encontraron cuentas de Instagram Business vinculadas a tu token.</p>
                {igDebug?.hints?.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {igDebug.hints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              igAccounts.map((acc) => (
                <div key={acc.ig_account_id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {acc.ig_profile_picture ? (
                      <img src={acc.ig_profile_picture} alt={`Perfil de @${acc.ig_username || acc.ig_name}`} className="w-8 h-8 rounded-full" loading="lazy" />
                    ) : null}
                    <div>
                      <p className="font-medium">@{acc.ig_username}</p>
                      <p className="text-xs text-muted-foreground">{acc.page_name}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => linkAccount(acc)} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="glass-strong max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gradient-text">Media de @{selectedConnection?.account_name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Vincula cada publicación con un script para importar métricas reales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedScript} onValueChange={setSelectedScript}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Seleccionar script para vincular métricas" />
              </SelectTrigger>
              <SelectContent>
                {publishedScripts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loadingMedia ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : mediaList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">No se encontró media reciente.</p>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {mediaList.map((m: any) => (
                  <div key={m.id} className="bg-secondary/30 rounded-lg overflow-hidden">
                    {(m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ? (
                      <img
                        src={m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url}
                        alt={m.caption ? `Publicación: ${m.caption.slice(0, 40)}` : "Vista previa de publicación"}
                        className="w-full h-32 object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{m.caption || "Sin caption"}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{m.media_type}</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          disabled={linkingMetric === m.id || !selectedScript}
                          onClick={() => fetchInsights(m.id)}
                        >
                          {linkingMetric === m.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Importar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialConnections;
