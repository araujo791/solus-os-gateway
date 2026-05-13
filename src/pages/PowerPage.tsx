import { useSensors } from "@/contexts/SensorsContext";
import { PowerProfile } from "@/components/dashboard/PowerProfile";
import { GaugeChart } from "@/components/dashboard/GaugeChart";

export default function PowerPage() {
  const s = useSensors();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Consumo
        </h3>
        <div className="flex justify-around">
          <GaugeChart value={s.cpuPower} max={250} label="CPU" unit="W" color="warning" size={180} />
          <GaugeChart value={s.cpuVoltage} max={2} label="Vcore" unit="V" color="accent" size={180} />
        </div>
      </div>
      <PowerProfile active={s.profile} available={s.availableProfiles} onChange={s.setProfile} />
    </div>
  );
}
