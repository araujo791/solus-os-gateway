import { useEffect, useRef } from "react";

interface GaugeChartProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color?: "primary" | "accent" | "warning" | "destructive";
  size?: number;
}

const colorMap = {
  primary: { stroke: "hsl(160, 100%, 45%)", glow: "hsl(160, 100%, 45%, 0.4)" },
  accent: { stroke: "hsl(200, 100%, 50%)", glow: "hsl(200, 100%, 50%, 0.4)" },
  warning: { stroke: "hsl(35, 100%, 55%)", glow: "hsl(35, 100%, 55%, 0.4)" },
  destructive: { stroke: "hsl(0, 85%, 55%)", glow: "hsl(0, 85%, 55%, 0.4)" },
};

export function GaugeChart({ value, max, label, unit, color = "primary", size = 140 }: GaugeChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = colorMap[color];

  const dynamicColor = percentage > 85 ? colorMap.destructive : percentage > 65 ? colorMap.warning : colors;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <defs>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke="hsl(220, 15%, 15%)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke={dynamicColor.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter={`url(#glow-${label})`}
          className="transition-all duration-700 ease-out"
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fill={dynamicColor.stroke}
          fontSize="24"
          fontFamily="Orbitron"
          fontWeight="700"
        >
          {Math.round(value)}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          fill="hsl(215, 15%, 55%)"
          fontSize="11"
          fontFamily="Rajdhani"
        >
          {unit}
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-display">
        {label}
      </span>
    </div>
  );
}
