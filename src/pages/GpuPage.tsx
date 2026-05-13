import { useSensors } from "@/contexts/SensorsContext";
import { GaugeChart } from "@/components/dashboard/GaugeChart";

export default function GpuPage() {
  const s = useSensors();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          GPU
        </h3>
        <div className="flex justify-around">
          <GaugeChart value={s.gpuTemp} max={100} label="Temperatura" unit="°C" color="accent" size={180} />
          <GaugeChart value={s.boardTemp} max={80} label="Placa-mãe" unit="°C" color="warning" size={180} />
        </div>
      </div>
    </div>
  );
}
