import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ParticleBackground from "@/components/ParticleBackground";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 relative overflow-auto">
          <ParticleBackground />
          <div className="relative z-10">
            <div className="flex items-center gap-2 p-4 border-b border-border glass">
              <SidebarTrigger />
            </div>
            <div className="p-6">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
