import { Cpu, Thermometer, Zap, Gauge, CircuitBoard, BatteryCharging } from "lucide-react";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { FanControl } from "@/components/dashboard/FanControl";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { TempChart } from "@/components/dashboard/TempChart";
import { PowerProfile } from "@/components/dashboard/PowerProfile";
import { SensorCard } from "@/components/dashboard/SensorCard";
import { useSimulatedSensors } from "@/hooks/useSimulatedSensors";

export default function Index() {
  const sensors = useSimulatedSensors();

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
              Machinist E5 D8 Max • Monitor de Hardware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${sensors.connected ? 'bg-primary' : 'bg-warning'} animate-pulse-glow`} />
          <span className="font-mono text-xs text-muted-foreground">
            {sensors.connected ? "Conectado" : "Simulado"}
          </span>
        </div>
        </div>
      </div>

      {/* Barra de Status */}
      <StatusBar cpuUsage={sensors.cpuUsage} memUsage={sensors.memUsage} uptime="15h 22m" />

      {/* Grid Principal */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Coluna Esquerda - Medidores & Sensores */}
        <div className="space-y-4">
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

          <div className="grid grid-cols-2 gap-2">
            <SensorCard icon={Cpu} label="Frequência" value={sensors.cpuFreq.toFixed(1)} unit="GHz" color="primary" />
            <SensorCard icon={Zap} label="Voltagem" value={sensors.cpuVoltage.toFixed(2)} unit="V" color="accent" />
            <SensorCard icon={BatteryCharging} label="Consumo" value={sensors.cpuPower} unit="W" color="warning" />
            <SensorCard icon={Gauge} label="Carga" value={sensors.cpuUsage} unit="%" color={sensors.cpuUsage > 80 ? "destructive" : "primary"} />
          </div>
        </div>

        {/* Coluna Central - Gráfico & Perfil */}
        <div className="space-y-4">
          <TempChart data={sensors.tempHistory} />
          <PowerProfile active={sensors.profile} onChange={sensors.setProfile} />
        </div>

        {/* Coluna Direita - Controle de Fans */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Controle de Ventilação
            </h3>
            <div className="space-y-3">
              <FanControl
                name="Fan CPU"
                rpm={sensors.fan1Rpm}
                maxRpm={3500}
                speed={sensors.fan1Speed}
                onSpeedChange={sensors.setFan1Speed}
              />
              <FanControl
                name="Gabinete 1"
                rpm={sensors.fan2Rpm}
                maxRpm={3000}
                speed={sensors.fan2Speed}
                onSpeedChange={sensors.setFan2Speed}
              />
              <FanControl
                name="Gabinete 2"
                rpm={sensors.fan3Rpm}
                maxRpm={4000}
                speed={sensors.fan3Speed}
                onSpeedChange={sensors.setFan3Speed}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sistema
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa</span>
                <span className="text-foreground">Machinist E5 D8 Max</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span className="text-foreground">Xeon E5-2680 v4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kernel</span>
                <span className="text-foreground">6.18.13-330.current</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SO</span>
                <span className="text-foreground">Solus Linux</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver</span>
                <span className="text-primary">lm_sensors</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
