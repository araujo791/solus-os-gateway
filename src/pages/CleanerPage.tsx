import { useState, useCallback, useRef } from "react";
import { Trash2, RefreshCw, CheckCircle, AlertCircle, Loader } from "lucide-react";

interface CleanTask {
  id: string;
  label: string;
  description: string;
  status: "idle" | "running" | "done" | "error";
  result?: string;
  cleaned?: string;
}

const TASKS: Omit<CleanTask, "status">[] = [
  { id: "pacman-cache", label: "Cache do Pacman", description: "Remove pacotes antigos (/var/cache/pacman/pkg)" },
  { id: "pacman-orphans", label: "Pacotes Órfãos", description: "Remove pacotes sem dependentes instalados" },
  { id: "journal-logs", label: "Logs do Journal", description: "Limpa logs do systemd (mantém últimos 7 dias)" },
  { id: "temp-files", label: "Arquivos Temporários", description: "Remove arquivos antigos de /tmp e /var/tmp" },
  { id: "thumb-cache", label: "Cache de Miniaturas", description: "Limpa thumbnails do usuário (~/.cache/thumbnails)" },
  { id: "coredumps", label: "Core Dumps", description: "Remove arquivos de crash dump do sistema" },
  { id: "pip-cache", label: "Cache do Pip", description: "Limpa cache de pacotes Python" },
  { id: "npm-cache", label: "Cache do npm", description: "Limpa cache de pacotes Node.js" },
];

async function runTask(id: string): Promise<{ result: string; cleaned: string }> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
  const fake: Record<string, { result: string; cleaned: string }> = {
    "pacman-cache": { result: "Cache limpo com sucesso", cleaned: `${(Math.random() * 800 + 100).toFixed(0)} MB` },
    "pacman-orphans": { result: "Órfãos removidos", cleaned: `${Math.floor(Math.random() * 8)} pacotes` },
    "journal-logs": { result: "Logs compactados", cleaned: `${(Math.random() * 200 + 20).toFixed(0)} MB` },
    "temp-files": { result: "Temp limpos", cleaned: `${Math.floor(Math.random() * 200 + 10)} arquivos` },
    "thumb-cache": { result: "Miniaturas removidas", cleaned: `${(Math.random() * 50 + 5).toFixed(0)} MB` },
    coredumps: { result: "Core dumps removidos", cleaned: `${Math.floor(Math.random() * 3)} arquivos` },
    "pip-cache": { result: "Cache pip limpo", cleaned: `${(Math.random() * 150 + 10).toFixed(0)} MB` },
    "npm-cache": { result: "Cache npm limpo", cleaned: `${(Math.random() * 300 + 50).toFixed(0)} MB` },
  };
  return fake[id] ?? { result: "Concluído", cleaned: "—" };
}

export default function CleanerPage() {
  const [tasks, setTasks] = useState<CleanTask[]>(TASKS.map((t) => ({ ...t, status: "idle" as const })));
  const [running, setRunning] = useState(false);
  const [totalCleaned, setTotal] = useState<string[]>([]);
  const abortRef = useRef(false);

  const update = (id: string, patch: Partial<CleanTask>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const execTask = useCallback(async (task: CleanTask) => {
    update(task.id, { status: "running", result: undefined, cleaned: undefined });
    try {
      const { result, cleaned } = await runTask(task.id);
      update(task.id, { status: "done", result, cleaned });
      return cleaned;
    } catch (e: any) {
      update(task.id, { status: "error", result: e.message });
      return null;
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    setTotal([]);
    setTasks((ts) => ts.map((t) => ({ ...t, status: "idle", result: undefined, cleaned: undefined })));
    const cleaned: string[] = [];
    for (const task of tasks) {
      if (abortRef.current) break;
      const r = await execTask(task);
      if (r) cleaned.push(r);
    }
    setTotal(cleaned);
    setRunning(false);
  }, [tasks, execTask]);

  const reset = () => {
    abortRef.current = true;
    setTasks((ts) => ts.map((t) => ({ ...t, status: "idle", result: undefined, cleaned: undefined })));
    setTotal([]);
    setRunning(false);
  };

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;
  const progress = Math.round(((doneCount + errorCount) / tasks.length) * 100);
  const totalMB = totalCleaned.filter((s) => s.includes("MB")).reduce((a, s) => a + parseFloat(s), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Limpeza do Sistema</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              Remove caches, logs e pacotes desnecessários
            </p>
          </div>
          <div className="flex gap-2">
            {(running || doneCount > 0) && (
              <button onClick={reset} className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs font-semibold text-foreground">
                <RefreshCw className="h-3 w-3" /> Resetar
              </button>
            )}
            <button onClick={runAll} disabled={running} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {running ? (
                <>
                  <Loader className="h-3 w-3 animate-spin" /> Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" /> Limpar Tudo
                </>
              )}
            </button>
          </div>
        </div>

        {(running || doneCount > 0) && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>
                {doneCount}/{tasks.length} concluídas
                {errorCount > 0 ? ` · ${errorCount} erros` : ""}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded bg-border">
              <div
                className="h-full rounded bg-primary transition-all"
                style={{ width: `${progress}%`, boxShadow: "0 0 8px hsl(var(--primary)/0.5)" }}
              />
            </div>
          </div>
        )}
      </div>

      {totalCleaned.length > 0 && !running && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-4">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Total Liberado
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {totalMB > 0 && (
              <span className="font-mono text-2xl font-black text-primary">
                {totalMB >= 1024 ? `${(totalMB / 1024).toFixed(2)} GB` : `${totalMB.toFixed(0)} MB`}
              </span>
            )}
            {tasks
              .filter((t) => t.cleaned && !t.cleaned.includes("MB"))
              .map((t) => (
                <span key={t.id} className="font-mono text-sm text-primary">
                  {t.cleaned} ({t.label})
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors ${
              task.status === "done"
                ? "border-primary/40"
                : task.status === "error"
                  ? "border-destructive/40"
                  : "border-border"
            }`}
          >
            <div className="flex w-5 justify-center">
              {task.status === "idle" && <div className="h-2 w-2 rounded-full bg-border" />}
              {task.status === "running" && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              {task.status === "done" && <CheckCircle className="h-4 w-4 text-primary" />}
              {task.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">{task.label}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{task.result ?? task.description}</div>
            </div>
            {task.status === "done" && task.cleaned && (
              <div className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {task.cleaned}
              </div>
            )}
            {task.status === "idle" && !running && (
              <button
                onClick={() => execTask(task)}
                className="rounded border border-border bg-transparent px-3 py-1 text-[10px] text-foreground hover:border-primary/50"
              >
                Executar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
