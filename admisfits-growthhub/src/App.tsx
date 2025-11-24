import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProjectDetailPage from "./components/dashboard/ProjectDetailPage";
import ProjectSettingsPage from "./components/dashboard/ProjectSettingsPage";
import MetaOAuthCallback from "./components/auth/MetaOAuthCallback";
import GoogleOAuthCallback from "./components/auth/GoogleOAuthCallback";
import { ThemeProvider } from "@/components/theme-provider";
import { useAutoSync } from "@/hooks/useAutoSync";
import TestGHLPage from "./pages/test-ghl";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize auto-sync service
  useAutoSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/project/:projectId" element={<ProjectDetailPage />} />
        <Route path="/project/:projectId/settings" element={<ProjectSettingsPage />} />
        <Route path="/auth/meta/callback" element={<MetaOAuthCallback />} />
        <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />
        <Route path="/test-ghl" element={<TestGHLPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
