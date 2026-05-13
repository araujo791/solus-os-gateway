import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SensorsProvider, useSensors } from "@/contexts/SensorsContext";
import { RotateCw } from "lucide-react";

function TrayBridge() {
  const sensors = useSensors();
  useEffect(() => {
    const sensei = (window as any).sensei;
    if (!sensei?.setTrayTemp) return;
    const t =
      sensors.cpusTemps?.[0]?.package ??
      sensors.cpuTemp ??
      0;
    if (t > 0) sensei.setTrayTemp(Math.round(t));
  }, [sensors.cpusTemps, sensors.cpuTemp]);
  return null;
}

function HeaderBar() {
  const sensors = useSensors();
  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="font-mono text-[11px] text-muted-foreground">
          {sensors.systemInfo.board}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (confirm("Reiniciar serviço Sensei?")) sensors.restartService();
          }}
          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-all hover:border-warning/50 hover:text-warning"
        >
          <RotateCw className="h-3 w-3" />
          Restart
        </button>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              sensors.connected ? "bg-primary" : "bg-warning"
            } animate-pulse`}
          />
          <span className="font-mono text-[10px] text-muted-foreground">
            {sensors.connected ? "Conectado" : "Simulado"}
          </span>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <SensorsProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <HeaderBar />
            <TrayBridge />
            <main className="flex-1 p-4 lg:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SensorsProvider>
  );
}
