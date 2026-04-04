import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface TempChartProps {
  data: { time: string; cpu: number; gpu: number; board: number }[];
}

export function TempChart({ data }: TempChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Histórico de Temperaturas
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160, 100%, 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(160, 100%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(35, 100%, 55%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(35, 100%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
          />
          <YAxis
            domain={[20, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(220, 18%, 10%)",
              border: "1px solid hsl(220, 15%, 18%)",
              borderRadius: "8px",
              fontFamily: "JetBrains Mono",
              fontSize: "12px",
            }}
          />
          <Area type="monotone" dataKey="cpu" stroke="hsl(160, 100%, 45%)" fill="url(#cpuGrad)" strokeWidth={2} name="CPU" />
          <Area type="monotone" dataKey="gpu" stroke="hsl(200, 100%, 50%)" fill="url(#gpuGrad)" strokeWidth={2} name="GPU" />
          <Area type="monotone" dataKey="board" stroke="hsl(35, 100%, 55%)" fill="url(#boardGrad)" strokeWidth={2} name="Placa" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-mono text-[10px] text-muted-foreground">CPU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-mono text-[10px] text-muted-foreground">GPU</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-warning" />
          <span className="font-mono text-[10px] text-muted-foreground">Placa</span>
        </div>
      </div>
    </div>
  );
}
