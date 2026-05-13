import { HardDrive, ArrowUp, ArrowDown } from 'lucide-react'
import { Sparkline } from '../shared/Sparkline'
import { useState, useEffect, useRef } from 'react'
import type { SensorData } from '../../hooks/useSensorData'

interface DisksPanelProps { data: SensorData }

export function DisksPanel({ data }: DisksPanelProps) {
  const disks = data.disks ?? []
  // Track I/O history per disk
  const ioHistory = useRef<Record<string, { read: number[]; write: number[] }>>({})

  useEffect(() => {
    disks.forEach(d => {
      if (!ioHistory.current[d.device]) {
        ioHistory.current[d.device] = { read: [], write: [] }
      }
      const h = ioHistory.current[d.device]
      h.read  = [...h.read.slice(-59),  d.read_mb  ?? 0]
      h.write = [...h.write.slice(-59), d.write_mb ?? 0]
    })
  }, [data.timestamp])

  if (disks.length === 0) {
    return <Empty text="Nenhum disco detectado" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      {disks.map((disk, i) => {
        const color = disk.usage > 85 ? 'hsl(var(--red))' : disk.usage > 65 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'
        const io = ioHistory.current[disk.device] ?? { read: [], write: [] }
        const free = disk.total_gb - disk.used_gb

        return (
          <div key={i} style={{
            padding: '16px 18px', borderRadius: 14,
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
          }}>
            {/* Row 1: icon + info + usage % */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${color}1a`, border: `1px solid ${color}44`,
              }}>
                <HardDrive size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text))' }}>
                      {disk.mount}
                    </div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 1 }}>
                      {disk.device} · {disk.fstype}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'JetBrains Mono', color, lineHeight: 1 }}>
                      {disk.usage}%
                    </div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                      {disk.used_gb.toFixed(1)} / {disk.total_gb.toFixed(1)} GB
                    </div>
                  </div>
                </div>

                {/* Usage bar */}
                <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'hsl(var(--border))' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${disk.usage}%`,
                    background: color, transition: 'width 0.6s ease',
                    boxShadow: disk.usage > 65 ? `0 0 12px ${color}66` : 'none',
                  }} />
                </div>
              </div>
            </div>

            {/* Row 2: stats chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <Chip label="Livre" value={`${free.toFixed(1)} GB`} />
              <Chip label="Total" value={`${disk.total_gb.toFixed(1)} GB`} />
              <Chip label="Leitura" value={`${(disk.read_mb ?? 0).toFixed(1)} MB/s`} color="hsl(var(--green))" />
              <Chip label="Escrita" value={`${(disk.write_mb ?? 0).toFixed(1)} MB/s`} color="hsl(var(--orange))" />
            </div>

            {/* Row 3: I/O sparklines */}
            {(io.read.length > 2 || io.write.length > 2) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 10, color: 'hsl(var(--muted))' }}>
                    <ArrowDown size={10} color="hsl(var(--green))" /> Leitura
                  </div>
                  <Sparkline data={io.read} height={36} color="hsl(var(--green))" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 10, color: 'hsl(var(--muted))' }}>
                    <ArrowUp size={10} color="hsl(var(--orange))" /> Escrita
                  </div>
                  <Sparkline data={io.write} height={36} color="hsl(var(--orange))" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: '4px 10px', borderRadius: 8, fontSize: 11,
      background: 'hsl(var(--glass))', border: '1px solid hsl(var(--border))',
    }}>
      <span style={{ color: 'hsl(var(--muted))' }}>{label} </span>
      <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', color: color ?? 'hsl(var(--text))' }}>
        {value}
      </span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))', fontSize: 13 }}>{text}</div>
}
