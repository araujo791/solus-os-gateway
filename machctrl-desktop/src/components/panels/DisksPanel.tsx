import { HardDrive, ArrowUp, ArrowDown } from 'lucide-react'
import { Sparkline } from '../shared/Sparkline'
import { useEffect, useRef } from 'react'
import type { SensorData } from '../../hooks/useSensorData'

interface DisksPanelProps { data: SensorData }

export function DisksPanel({ data: rawData }: DisksPanelProps) {
  // Normaliza — backend envia disks.partitions[] ou disks[]
  const disks = normalizeDisks(rawData)
  const ioRef  = useRef<Record<string, { read: number[]; write: number[] }>>({})

  useEffect(() => {
    disks.forEach(d => {
      const key = d.device
      if (!ioRef.current[key]) ioRef.current[key] = { read: [], write: [] }
      ioRef.current[key].read  = [...(ioRef.current[key].read.slice(-59)),  d.read_mb  ?? 0]
      ioRef.current[key].write = [...(ioRef.current[key].write.slice(-59)), d.write_mb ?? 0]
    })
  })

  if (!disks.length) return <Empty text="Nenhum disco detectado" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      {disks.map((disk, i) => {
        const pct   = disk.usage
        const color = pct > 85 ? 'hsl(var(--red))' : pct > 65 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'
        const io    = ioRef.current[disk.device] ?? { read: [], write: [] }
        const free  = disk.total_gb - disk.used_gb

        return (
          <div key={i} style={{ padding: '16px 18px', borderRadius: 14, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}1a`, border: `1px solid ${color}44` }}>
                <HardDrive size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text))' }}>{disk.mount}</div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 1 }}>{disk.device} · {disk.fstype}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono', color, lineHeight: 1 }}>{pct}%</div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>{disk.used_gb.toFixed(1)} / {disk.total_gb.toFixed(1)} GB</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'hsl(var(--border))' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, transition: 'width 0.6s ease', boxShadow: pct > 65 ? `0 0 12px ${color}66` : 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  <Chip label="Livre"   value={`${free.toFixed(1)} GB`} />
                  <Chip label="Leitura" value={`${(disk.read_mb ?? 0).toFixed(1)} MB/s`} color="hsl(var(--green))" />
                  <Chip label="Escrita" value={`${(disk.write_mb ?? 0).toFixed(1)} MB/s`} color="hsl(var(--orange))" />
                </div>
              </div>
            </div>
            {(io.read.length > 2 || io.write.length > 2) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowDown size={10} color="hsl(var(--green))" /> Leitura
                  </div>
                  <Sparkline data={io.read} height={32} color="hsl(var(--green))" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUp size={10} color="hsl(var(--orange))" /> Escrita
                  </div>
                  <Sparkline data={io.write} height={32} color="hsl(var(--orange))" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Normaliza qualquer formato que o backend envie
export function normalizeDisks(data: any): Array<{
  device: string; mount: string; fstype: string
  total_gb: number; used_gb: number; usage: number
  read_mb: number; write_mb: number
}> {
  const raw = data?.disks
  if (!raw) return []

  // Formato novo: { partitions: [], io_rates: {} }
  if (raw.partitions) {
    return raw.partitions.map((p: any) => ({
      device:   p.device   ?? '',
      mount:    p.mountpoint ?? p.mount ?? p.device ?? '',
      fstype:   p.fstype   ?? '',
      total_gb: p.total_gb ?? 0,
      used_gb:  p.used_gb  ?? 0,
      usage:    p.usage_percent ?? p.usage ?? 0,
      read_mb:  (raw.io_rates?.[p.device?.replace('/dev/', '')] ?? raw.io_rates?.[p.device] ?? {}).read_mb  ?? 0,
      write_mb: (raw.io_rates?.[p.device?.replace('/dev/', '')] ?? raw.io_rates?.[p.device] ?? {}).write_mb ?? 0,
    }))
  }

  // Formato array direto
  if (Array.isArray(raw)) {
    return raw.map((p: any) => ({
      device:   p.device   ?? '',
      mount:    p.mountpoint ?? p.mount ?? '',
      fstype:   p.fstype   ?? '',
      total_gb: p.total_gb ?? 0,
      used_gb:  p.used_gb  ?? 0,
      usage:    p.usage_percent ?? p.usage ?? 0,
      read_mb:  p.read_mb  ?? 0,
      write_mb: p.write_mb ?? 0,
    }))
  }

  return []
}

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, background: 'hsl(var(--glass))', border: '1px solid hsl(var(--border))' }}>
      <span style={{ color: 'hsl(var(--muted))' }}>{label} </span>
      <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', color: color ?? 'hsl(var(--text))' }}>{value}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))', fontSize: 13 }}>{text}</div>
}
