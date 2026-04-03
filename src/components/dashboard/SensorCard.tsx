import { LucideIcon } from "lucide-react";

interface SensorCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  trend?: "up" | "down" | "stable";
  color?: "primary" | "accent" | "warning" | "destructive";
}

const colorClasses = {
  primary: "text-primary border-primary/20 bg-primary/5",
  accent: "text-accent border-accent/20 bg-accent/5",
  warning: "text-warning border-warning/20 bg-warning/5",
  destructive: "text-destructive border-destructive/20 bg-destructive/5",
};

export function SensorCard({ icon: Icon, label, value, unit, color = "primary" }: SensorCardProps) {
  return (
    <div className={`rounded-lg border p-3 transition-all hover:scale-[1.02] ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-display text-[10px] font-semibold uppercase tracking-widest opacity-70">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold">{value}</span>
        <span className="text-xs opacity-60">{unit}</span>
      </div>
    </div>
  );
}
