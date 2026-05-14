import { useState, useEffect, useRef } from 'react'
import { Sparkline } from '../shared/Sparkline'
import type { SensorData } from '../../hooks/useSensorData'

interface CpuPanelProps {
  data: SensorData
  cpuHistory: number[]
}

export function CpuPanel({ data, cpuHistory }: CpuPanelProps) {
  const cpusTemps = data.cpus_temps ?? []
  const sockets   = data.cpu?.sockets ?? []

  if (cpusTemps.length === 0) {
    return <Empty text="Aguardando dados do CPU..." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%' }}>
      {cpusTemps.map((cpu) => {
        const sock  = sockets.find(s => s.id === cpu.socket)
        const model = sock?.model ?? data.cpu?.model ?? `CPU ${cpu.socket}`
        const freq  = sock?.freq  ?? data.cpu?.freq  ?? 0
        const usage = sock?.usage ?? data.cpu?.usage ?? 0
        const pkg   = cpu.package ?? 0

        return (
          <div key={cpu.socket} style={{
            borderRadius: 16, padding: '16px 18px',
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
          }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text))' }}>
                  CPU {cpu.socket}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'hsl(var(--muted))' }}>
                    {sock?.core_count ?? cpu.cores.length}C / {sock?.thread_count ?? cpu.cores.length}T
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {model}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                <Metric label="Uso médio" value={`${Math.round(usage)}%`}  color="hsl(var(--accent))" />
                <Metric label="Package"   value={`${Math.round(pkg)}°C`}   color="hsl(var(--orange))" />
                <Metric label="Freq"      value={`${freq.toFixed(2)} GHz`} color="hsl(var(--muted))"  />
              </div>
            </div>

            {/* ── Sparkline ── */}
            <div style={{ height: 36, marginBottom: 14 }}>
              <Sparkline data={cpuHistory} height={36}
                color={usage > 85 ? 'hsl(var(--red))' : usage > 60 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'} />
            </div>

            {/* ── Legenda ── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 10, color: 'hsl(var(--muted))' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'hsl(var(--accent))', display: 'inline-block' }} />
                Atividade (%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'hsl(var(--orange))', display: 'inline-block' }} />
                Temperatura (°C)
              </span>
            </div>

            {/* ── Grade de núcleos ── */}
            <CoreGrid cores={cpu.cores} pkgTemp={pkg} />
          </div>
        )
      })}
    </div>
  )
}

// ── Barras verticais por núcleo ───────────────────────────────────────────────
function CoreGrid({ cores, pkgTemp }: { cores: SensorData['cpus_temps'][0]['cores']; pkgTemp: number }) {
  const BAR_W   = 28   // px por núcleo
  const BAR_H   = 80   // altura máxima das barras
  const GAP     = 4

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: GAP,
      alignItems: 'flex-end',
    }}>
      {cores.map((core) => {
        const usage   = Math.min(core.usage ?? 0,  100)
        const temp    = Math.min(core.temp  ?? pkgTemp, 105)
        const tempPct = temp / 105

        const usageH = Math.max(2, (usage / 100) * BAR_H)
        const tempH  = Math.max(2, tempPct * BAR_H)

        const tempColor = temp > 85 ? 'hsl(var(--red))' : temp > 70 ? 'hsl(var(--orange))' : 'hsl(32 100% 58%)'
        const usageColor = usage > 85 ? 'hsl(var(--red))' : 'hsl(var(--accent))'

        return (
          <div key={core.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {/* Valores */}
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: 'hsl(var(--muted))', lineHeight: 1, textAlign: 'center' }}>
              <div style={{ color: tempColor }}>{Math.round(temp)}°</div>
            </div>

            {/* Container das duas barras lado a lado */}
            <div style={{
              display: 'flex', gap: 2, alignItems: 'flex-end',
              height: BAR_H, position: 'relative',
            }}>
              {/* Barra de atividade (azul) */}
              <div style={{ width: 10, height: BAR_H, display: 'flex', alignItems: 'flex-end',
                background: 'hsl(var(--border))', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: '100%', height: `${usageH}px`,
                  background: usageColor,
                  borderRadius: 3,
                  transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: usage > 60 ? `0 0 6px ${usageColor}88` : 'none',
                }} />
              </div>
              {/* Barra de temperatura (laranja) */}
              <div style={{ width: 10, height: BAR_H, display: 'flex', alignItems: 'flex-end',
                background: 'hsl(var(--border))', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: '100%', height: `${tempH}px`,
                  background: tempColor,
                  borderRadius: 3,
                  transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: temp > 70 ? `0 0 6px ${tempColor}88` : 'none',
                }} />
              </div>
            </div>

            {/* Uso % */}
            <div style={{ fontSize: 8, fontFamily: 'JetBrains Mono', color: usageColor, lineHeight: 1 }}>
              {Math.round(usage)}%
            </div>

            {/* Label do núcleo */}
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
    <div>
      <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{value}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))', fontSize: 13 }}>{text}</div>
}
