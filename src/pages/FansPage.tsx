import { useSensors } from "@/contexts/SensorsContext";
import { FanControl } from "@/components/dashboard/FanControl";

export default function FansPage() {
  const s = useSensors();
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Ventiladores
      </h3>
      <div className="space-y-4">
        <FanControl name="Fan 1" label={s.fanLabels[0] || "GPU"} rpm={s.fan1Rpm} maxRpm={3500} speed={s.fan1Speed} onSpeedChange={s.setFan1Speed} onAutoMode={() => s.sendFanAuto("fan1")} />
        <FanControl name="Fan 2" label={s.fanLabels[1] || "CPU 1"} rpm={s.fan2Rpm} maxRpm={3000} speed={s.fan2Speed} onSpeedChange={s.setFan2Speed} onAutoMode={() => s.sendFanAuto("fan2")} />
        <FanControl name="Fan 3" label={s.fanLabels[2] || "CPU 2"} rpm={s.fan3Rpm} maxRpm={4000} speed={s.fan3Speed} onSpeedChange={s.setFan3Speed} onAutoMode={() => s.sendFanAuto("fan3")} />
      </div>
    </div>
  );
}
