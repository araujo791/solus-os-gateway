import { Zap, Leaf, Flame, Settings2 } from "lucide-react";

const profiles = [
  { id: "silent", label: "Silent", icon: Leaf, description: "Low noise, reduced performance" },
  { id: "balanced", label: "Balanced", icon: Settings2, description: "Optimal balance" },
  { id: "performance", label: "Performance", icon: Zap, description: "Maximum performance" },
  { id: "turbo", label: "Turbo", icon: Flame, description: "Full power, all fans max" },
];

interface PowerProfileProps {
  active: string;
  onChange: (id: string) => void;
}

export function PowerProfile({ active, onChange }: PowerProfileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Power Profile
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {profiles.map((profile) => {
          const isActive = active === profile.id;
          const Icon = profile.icon;
          return (
            <button
              key={profile.id}
              onClick={() => onChange(profile.id)}
              className={`group relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                isActive
                  ? "border-primary/50 bg-primary/10 glow-primary"
                  : "border-border bg-secondary/30 hover:border-primary/20 hover:bg-secondary/50"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span
                className={`font-display text-xs font-semibold uppercase tracking-wider ${
                  isActive ? "text-primary text-glow-primary" : "text-foreground"
                }`}
              >
                {profile.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{profile.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
