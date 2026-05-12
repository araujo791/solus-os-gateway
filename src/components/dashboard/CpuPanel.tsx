import { Cpu } from "lucide-react";
import { GaugeChart } from "./GaugeChart";

export interface CpuTempData {
  socket: number;
  package: number;
  cores: { id: number; temp: number; usage?: number }[];
}

interface CpuPanelProps {
  cpus: CpuTempData[];
  models: string[]; // model name por socket
}

export function CpuPanel({ cpus, models }: CpuPanelProps) {
  if (!cpus || cpus.length === 0) return null;

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
                    Núcleos — <span className="text-[8px] opacity-60">atividade / temp</span>
                  </div>
                  <div className={`grid gap-2 ${coreCols}`}>
                    {cpu.cores.map((core) => (
                      <CoreCircle key={core.id} id={core.id} temp={core.temp} usage={core.usage ?? 0} />
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

function CoreCircle({ id, temp, usage }: { id: number; temp: number; usage: number }) {
  const size = 52;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size - 6) / 2;   // anel externo: temperatura
  const innerR = (size - 20) / 2;  // anel interno: atividade

  // Cor da temperatura
  const tempColor =
    temp > 85 ? "hsl(0, 85%, 55%)"
    : temp > 70 ? "hsl(35, 100%, 55%)"
    : "hsl(160, 100%, 45%)";

  // Cor da atividade
  const usageColor =
    usage > 85 ? "hsl(0, 85%, 65%)"
    : usage > 60 ? "hsl(35, 100%, 60%)"
    : "hsl(200, 100%, 55%)";

  // Arcos completos (circunferência total)
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;

  const tempOffset = outerCirc - (Math.min(temp, 100) / 100) * outerCirc;
  const usageOffset = innerCirc - (Math.min(usage, 100) / 100) * innerCirc;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track externo (temp) */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="hsl(220,15%,12%)" strokeWidth="3" />
        {/* Arco externo: temperatura */}
        <circle
          cx={cx} cy={cy} r={outerR}
          fill="none"
          stroke={tempColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={outerCirc}
          strokeDashoffset={tempOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out"
        />

        {/* Track interno (usage) */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="hsl(220,15%,10%)" strokeWidth="3.5" />
        {/* Arco interno: atividade */}
        <circle
          cx={cx} cy={cy} r={innerR}
          fill="none"
          stroke={usageColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={innerCirc}
          strokeDashoffset={usageOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out"
        />

        {/* Texto central: atividade % */}
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fill={usageColor} fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
          {Math.round(usage)}%
        </text>

        {/* Temp no topo do círculo externo */}
        <text x={cx} y={4} textAnchor="middle"
          fill={tempColor} fontSize="7.5" fontFamily="JetBrains Mono" fontWeight="600">
          {Math.round(temp)}°
        </text>
      </svg>
      <span className="font-mono text-[8px] text-muted-foreground leading-none">C{id}</span>
    </div>
  );
}
