import { useState, useRef, useCallback } from "react";
import { Play, Square, Award, Cpu, MemoryStick, HardDrive } from "lucide-react";

interface BenchResult {
  name: string;
  score: number;
  unit: string;
  detail?: string;
  rating?: "poor" | "ok" | "good" | "great";
}
type BenchState = "idle" | "running" | "done";

function runCpuBench(): Promise<BenchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = performance.now();
      let n = 0;
      const limit = 1_000_000;
      const sieve = new Uint8Array(limit + 1);
      sieve.fill(1);
      sieve[0] = sieve[1] = 0;
      for (let i = 2; i * i <= limit; i++) {
        if (sieve[i]) for (let j = i * i; j <= limit; j += i) sieve[j] = 0;
      }
      for (let i = 0; i <= limit; i++) if (sieve[i]) n++;
      const elapsed = performance.now() - start;
      const score = Math.round((100_000 / elapsed) * 10) / 10;
      resolve({
        name: "CPU (Crivo de Eratóstenes)",
        score,
        unit: "pts/ms",
        detail: `${n.toLocaleString()} primos em ${elapsed.toFixed(0)}ms`,
        rating: score > 40 ? "great" : score > 20 ? "good" : score > 10 ? "ok" : "poor",
      });
    }, 50);
  });
}

function runFpBench(): Promise<BenchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = performance.now();
      let acc = 0;
      for (let i = 1; i <= 10_000_000; i++) {
        acc += (Math.sqrt(i) * Math.log(i)) / Math.sin(i + 0.01);
      }
      const elapsed = performance.now() - start;
      const score = Math.round(10_000_000 / elapsed);
      resolve({
        name: "CPU Ponto Flutuante",
        score,
        unit: "ops/ms",
        detail: `10M sqrt/log/sin em ${elapsed.toFixed(0)}ms · acc=${acc.toExponential(2)}`,
        rating: score > 200 ? "great" : score > 100 ? "good" : score > 50 ? "ok" : "poor",
      });
    }, 50);
  });
}

function runMemBench(): Promise<BenchResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const size = 64 * 1024 * 1024;
      const buf = new Float64Array(size / 8);
      const start = performance.now();
      for (let i = 0; i < buf.length; i++) buf[i] = i * 1.0000001;
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const elapsed = performance.now() - start;
      const bw = Math.round(((size * 2) / elapsed / 1024 / 1024) * 1000);
      resolve({
        name: "Memória (Largura de Banda)",
        score: bw,
        unit: "MB/s",
        detail: `${(size / 1024 / 1024).toFixed(0)}MB R+W em ${elapsed.toFixed(0)}ms · checksum: ${(sum % 9999).toFixed(0)}`,
        rating: bw > 20000 ? "great" : bw > 10000 ? "good" : bw > 5000 ? "ok" : "poor",
      });
    }, 50);
  });
}

const RATING_CLASS: Record<string, string> = {
  great: "text-primary border-primary/40 bg-primary/10",
  good: "text-accent border-accent/40 bg-accent/10",
  ok: "text-warning border-warning/40 bg-warning/10",
  poor: "text-destructive border-destructive/40 bg-destructive/10",
};
const RATING_LABEL: Record<string, string> = {
  great: "Excelente",
  good: "Bom",
  ok: "Regular",
  poor: "Fraco",
};

export default function BenchmarkPage() {
  const [state, setState] = useState<BenchState>("idle");
  const [results, setResults] = useState<BenchResult[]>([]);
  const [current, setCurrent] = useState("");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  const run = useCallback(async () => {
    setState("running");
    abortRef.current = false;
    setResults([]);
    const steps = [
      { label: "CPU — Crivo de Eratóstenes", fn: runCpuBench },
      { label: "CPU — Ponto Flutuante", fn: runFpBench },
      { label: "Memória — Largura de Banda", fn: runMemBench },
    ];
    const out: BenchResult[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (abortRef.current) break;
      setCurrent(steps[i].label);
      setProgress(Math.round((i / steps.length) * 100));
      const r = await steps[i].fn();
      out.push(r);
      setResults([...out]);
    }
    setCurrent("");
    setProgress(100);
    setState("done");
  }, []);

  const stop = () => {
    abortRef.current = true;
    setState("idle");
    setCurrent("");
  };
  const reset = () => {
    setResults([]);
    setState("idle");
    setProgress(0);
  };

  const overallScore = results.length
    ? Math.round(
        results.reduce((s, r) => {
          const norm =
            r.unit === "pts/ms" ? r.score * 10 : r.unit === "ops/ms" ? r.score / 5 : r.score / 100;
          return s + norm;
        }, 0) / results.length,
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Benchmark do Sistema</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              Testa CPU (matemática + ponto flutuante) e largura de banda da memória
            </p>
          </div>
          <div className="flex gap-2">
            {state === "running" ? (
              <button onClick={stop} className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
                <Square className="h-3 w-3" /> Parar
              </button>
            ) : (
              <>
                {results.length > 0 && (
                  <button onClick={reset} className="rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs font-semibold text-foreground">
                    Resetar
                  </button>
                )}
                <button onClick={run} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  <Play className="h-3 w-3" /> Iniciar
                </button>
              </>
            )}
          </div>
        </div>

        {state === "running" && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{current}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 rounded bg-border">
              <div
                className="h-full rounded bg-primary transition-all"
                style={{ width: `${progress}%`, boxShadow: "0 0 10px hsl(var(--primary)/0.5)" }}
              />
            </div>
          </div>
        )}
      </div>

      {state === "done" && overallScore != null && (
        <div className="flex items-center gap-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
          <Award className="h-10 w-10 text-primary" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Pontuação Geral
            </div>
            <div className="font-mono text-5xl font-black text-primary text-glow-primary">
              {overallScore.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border bg-card p-4 ${r.rating ? RATING_CLASS[r.rating].split(" ").filter((c) => c.startsWith("border-")).join(" ") : "border-border"}`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground">{r.name}</div>
                <div className="flex items-center gap-2">
                  {r.rating && (
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${RATING_CLASS[r.rating]}`}>
                      {RATING_LABEL[r.rating]}
                    </span>
                  )}
                  <span className="font-mono text-xl font-bold text-foreground">
                    {r.score.toLocaleString()}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">{r.unit}</span>
                  </span>
                </div>
              </div>
              {r.detail && <div className="font-mono text-[10px] text-muted-foreground">{r.detail}</div>}
            </div>
          ))}
        </div>
      )}

      {state === "idle" && results.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          <div className="flex gap-4">
            <Cpu className="h-7 w-7 text-primary" />
            <MemoryStick className="h-7 w-7 text-accent" />
            <HardDrive className="h-7 w-7 text-warning" />
          </div>
          <div className="text-sm font-semibold text-foreground">Pronto para Benchmark</div>
          <div className="text-xs">Clique em Iniciar para rodar os testes de CPU e Memória</div>
        </div>
      )}
    </div>
  );
}
