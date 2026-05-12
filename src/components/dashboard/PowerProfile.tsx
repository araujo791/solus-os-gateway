import { Zap, Leaf, Settings2 } from "lucide-react";

const profileMeta: Record<string, { label: string; icon: any; description: string }> = {
  // Mapeamento flexível — "silent", "powersave", "economia" → Economia
  silent:      { label: "Economia",    icon: Leaf,      description: "Baixo consumo" },
  powersave:   { label: "Economia",    icon: Leaf,      description: "Baixo consumo" },
  economia:    { label: "Economia",    icon: Leaf,      description: "Baixo consumo" },
  balanced:    { label: "Equilibrado", icon: Settings2, description: "Equilíbrio ideal" },
  performance: { label: "Desempenho",  icon: Zap,       description: "Máximo" },
};

// Canonicaliza para um de três IDs exibidos
function canonicalId(id: string): "economia" | "balanced" | "performance" {
  if (id === "silent" || id === "powersave" || id === "economia") return "economia";
  if (id === "performance") return "performance";
  return "balanced";
}

const DISPLAY_ORDER: Array<"economia" | "balanced" | "performance"> = ["economia", "balanced", "performance"];

interface PowerProfileProps {
  active: string;
  available: string[];
  onChange: (id: string) => void;
}

export function PowerProfile({ active, available, onChange }: PowerProfileProps) {
  // Deduplica mostrando sempre 3 botões: economia, equilibrado, desempenho
  // Só mostra se ao menos um do grupo estiver disponível
  const availableCanonical = new Set(available.map(canonicalId));

  // Sempre mostra os 3 — desabilita os que não estão disponíveis
  const activeCanonical = canonicalId(active);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Perfil de Energia
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground opacity-60">
          ativo: <span className="text-foreground">{profileMeta[active]?.label ?? active}</span>
        </span>
      </div>
      <div className="grid gap-2 grid-cols-3">
        {DISPLAY_ORDER.map((cid) => {
          const meta = profileMeta[cid];
          const isActive = activeCanonical === cid;
          const isAvailable = availableCanonical.has(cid);
          const Icon = meta.icon;

          // Mapeia canonical → raw id para enviar ao backend
          const rawId = cid === "economia"
            ? (available.find((a) => a === "silent" || a === "powersave" || a === "economia") ?? "balanced")
            : cid;

          return (
            <button
              key={cid}
              onClick={() => isAvailable && onChange(rawId)}
              disabled={!isAvailable}
              className={`group relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                isActive
                  ? "border-primary/50 bg-primary/10 glow-primary"
                  : isAvailable
                  ? "border-border bg-secondary/30 hover:border-primary/20 hover:bg-secondary/50"
                  : "border-border/30 bg-secondary/10 opacity-40 cursor-not-allowed"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : isAvailable ? "text-muted-foreground group-hover:text-foreground" : "text-muted-foreground"
                }`}
              />
              <span
                className={`font-display text-xs font-semibold uppercase tracking-wider ${
                  isActive ? "text-primary text-glow-primary" : "text-foreground"
                }`}
              >
                {meta.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{meta.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
