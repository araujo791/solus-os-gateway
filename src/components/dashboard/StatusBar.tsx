import { Activity, Cpu, HardDrive, MemoryStick, Wifi } from "lucide-react";

interface StatusBarProps {
  cpuUsage: number;
  memUsage: number;
  uptime: string;
}

export function StatusBar({ cpuUsage, memUsage, uptime }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
          <span className="font-display text-[10px] font-semibold uppercase tracking-widest text-primary">
            MachCtrl
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 text-accent" />
          <span className="font-mono text-xs text-muted-foreground">
            CPU <span className="text-foreground">{cpuUsage}%</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <MemoryStick className="h-3 w-3 text-accent" />
          <span className="font-mono text-xs text-muted-foreground">
            RAM <span className="text-foreground">{memUsage}%</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground">Conectado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground">Tempo ativo: {uptime}</span>
        </div>
      </div>
    </div>
  );
}
