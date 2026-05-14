import { useRef } from 'react'
import { Sparkline } from '../shared/Sparkline'
import type { SensorData } from '../../hooks/useSensorData'

interface CpuPanelProps {
  data: SensorData
  cpuHistory: number[]
}

export function CpuPanel({ data, cpuHistory }: CpuPanelProps) {
  const cpusTemps = data.cpus_temps ?? []
  const sockets   = data.cpu?.sockets ?? []

  if (!cpusTemps.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))' }}>
      Aguardando dados do CPU...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%' }}>
      {cpusTemps.map((cpu) => {
        const sock  = sockets.find(s => s.id === cpu.socket)
        const model = sock?.model ?? data.cpu?.model ?? `CPU ${cpu.socket}`
        const freq  = sock?.freq  ?? data.cpu?.freq  ?? 0
        const usage = sock?.usage ?? data.cpu?.usage ?? 0
        const pkg   = cpu.package ?? 0
        const coreCount   = sock?.core_count   ?? cpu.cores.length
        const threadCount = sock?.thread_count ?? cpu.cores.length

        // Nome curto da CPU
        const shortName = model
          .replace(/Intel\(R\)|Core\(TM\)/gi, '').replace(/\s+/g, ' ').trim()

        const usageColor = usage > 85 ? 'hsl(var(--red))' : usage > 60 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'
        const tempColor  = pkg   > 85 ? 'hsl(var(--red))' : pkg   > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))'

        return (
          <div key={cpu.socket} style={{
            borderRadius: 16, padding: '18px 20px',
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
          }}>
            {/* ── Badge CPU ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Badge com número do CPU */}
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, hsl(var(--accent) / 0.15), hsl(var(--purple) / 0.1))',
                  border: '1px solid hsl(var(--accent) / 0.3)',
                }}>
                  <span style={{ fontSize: 9, color: 'hsl(var(--muted))', lineHeight: 1 }}>CPU</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: 'hsl(var(--accent))', lineHeight: 1.1 }}>{cpu.socket}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text))' }}>
                    {shortName}
                  </div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>
                    {coreCount} núcleos · {threadCount} threads · {freq.toFixed(2)} GHz
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 18 }}>
                <Metric label="Uso médio" value={`${Math.round(usage)}%`}      color={usageColor} />
                <Metric label="Package"   value={`${Math.round(pkg)}°C`}       color={tempColor} />
                <Metric label="Freq"      value={`${freq.toFixed(2)} GHz`}     color="hsl(var(--muted))" />
              </div>
            </div>

            {/* ── Sparkline ── */}
            <div style={{ height: 40, marginBottom: 14 }}>
              <Sparkline data={cpuHistory} height={40} color={usageColor} />
            </div>

            {/* ── Legenda ── */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 10, color: 'hsl(var(--muted))' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 6, borderRadius: 2, background: 'hsl(var(--accent))', display: 'inline-block' }} />
                Atividade (%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 6, borderRadius: 2, background: 'hsl(var(--orange))', display: 'inline-block' }} />
                Temperatura (°C)
              </span>
            </div>

            {/* ── Barras verticais ── */}
            <CoreGrid cores={cpu.cores} pkgTemp={pkg} />
          </div>
        )
      })}
    </div>
  )
}

function CoreGrid({ cores, pkgTemp }: { cores: SensorData['cpus_temps'][0]['cores']; pkgTemp: number }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      gap: '6px 4px', alignItems: 'flex-end',
    }}>
      {cores.map((core) => {
        const usage   = Math.min(core.usage ?? 0, 100)
        const temp    = Math.min(core.temp  ?? pkgTemp, 105)
        const usagePct = usage / 100
        const tempPct  = temp  / 105
        const BAR_H    = 90

        const usageH = Math.max(2, usagePct * BAR_H)
        const tempH  = Math.max(2, tempPct  * BAR_H)

        const tempColor  = temp  > 85 ? 'hsl(var(--red))' : temp  > 70 ? 'hsl(var(--orange))' : 'hsl(32 100% 58%)'
        const usageColor = usage > 85 ? 'hsl(var(--red))' : 'hsl(var(--accent))'

        return (
          <div key={core.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: '0 0 auto' }}>
            {/* Temp acima */}
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: tempColor, lineHeight: 1 }}>
              {Math.round(temp)}°
            </div>

            {/* Duas barras lado a lado */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: BAR_H }}>
              {/* Atividade (azul) */}
              <div style={{ width: 9, height: BAR_H, display: 'flex', alignItems: 'flex-end', background: 'hsl(var(--border))', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: `${usageH}px`, background: usageColor, borderRadius: 3, transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
              {/* Temperatura (laranja) */}
              <div style={{ width: 9, height: BAR_H, display: 'flex', alignItems: 'flex-end', background: 'hsl(var(--border))', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: `${tempH}px`, background: tempColor, borderRadius: 3, transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>

            {/* Uso abaixo */}
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: usageColor, lineHeight: 1 }}>
              {Math.round(usage)}%
            </div>

            {/* Label */}
            <div style={{ fontSize: 7.5, color: 'hsl(var(--muted))', opacity: 0.6, lineHeight: 1 }}>
              C{core.id}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{value}</div>
    </div>
  )
}
