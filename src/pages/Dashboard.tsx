import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { FileText, CheckCircle, TrendingUp, Trophy } from "lucide-react";

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
}

const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <span>{count}{suffix}</span>;
};

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, published: 0, avgScore: 0 });
  const [topScripts, setTopScripts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: total } = await supabase
        .from("scripts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth);

      const { count: published } = await supabase
        .from("scripts")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      const { data: scored } = await supabase
        .from("scripts")
        .select("performance_score")
        .not("performance_score", "is", null);

      const avg = scored && scored.length > 0
        ? Math.round(scored.reduce((s, r) => s + (r.performance_score || 0), 0) / scored.length)
        : 0;

      setStats({ total: total || 0, published: published || 0, avgScore: avg });

      const { data: top } = await supabase
        .from("scripts")
        .select("id, title, performance_score, social_network, status")
        .not("performance_score", "is", null)
        .order("performance_score", { ascending: false })
        .limit(5);

      setTopScripts(top || []);
    };
    fetchStats();
  }, []);

  const networkLabels: Record<string, string> = {
    instagram_reels: "IG Reels",
    instagram_story: "IG Story",
    facebook_post: "FB Post",
    facebook_ad: "FB Ad",
    tiktok: "TikTok",
  };

  const statCards: StatCard[] = [
    { label: "Scripts este mes", value: stats.total, icon: <FileText className="w-5 h-5" /> },
    { label: "Publicados", value: stats.published, icon: <CheckCircle className="w-5 h-5" /> },
    { label: "Puntuación Prom.", value: stats.avgScore, icon: <TrendingUp className="w-5 h-5" />, suffix: "%" },
  ];

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold font-display gradient-text"
      >
        Panel de Control
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 glow-blue"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                {stat.icon}
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-4xl font-bold font-display">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-semibold font-display">Top 5 Scripts</h2>
        </div>
        {topScripts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aún no hay scripts puntuados. Genera y publica scripts para ver los mejores.</p>
        ) : (
          <div className="space-y-3">
            {topScripts.map((script, i) => (
              <div key={script.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <span className="text-lg font-bold text-accent w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{script.title}</p>
                  <p className="text-xs text-muted-foreground">{networkLabels[script.social_network] || script.social_network}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold gradient-text">{script.performance_score}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
