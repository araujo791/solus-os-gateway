import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart } from "recharts";

interface TempChartProps {
  data: Record<string, number | string>[];
  series?: { key: string; label: string; color: string }[];
}

const defaultSeries = [
  { key: "cpu", label: "CPU", color: "hsl(160, 100%, 45%)" },
  { key: "gpu", label: "GPU", color: "hsl(200, 100%, 50%)" },
  { key: "board", label: "Placa", color: "hsl(35, 100%, 55%)" },
];

export function TempChart({ data, series }: TempChartProps) {
  const finalSeries = series && series.length > 0 ? series : defaultSeries;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Histórico de Temperaturas
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
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
              fontSize: "11px",
            }}
          />
          {finalSeries.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.key.includes("_pkg") || ["cpu", "gpu", "board"].includes(s.key) ? 2 : 1}
              dot={false}
              isAnimationActive={false}
              name={s.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {finalSeries.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
