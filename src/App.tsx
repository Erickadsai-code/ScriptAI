import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Generator from "./pages/Generator";
import ScriptLibrary from "./pages/ScriptLibrary";
import ClientTop10 from "./pages/ClientTop10";
import Admin from "./pages/Admin";
import SocialConnections from "./pages/SocialConnections";
import ContentCreator from "./pages/ContentCreator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generator"
              element={
                <ProtectedRoute>
                  <AppLayout><Generator /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <AppLayout><ScriptLibrary /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/top10"
              element={
                <ProtectedRoute>
                  <AppLayout><ClientTop10 /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AppLayout><Admin /></AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute>
                  <AppLayout><SocialConnections /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/content"
              element={
                <ProtectedRoute>
                  <AppLayout><ContentCreator /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
