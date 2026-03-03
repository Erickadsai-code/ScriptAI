import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ParticleBackground from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Zap, Sparkles } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticleBackground />
      
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full gradient-primary opacity-20 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-neon-cyan opacity-10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center glow-blue">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display gradient-text">ScriptAI</h1>
          </div>
          <p className="text-muted-foreground text-sm">Plataforma de generación de scripts con IA</p>
        </div>

        <div className="glass-strong p-8 glow-blue">
          <h2 className="text-xl font-semibold text-center mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50 border-border"
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary hover:opacity-90 transition-opacity glow-blue"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Los accesos son proporcionados por el administrador
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
