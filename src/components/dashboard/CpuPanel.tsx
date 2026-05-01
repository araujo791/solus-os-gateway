import { Cpu } from "lucide-react";
import { GaugeChart } from "./GaugeChart";

export interface CpuTempData {
  socket: number;
  package: number;
  cores: { id: number; temp: number }[];
}

interface CpuPanelProps {
  cpus: CpuTempData[];
  models: string[]; // model name por socket
}

export function CpuPanel({ cpus, models }: CpuPanelProps) {
  if (!cpus || cpus.length === 0) return null;

  // layout adaptativo: lado a lado se até 2; senão grid
  const gridCols = cpus.length === 1 ? "grid-cols-1" : cpus.length === 2 ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Processadores ({cpus.length}x)
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {cpus.reduce((acc, c) => acc + c.cores.length, 0)} núcleos monitorados
        </span>
      </div>

      <div className={`grid gap-4 ${gridCols}`}>
        {cpus.map((cpu) => {
          const model = models[cpu.socket] || `CPU ${cpu.socket}`;
          // grid de núcleos – ajusta colunas conforme a quantidade
          const coreCount = cpu.cores.length;
          const coreCols = coreCount <= 4 ? "grid-cols-4"
            : coreCount <= 8 ? "grid-cols-4"
            : coreCount <= 16 ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
            : "grid-cols-6 sm:grid-cols-8 md:grid-cols-10";

          return (
            <div
              key={cpu.socket}
              className="rounded-md border border-border/60 bg-background/40 p-3"
            >
              {/* Header CPU */}
              <div className="mb-2 flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                  CPU {cpu.socket}
                </span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {model}
                </span>
              </div>

              {/* Package gauge + cores grid */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <GaugeChart
                    value={cpu.package}
                    max={100}
                    label="Package"
                    unit="°C"
                    color="primary"
                    size={120}
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-1 font-display text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Núcleos
                  </div>
                  <div className={`grid gap-1.5 ${coreCols}`}>
                    {cpu.cores.map((core) => (
                      <CoreMiniGauge key={core.id} id={core.id} temp={core.temp} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoreMiniGauge({ id, temp }: { id: number; temp: number }) {
  const pct = Math.min(temp, 100);
  const color =
    temp > 85 ? "hsl(0, 85%, 55%)"
    : temp > 70 ? "hsl(35, 100%, 55%)"
    : "hsl(160, 100%, 45%)";

  // mini meio-arco
  const size = 44;
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke="hsl(220, 15%, 15%)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          fill={color}
          fontSize="11"
          fontFamily="JetBrains Mono"
          fontWeight="600"
        >
          {Math.round(temp)}
        </text>
      </svg>
      <span className="font-mono text-[8px] text-muted-foreground -mt-0.5">C{id}</span>
    </div>
  );
}
