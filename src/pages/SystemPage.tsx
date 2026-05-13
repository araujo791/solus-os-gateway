import { useSensors } from "@/contexts/SensorsContext";

export default function SystemPage() {
  const s = useSensors();
  const rows: [string, string][] = [
    ["Placa-mãe", s.systemInfo.board],
    ["CPU", s.systemInfo.cpu],
    ["Kernel", s.systemInfo.kernel],
    ["SO", s.systemInfo.os],
    ["Uptime", s.systemInfo.uptime],
    ["Sensores temp", String(s.detectedSensors.tempCount)],
    ["Sensores fan", String(s.detectedSensors.fanCount)],
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Sistema
      </h3>
      <div className="space-y-2 font-mono text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-border/50 py-1.5">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
