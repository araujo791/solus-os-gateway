import { useMemo, useState } from "react";
import { useSensors } from "@/contexts/SensorsContext";
import { CpuPanel } from "@/components/dashboard/CpuPanel";
import { TempChart } from "@/components/dashboard/TempChart";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { Cpu, Zap, BatteryCharging, Gauge } from "lucide-react";

const CPU_COLORS = ["hsl(160, 100%, 45%)", "hsl(200, 100%, 50%)", "hsl(280, 80%, 60%)", "hsl(35, 100%, 55%)"];
const CORE_COLORS = [
  "hsl(160, 70%, 35%)", "hsl(180, 70%, 40%)", "hsl(200, 70%, 45%)", "hsl(220, 70%, 50%)",
  "hsl(140, 70%, 40%)", "hsl(120, 70%, 40%)", "hsl(100, 70%, 40%)", "hsl(80, 70%, 45%)",
  "hsl(60, 70%, 45%)", "hsl(40, 70%, 50%)", "hsl(20, 70%, 50%)", "hsl(0, 70%, 50%)",
  "hsl(340, 70%, 50%)", "hsl(320, 70%, 50%)", "hsl(300, 70%, 50%)", "hsl(280, 70%, 50%)",
];

export default function CpuPage() {
  const s = useSensors();
  const [showCores, setShowCores] = useState(false);

  const series = useMemo(() => {
    if (s.cpusTemps.length === 0) {
      return [{ key: "cpu", label: "CPU", color: "hsl(160, 100%, 45%)" }];
    }
    const out: { key: string; label: string; color: string }[] = [];
    s.cpusTemps.forEach((cpu) => {
      out.push({ key: `cpu${cpu.socket}_pkg`, label: `CPU${cpu.socket} Pkg`, color: CPU_COLORS[cpu.socket % CPU_COLORS.length] });
      if (showCores) {
        cpu.cores.forEach((core, idx) => {
          out.push({ key: `cpu${cpu.socket}_c${core.id}`, label: `CPU${cpu.socket} C${core.id}`, color: CORE_COLORS[idx % CORE_COLORS.length] });
        });
      }
    });
    return out;
  }, [s.cpusTemps, showCores]);

  return (
    <div className="space-y-4">
      {s.cpusTemps.length > 0 ? (
        <CpuPanel cpus={s.cpusTemps} models={s.cpuModels} />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex justify-around">
            <GaugeChart value={s.cpuTemp} max={100} label="CPU" unit="°C" color="primary" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SensorCard icon={Cpu} label="Frequência" value={s.cpuFreq.toFixed(1)} unit="GHz" color="primary" />
        <SensorCard icon={Zap} label="Voltagem" value={s.cpuVoltage.toFixed(2)} unit="V" color="accent" />
        <SensorCard icon={BatteryCharging} label="Consumo" value={s.cpuPower} unit="W" color="warning" />
        <SensorCard icon={Gauge} label="Carga" value={s.cpuUsage} unit="%" color={s.cpuUsage > 80 ? "destructive" : "primary"} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showCores} onChange={(e) => setShowCores(e.target.checked)} className="h-3 w-3 accent-primary" />
            Mostrar núcleos no histórico
          </label>
        </div>
        <TempChart data={s.tempHistory} series={series} />
      </div>
    </div>
  );
}
