import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./layouts/AppLayout";
import Overview from "./pages/Overview";
import CpuPage from "./pages/CpuPage";
import GpuPage from "./pages/GpuPage";
import MemoryPage from "./pages/MemoryPage";
import DisksPage from "./pages/DisksPage";
import FansPage from "./pages/FansPage";
import PowerPage from "./pages/PowerPage";
import SystemPage from "./pages/SystemPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// HashRouter funciona corretamente no Electron (file://) e no navegador.
const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/cpu" element={<CpuPage />} />
              <Route path="/gpu" element={<GpuPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/disks" element={<DisksPage />} />
              <Route path="/fans" element={<FansPage />} />
              <Route path="/power" element={<PowerPage />} />
              <Route path="/system" element={<SystemPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
