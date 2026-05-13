import { CoreRing } from '../shared/RingGauge'
import { Sparkline } from '../shared/Sparkline'
import type { SensorData } from '../../hooks/useSensorData'

interface CpuPanelProps {
  data: SensorData
  cpuHistory: number[]
}

export function CpuPanel({ data, cpuHistory }: CpuPanelProps) {
  const sockets = data.cpu?.sockets ?? []
  const cpusTemps = data.cpus_temps ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%' }}>

      {/* Sockets */}
      {cpusTemps.map((cpu) => {
        const sockInfo = sockets.find(s => s.id === cpu.socket)
        const model = sockInfo?.model ?? data.cpu?.model ?? `CPU ${cpu.socket}`
        const freq  = sockInfo?.freq ?? data.cpu?.freq ?? 0
        const usage = sockInfo?.usage ?? data.cpu?.usage ?? 0

        return (
          <div key={cpu.socket} style={{
            borderRadius: 16, padding: '16px',
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text))' }}>
                  CPU {cpu.socket} — <span style={{ color: 'hsl(var(--accent))' }}>Socket {cpu.socket}</span>
                </div>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>
                  {model}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono',
                  color: usage > 85 ? 'hsl(var(--red))' : usage > 60 ? 'hsl(var(--orange))' : 'hsl(var(--accent))' }}>
                  {Math.round(usage)}%
                </div>
                <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{freq.toFixed(2)} GHz</div>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{ height: 40, marginBottom: 14 }}>
              <Sparkline data={cpuHistory} height={40} color={
                usage > 85 ? 'hsl(var(--red))' : usage > 60 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'
              } />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <Stat label="Package" value={`${cpu.package}°C`} />
              <Stat label="Núcleos" value={String(sockInfo?.core_count ?? cpu.cores.length)} />
              <Stat label="Threads" value={String(sockInfo?.thread_count ?? cpu.cores.length)} />
              <Stat label="Freq" value={`${freq.toFixed(2)} GHz`} />
            </div>

            {/* Core rings legend */}
            <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 8 }}>
              Anel externo = temperatura · Anel interno = atividade
            </div>

            {/* Core grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
              gap: '8px 4px',
            }}>
              {cpu.cores.map(core => (
                <CoreRing
                  key={core.id}
                  id={core.id}
                  temp={core.temp}
                  usage={core.usage ?? 0}
                />
              ))}
            </div>
          </div>
        )
      })}

      {cpusTemps.length === 0 && (
        <Empty text="Aguardando dados do CPU..." />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 8,
      background: 'hsl(var(--glass))',
      border: '1px solid hsl(var(--border))',
    }}>
      <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))', fontFamily: 'JetBrains Mono' }}>{value}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))', fontSize: 13 }}>{text}</div>
  )
}
