import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Cpu,
  MonitorSmartphone,
  MemoryStick,
  HardDrive,
  Fan,
  Zap,
  Info,
  Sun,
  Moon,
  Power,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão geral", url: "/", icon: LayoutDashboard },
  { title: "CPU", url: "/cpu", icon: Cpu },
  { title: "GPU", url: "/gpu", icon: MonitorSmartphone },
  { title: "Memória", url: "/memory", icon: MemoryStick },
  { title: "Discos", url: "/disks", icon: HardDrive },
  { title: "Ventiladores", url: "/fans", icon: Fan },
  { title: "Energia", url: "/power", icon: Zap },
  { title: "Sistema", url: "/system", icon: Info },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    const sensei = (window as any).sensei;
    if (sensei?.getAutostart) sensei.getAutostart().then(setAutostart);
  }, []);

  const toggleAutostart = async () => {
    const next = !autostart;
    setAutostart(next);
    const sensei = (window as any).sensei;
    if (sensei?.toggleAutostart) await sensei.toggleAutostart(next);
  };

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-md" />
            <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display text-sm font-bold tracking-wider">SENSEI</div>
              <div className="font-mono text-[9px] text-muted-foreground">Hardware Monitor</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleAutostart} tooltip="Iniciar com o sistema">
              <Power className={`h-4 w-4 ${autostart ? "text-primary" : ""}`} />
              {!collapsed && (
                <span className="text-xs">
                  Auto-start: {autostart ? "ativo" : "desativado"}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && (
                <span className="text-xs">Tema {theme === "dark" ? "claro" : "escuro"}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
