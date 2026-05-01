import { Zap, Leaf, Settings2 } from "lucide-react";

const profileMeta: Record<string, { label: string; icon: any; description: string }> = {
  silent: { label: "Silencioso", icon: Leaf, description: "Baixo ruído" },
  balanced: { label: "Equilibrado", icon: Settings2, description: "Equilíbrio ideal" },
  performance: { label: "Desempenho", icon: Zap, description: "Máximo" },
};

interface PowerProfileProps {
  active: string;
  available: string[];
  onChange: (id: string) => void;
}

export function PowerProfile({ active, available, onChange }: PowerProfileProps) {
  const profiles = available
    .map((id) => ({ id, ...profileMeta[id] }))
    .filter((p) => p.label); // só mostra perfis conhecidos

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Perfil de Energia
      </h3>
      <div className={`grid gap-2 ${profiles.length <= 2 ? "grid-cols-2" : "grid-cols-2"}`}>
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
