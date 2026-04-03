import { useState } from "react";
import { Fan } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FanControlProps {
  name: string;
  rpm: number;
  maxRpm: number;
  speed: number;
  onSpeedChange: (value: number) => void;
}

export function FanControl({ name, rpm, maxRpm, speed, onSpeedChange }: FanControlProps) {
  const [isAuto, setIsAuto] = useState(true);

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:glow-primary">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(hsl(160, 100%, 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(160, 100%, 45%) 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }} />
      
      <div className="relative flex items-center gap-4">
        {/* Animated fan icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-glow" />
          <Fan 
            className="h-10 w-10 text-primary transition-all" 
            style={{ 
              animation: rpm > 0 ? `sweep ${Math.max(0.2, 2 - (rpm / maxRpm) * 1.8)}s linear infinite` : 'none' 
            }} 
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
              {name}
            </h4>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary text-glow-primary">
                {rpm}
              </span>
              <span className="text-xs text-muted-foreground">RPM</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuto(!isAuto)}
              className={`rounded px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wider transition-all ${
                isAuto
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {isAuto ? "Auto" : "Manual"}
            </button>
            <div className="flex-1">
              <Slider
                value={[speed]}
                onValueChange={(v) => onSpeedChange(v[0])}
                max={100}
                step={5}
                disabled={isAuto}
                className="cursor-pointer"
              />
            </div>
            <span className="w-10 text-right font-mono text-sm text-muted-foreground">
              {speed}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
