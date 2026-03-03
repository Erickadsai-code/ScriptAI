import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Sparkles,
  Library,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Instagram,
  PenSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const allNavItems = [
  { label: "Panel", icon: LayoutDashboard, path: "/", adminOnly: false },
  { label: "Generador", icon: Sparkles, path: "/generator", adminOnly: false },
  { label: "Biblioteca", icon: Library, path: "/library", adminOnly: false },
  { label: "Top 10 Guiones", icon: BarChart3, path: "/top10", adminOnly: false },
  { label: "Redes Sociales", icon: Instagram, path: "/social", adminOnly: false },
  { label: "Crear Contenido", icon: PenSquare, path: "/content", adminOnly: false },
  { label: "Administración", icon: Settings, path: "/admin", adminOnly: true },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin } = useRole();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setDisplayName(data?.full_name || user.email || "");
        });
    }
  }, [user]);

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-blue">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold font-display gradient-text">ScriptAI</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                className="gap-3"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground truncate mb-2">
          {displayName}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
