import { Zap, Gauge, BatteryCharging, Cpu, RotateCw } from "lucide-react";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { TempChart } from "@/components/dashboard/TempChart";
import { PowerProfile } from "@/components/dashboard/PowerProfile";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { MemoryPanel } from "@/components/dashboard/MemoryPanel";
import { FanControl } from "@/components/dashboard/FanControl";
import { DiskPanel } from "@/components/dashboard/DiskPanel";
import { CpuPanel } from "@/components/dashboard/CpuPanel";
import { useSimulatedSensors } from "@/hooks/useSimulatedSensors";
import { useMemo, useState } from "react";

const CPU_COLORS = [
  "hsl(160, 100%, 45%)",
  "hsl(200, 100%, 50%)",
  "hsl(280, 80%, 60%)",
  "hsl(35, 100%, 55%)",
];

const CORE_COLORS = [
  "hsl(160, 70%, 35%)", "hsl(180, 70%, 40%)", "hsl(200, 70%, 45%)", "hsl(220, 70%, 50%)",
  "hsl(140, 70%, 40%)", "hsl(120, 70%, 40%)", "hsl(100, 70%, 40%)", "hsl(80, 70%, 45%)",
  "hsl(60, 70%, 45%)", "hsl(40, 70%, 50%)", "hsl(20, 70%, 50%)", "hsl(0, 70%, 50%)",
  "hsl(340, 70%, 50%)", "hsl(320, 70%, 50%)", "hsl(300, 70%, 50%)", "hsl(280, 70%, 50%)",
];

