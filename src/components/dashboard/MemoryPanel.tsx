import { MemoryStick } from "lucide-react";

interface MemorySlot {
  locator: string;
  size_gb: number;
  type: string;
  speed_mhz: number;
  configured_speed_mhz: number;
  voltage: number;
  manufacturer: string;
  part_number: string;
}

interface MemoryPanelProps {
  totalGb: number;
  usedGb: number;
  usage: number;
  totalSlots: number;
  occupiedSlots: number;
  slots: MemorySlot[];
}

export function MemoryPanel({ totalGb, usedGb, usage, totalSlots, occupiedSlots, slots }: MemoryPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Memória RAM
      </h3>

      {/* Resumo */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MemoryStick className="h-4 w-4 text-accent" />
          <span className="font-mono text-sm text-foreground">
            {usedGb.toFixed(1)} / {totalGb.toFixed(1)} GB
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-accent">{usage}%</span>
          {totalSlots > 0 && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent border border-accent/20">
              {occupiedSlots}/{totalSlots} slots
            </span>
          )}
        </div>
      </div>

      {/* Barra de uso */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${usage}%` }}
        />
      </div>

      {/* Slots ocupados */}
      {slots.length > 0 && (
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="rounded border border-border bg-background/50 p-2.5 transition-all hover:border-accent/30"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {slot.locator}
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {slot.size_gb} GB {slot.type}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                {slot.configured_speed_mhz > 0 && (
                  <span>
                    <span className="text-accent">{slot.configured_speed_mhz}</span> MT/s
                    {slot.speed_mhz > 0 && slot.speed_mhz !== slot.configured_speed_mhz && (
                      <span className="opacity-50"> / {slot.speed_mhz}</span>
                    )}
                  </span>
                )}
                {slot.voltage > 0 && (
                  <span>
                    <span className="text-warning">{slot.voltage.toFixed(2)}</span> V
                  </span>
                )}
                {slot.manufacturer && slot.manufacturer !== "?" && (
                  <span className="opacity-60">{slot.manufacturer}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sem dados de slot */}
      {slots.length === 0 && totalSlots === 0 && (
        <p className="font-mono text-[10px] text-muted-foreground opacity-50">
          Execute como root para detectar slots (dmidecode)
        </p>
      )}
    </div>
  );
}
