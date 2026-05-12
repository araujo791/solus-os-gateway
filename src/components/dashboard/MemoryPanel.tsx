import { MemoryStick, Cpu } from "lucide-react";

interface MemorySlot {
  locator: string;
  bank?: string;
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

      {/* Pentes instalados */}
      {slots.length > 0 && (
        <div className="space-y-2">
          {slots.map((slot, i) => {
            const hasDetail = slot.manufacturer && slot.manufacturer !== "?" && slot.manufacturer !== "Unknown";
            const hasPart = slot.part_number && slot.part_number !== "?" && slot.part_number !== "Unknown";
            const speed = slot.configured_speed_mhz || slot.speed_mhz;
            return (
              <div
                key={i}
                className="rounded border border-border bg-background/50 p-2.5 transition-all hover:border-accent/30"
              >
                {/* Linha 1: slot + capacidade + tipo */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-accent opacity-60" />
                    <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {slot.locator}
                      {slot.bank && slot.bank !== slot.locator && (
                        <span className="opacity-50 normal-case"> · {slot.bank}</span>
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {slot.size_gb} GB{slot.type && slot.type !== "?" ? ` ${slot.type}` : ""}
                  </span>
                </div>

                {/* Linha 2: fabricante + part + velocidade + voltagem */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                  {hasDetail && (
                    <span className="text-foreground/70">{slot.manufacturer}</span>
                  )}
                  {hasPart && (
                    <span className="text-foreground/50 font-light">{slot.part_number}</span>
                  )}
                  {speed > 0 && (
                    <span>
                      <span className="text-accent">{speed}</span> MT/s
                      {slot.speed_mhz > 0 && slot.speed_mhz !== speed && (
                        <span className="opacity-40"> / {slot.speed_mhz}</span>
                      )}
                    </span>
                  )}
                  {slot.voltage > 0 && (
                    <span>
                      <span className="text-warning">{slot.voltage.toFixed(2)}</span> V
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sem dados de slot */}
      {slots.length === 0 && totalSlots === 0 && (
        <p className="font-mono text-[10px] text-muted-foreground opacity-50">
          Execute como root para detectar pentes (dmidecode)
        </p>
      )}

      {/* Slots vazios (placeholders) */}
      {totalSlots > 0 && totalSlots > occupiedSlots && (
        <div className="mt-2 space-y-1">
          {Array.from({ length: totalSlots - occupiedSlots }).map((_, i) => (
            <div key={i} className="rounded border border-dashed border-border/40 bg-background/20 px-2.5 py-1.5">
              <span className="font-mono text-[9px] text-muted-foreground/40">Slot vazio</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