export default function Index() {
  const sensors = useSimulatedSensors();
  const [showCores, setShowCores] = useState(false);

  // Séries do histórico - se houver multi-cpu/cores, mostra package por CPU + opcional núcleos
  const chartSeries = useMemo(() => {
    if (sensors.cpusTemps.length === 0) {
      return [
        { key: "cpu", label: "CPU", color: "hsl(160, 100%, 45%)" },
        { key: "gpu", label: "GPU", color: "hsl(200, 100%, 50%)" },
        { key: "board", label: "Placa", color: "hsl(35, 100%, 55%)" },
      ];
    }
    const series: { key: string; label: string; color: string }[] = [];
    sensors.cpusTemps.forEach((cpu) => {
      series.push({
        key: `cpu${cpu.socket}_pkg`,
        label: `CPU${cpu.socket} Pkg`,
        color: CPU_COLORS[cpu.socket % CPU_COLORS.length],
      });
      if (showCores) {
        cpu.cores.forEach((core, idx) => {
          series.push({
            key: `cpu${cpu.socket}_c${core.id}`,
            label: `CPU${cpu.socket} C${core.id}`,
            color: CORE_COLORS[idx % CORE_COLORS.length],
          });
        });
      }
    });
    series.push({ key: "gpu", label: "GPU", color: "hsl(200, 100%, 50%)" });
    series.push({ key: "board", label: "Placa", color: "hsl(35, 100%, 55%)" });
    return series;
  }, [sensors.cpusTemps, showCores]);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-primary/20 blur-md" />
            <img src="/favicon.png" alt="MachCtrl" className="relative h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
              Mach<span className="text-primary text-glow-primary">Ctrl</span>
            </h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              {sensors.systemInfo.board} • Monitor de Hardware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm("Reiniciar serviço MachCtrl?")) sensors.restartService();
            }}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground transition-all hover:border-warning/50 hover:text-warning"
            title="Reiniciar backend"
          >
            <RotateCw className="h-3 w-3" />
            Restart
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${sensors.connected ? 'bg-primary' : 'bg-warning'} animate-pulse-glow`} />
            <span className="font-mono text-xs text-muted-foreground">
              {sensors.connected ? "Conectado" : "Simulado"}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Status */}
      <StatusBar cpuUsage={sensors.cpuUsage} memUsage={sensors.memUsage} uptime={sensors.systemInfo.uptime} />

      {/* CPUs - sempre full width */}
      <div className="mt-4">
        {sensors.cpusTemps.length > 0 ? (
          <CpuPanel cpus={sensors.cpusTemps} models={sensors.cpuModels} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Temperaturas
            </h3>
            <div className="flex justify-around">
              <GaugeChart value={sensors.cpuTemp} max={100} label="CPU" unit="°C" color="primary" />
              <GaugeChart value={sensors.gpuTemp} max={100} label="GPU" unit="°C" color="accent" />
              <GaugeChart value={sensors.boardTemp} max={80} label="Placa" unit="°C" color="warning" />
            </div>
          </div>
        )}
      </div>

      {/* Histórico de temperaturas + GPU/Placa cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-end gap-2">
            <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showCores}
                onChange={(e) => setShowCores(e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
              Mostrar núcleos no histórico
            </label>
          </div>
          <TempChart data={sensors.tempHistory} series={chartSeries} />
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              GPU & Placa
            </h3>
            <div className="flex justify-around">
              <GaugeChart value={sensors.gpuTemp} max={100} label="GPU" unit="°C" color="accent" size={110} />
              <GaugeChart value={sensors.boardTemp} max={80} label="Placa" unit="°C" color="warning" size={110} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SensorCard icon={Cpu} label="Frequência" value={sensors.cpuFreq.toFixed(1)} unit="GHz" color="primary" />
            <SensorCard icon={Zap} label="Voltagem" value={sensors.cpuVoltage.toFixed(2)} unit="V" color="accent" />
            <SensorCard icon={BatteryCharging} label="Consumo" value={sensors.cpuPower} unit="W" color="warning" />
            <SensorCard icon={Gauge} label="Carga" value={sensors.cpuUsage} unit="%" color={sensors.cpuUsage > 80 ? "destructive" : "primary"} />
          </div>
        </div>
      </div>

      {/* Perfil de energia (full width, 3 colunas) */}
      <div className="mt-4">
        <PowerProfile active={sensors.profile} available={sensors.availableProfiles} onChange={sensors.setProfile} />
      </div>

      {/* Linha inferior: Memória, Discos, Fans + Sistema */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MemoryPanel
          totalGb={sensors.memTotalGb}
          usedGb={sensors.memUsedGb}
          usage={sensors.memUsage}
          totalSlots={sensors.memTotalSlots}
          occupiedSlots={sensors.memOccupiedSlots}
          slots={sensors.memSlots}
        />

        <DiskPanel
          partitions={sensors.diskPartitions}
          ioRates={sensors.diskIoRates}
        />

        <div className="space-y-4">
          {/* Controle de Fans */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ventiladores
            </h3>
            <div className="space-y-3">
              <FanControl
                name="Fan 1"
                label={sensors.fanLabels[0] || "GPU"}
                rpm={sensors.fan1Rpm}
                maxRpm={3500}
                speed={sensors.fan1Speed}
                onSpeedChange={sensors.setFan1Speed}
                onAutoMode={() => sensors.sendFanAuto("fan1")}
              />
              <FanControl
                name="Fan 2"
                label={sensors.fanLabels[1] || "CPU 1"}
                rpm={sensors.fan2Rpm}
                maxRpm={3000}
                speed={sensors.fan2Speed}
                onSpeedChange={sensors.setFan2Speed}
                onAutoMode={() => sensors.sendFanAuto("fan2")}
              />
              <FanControl
                name="Fan 3"
                label={sensors.fanLabels[2] || "CPU 2"}
                rpm={sensors.fan3Rpm}
                maxRpm={4000}
                speed={sensors.fan3Speed}
                onSpeedChange={sensors.setFan3Speed}
                onAutoMode={() => sensors.sendFanAuto("fan3")}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sistema
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Placa</span>
                <span className="text-foreground text-right">{sensors.systemInfo.board}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">CPU</span>
                <span className="text-foreground text-right truncate">{sensors.systemInfo.cpu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kernel</span>
                <span className="text-foreground">{sensors.systemInfo.kernel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SO</span>
                <span className="text-foreground">{sensors.systemInfo.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sensores</span>
                <span className="text-primary">
                  {sensors.connected
                    ? `${sensors.detectedSensors.tempCount} temp • ${sensors.detectedSensors.fanCount} fan`
                    : "lm_sensors"
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
