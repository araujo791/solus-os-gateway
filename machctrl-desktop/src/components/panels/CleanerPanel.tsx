import { useState, useCallback } from 'react'
import { Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface CleanTask {
  id: string
  label: string
  description: string
  command: string[]
  sizeMb?: number
  status: 'idle' | 'running' | 'done' | 'error'
  result?: string
}

const TASKS: Omit<CleanTask, 'status'>[] = [
  {
    id: 'pacman-cache',
    label: 'Cache do Pacman',
    description: 'Remove pacotes antigos do cache (/var/cache/pacman/pkg)',
    command: ['paccache', '-r'],
  },
  {
    id: 'pacman-orphans',
    label: 'Pacotes Órfãos',
    description: 'Remove pacotes sem dependentes',
    command: ['bash', '-c', 'pacman -Qdtq | pacman -Rns - 2>/dev/null || true'],
  },
  {
    id: 'journal-logs',
    label: 'Logs do Journal',
    description: 'Limpa logs do systemd-journald (mantém 7 dias)',
    command: ['journalctl', '--vacuum-time=7d'],
  },
  {
    id: 'temp-files',
    label: 'Arquivos Temporários',
    description: 'Remove /tmp e /var/tmp antigos',
    command: ['bash', '-c', 'find /tmp -type f -atime +7 -delete 2>/dev/null; find /var/tmp -type f -atime +30 -delete 2>/dev/null'],
  },
  {
    id: 'thumbnail-cache',
    label: 'Cache de Miniaturas',
    description: 'Limpa cache de thumbnails do usuário',
    command: ['bash', '-c', 'rm -rf ~/.cache/thumbnails/*'],
  },
  {
    id: 'coredumps',
    label: 'Core Dumps',
    description: 'Remove arquivos de crash dump',
    command: ['bash', '-c', 'rm -f /var/lib/systemd/coredump/* 2>/dev/null; coredumpctl clean 2>/dev/null || true'],
  },
]

export function CleanerPanel() {
  const [tasks, setTasks] = useState<CleanTask[]>(
    TASKS.map(t => ({ ...t, status: 'idle' as const }))
  )
  const [running, setRunning] = useState(false)

  const setStatus = (id: string, status: CleanTask['status'], result?: string) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status, result } : t))

  const runTask = useCallback(async (task: CleanTask) => {
    setStatus(task.id, 'running')
    try {
      // In Electron context: would use ipcRenderer to run commands
      // For now, simulate with timeout
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
      setStatus(task.id, 'done', 'Concluído com sucesso')
    } catch (e: any) {
      setStatus(task.id, 'error', e.message)
    }
  }, [])

  const runAll = useCallback(async () => {
    setRunning(true)
    setTasks(ts => ts.map(t => ({ ...t, status: 'idle', result: undefined })))
    for (const task of tasks) {
      await runTask(task)
    }
    setRunning(false)
  }, [tasks, runTask])

  const reset = () => setTasks(ts => ts.map(t => ({ ...t, status: 'idle', result: undefined })))

  const doneCount = tasks.filter(t => t.status === 'done').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 14,
        background: 'hsl(var(--surface))',
        border: '1px solid hsl(var(--border))',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text))' }}>Limpeza do Sistema</div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>
            Libere espaço removendo caches, logs e pacotes desnecessários
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={reset} disabled={running} secondary>
            <RefreshCw size={13} /> Resetar
          </Btn>
          <Btn onClick={runAll} disabled={running}>
            <Trash2 size={13} /> {running ? 'Limpando...' : 'Limpar Tudo'}
          </Btn>
        </div>
      </div>

      {/* Progress */}
      {(running || doneCount > 0) && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'hsl(var(--glass))',
          border: '1px solid hsl(var(--border) / 0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'hsl(var(--muted))' }}>
            <span>{doneCount}/{tasks.length} tarefas concluídas</span>
            <span>{Math.round((doneCount / tasks.length) * 100)}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'hsl(var(--border))' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${(doneCount / tasks.length) * 100}%`,
              background: 'hsl(var(--accent))',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} onRun={() => !running && runTask(task)} />
        ))}
      </div>
    </div>
  )
}

function TaskRow({ task, onRun }: { task: CleanTask; onRun: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderRadius: 12,
      background: 'hsl(var(--surface))',
      border: `1px solid ${
        task.status === 'done'  ? 'hsl(var(--accent) / 0.3)' :
        task.status === 'error' ? 'hsl(var(--red) / 0.3)' :
        'hsl(var(--border))'
      }`,
      transition: 'border-color 0.3s',
    }}>
      {/* Status icon */}
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {task.status === 'idle'    && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsl(var(--border))' }} />}
        {task.status === 'running' && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid hsl(var(--accent))', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />}
        {task.status === 'done'    && <CheckCircle size={16} color="hsl(var(--accent))" />}
        {task.status === 'error'   && <AlertCircle size={16} color="hsl(var(--red))" />}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>{task.label}</div>
        <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 1 }}>
          {task.result ?? task.description}
        </div>
      </div>
      {/* Action */}
      {task.status === 'idle' && (
        <button onClick={onRun} style={{
          padding: '5px 12px', borderRadius: 8, border: '1px solid hsl(var(--border))',
          background: 'transparent', color: 'hsl(var(--text))', fontSize: 11, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          Executar
        </button>
      )}
    </div>
  )
}

function Btn({ children, onClick, disabled, secondary }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      border: secondary ? '1px solid hsl(var(--border))' : '1px solid transparent',
      background: secondary ? 'transparent' : 'hsl(var(--accent))',
      color: secondary ? 'hsl(var(--text))' : '#000',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}
