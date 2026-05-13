import { NavLink } from "react-router-dom";
import { Cpu, MonitorSmartphone, MemoryStick, HardDrive, Fan, Zap } from "lucide-react";
import { useSensors } from "@/contexts/SensorsContext";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { StatusBar } from "@/components/dashboard/StatusBar";

function Card({
  to,
  title,
  icon: Icon,
  children,
}: {
  to: string;
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
      {children}
    </NavLink>
  );
}

export default function Overview() {
  const s = useSensors();
  const cpu0 = s.cpusTemps?.[0];
  const cpuTemp = cpu0?.package ?? s.cpuTemp;

  return (
    <div className="space-y-4">
      <StatusBar cpuUsage={s.cpuUsage} memUsage={s.memUsage} uptime={s.systemInfo.uptime} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card to="/cpu" title="CPU" icon={Cpu}>
          <div className="flex items-center justify-around">
            <GaugeChart value={cpuTemp} max={100} label="Temp" unit="°C" color="primary" size={120} />
            <div className="space-y-1 font-mono text-xs">
              <div className="text-muted-foreground">{s.cpuFreq.toFixed(1)} GHz</div>
              <div className="text-muted-foreground">{s.cpuVoltage.toFixed(2)} V</div>
              <div className="text-muted-foreground">{s.cpuPower} W</div>
              <div className="text-primary">{s.cpuUsage}% carga</div>
            </div>
          </div>
        </Card>

        <Card to="/gpu" title="GPU" icon={MonitorSmartphone}>
          <div className="flex items-center justify-around">
            <GaugeChart value={s.gpuTemp} max={100} label="Temp" unit="°C" color="accent" size={120} />
            <div className="space-y-1 font-mono text-xs text-muted-foreground">
              <div>{s.systemInfo.board}</div>
            </div>
          </div>
        </Card>

        <Card to="/memory" title="Memória" icon={MemoryStick}>
          <div className="flex items-center justify-around">
            <GaugeChart value={s.memUsage} max={100} label="Uso" unit="%" color="primary" size={120} />
            <div className="space-y-1 font-mono text-xs">
              <div className="text-foreground">
                {s.memUsedGb.toFixed(1)} / {s.memTotalGb} GB
              </div>
              <div className="text-muted-foreground">
                {s.memOccupiedSlots}/{s.memTotalSlots} slots
              </div>
            </div>
          </div>
        </Card>

        <Card to="/disks" title="Discos" icon={HardDrive}>
          <div className="space-y-1 font-mono text-xs">
            {(s.diskPartitions ?? []).slice(0, 3).map((p: any) => (
              <div key={p.device} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{p.mountpoint}</span>
                <span className="text-foreground">
                  {p.used_gb.toFixed(0)}/{p.total_gb.toFixed(0)} GB
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card to="/fans" title="Ventiladores" icon={Fan}>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">{s.fanLabels[0] || "Fan 1"}</span><span className="text-foreground">{s.fan1Rpm} RPM</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{s.fanLabels[1] || "Fan 2"}</span><span className="text-foreground">{s.fan2Rpm} RPM</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{s.fanLabels[2] || "Fan 3"}</span><span className="text-foreground">{s.fan3Rpm} RPM</span></div>
          </div>
        </Card>

        <Card to="/power" title="Energia" icon={Zap}>
          <div className="flex items-center justify-around">
            <GaugeChart value={s.cpuPower} max={250} label="Consumo" unit="W" color="warning" size={120} />
            <div className="space-y-1 font-mono text-xs">
              <div className="text-muted-foreground">Perfil</div>
              <div className="text-primary uppercase">{s.profile}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
