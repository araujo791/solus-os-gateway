import { RingGauge } from '../shared/RingGauge'
import { Sparkline } from '../shared/Sparkline'
import { HardDrive, Wind, Thermometer, Cpu, MemoryStick } from 'lucide-react'
import { normalizeDisks } from './DisksPanel'
import type { SensorData } from '../../hooks/useSensorData'

interface OverviewProps {
  data: SensorData
  cpuHistory: number[]
  tempHistory: number[]
}

function colorPct(v: number)  { return v > 85 ? 'hsl(var(--red))' : v > 65 ? 'hsl(var(--orange))' : 'hsl(var(--accent))' }
function colorTemp(t: number) { return t > 85 ? 'hsl(var(--red))' : t > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))' }

export function OverviewPanel({ data, cpuHistory, tempHistory }: OverviewProps) {
  const cpuPkg  = data.cpus_temps?.[0]?.package ?? (data.temperatures as any)?.cpu ?? 0
  const gpuTemp = (data.gpu as any)?.temp ?? (data.temperatures as any)?.gpu ?? 0
  const memPct  = data.memory?.usage ?? 0
  const cpuPct  = data.cpu?.usage    ?? 0
  const fans    = data.fans ?? []
  const disks   = normalizeDisks(data)

  // Constrói modelo resumido da CPU
  const cpuModel = data.cpu?.model ?? data.cpu?.sockets?.[0]?.model ?? ''
  const cpuShort = cpuModel.replace(/Intel\(R\)|Core\(TM\)/gi, '').replace(/\s+/g, ' ').trim().split('@')[0].trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', height: '100%', paddingRight: 4 }}>

      {/* ── Row 1: Rings principais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* CPU */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <RingGauge value={cpuPct} size={88} thickness={8} color={colorPct(cpuPct)} label="CPU" unit="%" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cpuShort || 'CPU'}</div>
              <Row label="Temp"   value={`${Math.round(cpuPkg)}°C`}           color={colorTemp(cpuPkg)} />
              <Row label="Freq"   value={`${(data.cpu?.freq ?? 0).toFixed(1)} GHz`} />
              <Row label="Cores"  value={`${data.cpu?.sockets?.reduce((a, s) => a + s.core_count, 0) ?? '?'}C`} />
              <div style={{ marginTop: 8, height: 28 }}><Sparkline data={cpuHistory} height={28} color={colorPct(cpuPct)} /></div>
            </div>
          </div>
        </Card>

        {/* RAM */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <RingGauge value={memPct} size={88} thickness={8} color={colorPct(memPct)} label="RAM" unit="%" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 6 }}>Memória RAM</div>
              <Row label="Usado"  value={`${(data.memory?.used_gb ?? 0).toFixed(1)} GB`} />
              <Row label="Total"  value={`${(data.memory?.total_gb ?? 0).toFixed(1)} GB`} />
              <Row label="Slots"  value={`${data.memory?.occupied_slots ?? 0}/${data.memory?.total_slots ?? 0}`} />
            </div>
          </div>
        </Card>

        {/* GPU */}
        {gpuTemp > 0 && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <RingGauge value={(data.gpu as any)?.usage ?? 0} size={88} thickness={8} color={colorPct((data.gpu as any)?.usage ?? 0)} label="GPU" unit="%" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 6 }}>GPU</div>
                <Row label="Temp"  value={`${Math.round(gpuTemp)}°C`}     color={colorTemp(gpuTemp)} />
                {(data.gpu as any)?.vram_total_gb && <Row label="VRAM" value={`${(data.gpu as any).vram_used_gb?.toFixed(1)}/${(data.gpu as any).vram_total_gb?.toFixed(1)} GB`} />}
                {(data.gpu as any)?.power_w != null && <Row label="Potência" value={`${(data.gpu as any).power_w} W`} />}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Row 2: Info do hardware ── */}
      {data.system && (
        <Section title="Sistema">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            <InfoCard icon={<Cpu size={14} color="hsl(var(--accent))" />}    label="Processador" value={cpuShort || '—'} />
            <InfoCard icon={<MemoryStick size={14} color="hsl(var(--purple))" />} label="Memória"     value={`${(data.memory?.total_gb ?? 0).toFixed(0)} GB RAM`} />
            <InfoCard icon={<Thermometer size={14} color="hsl(var(--green))" />}  label="Placa"       value={(data.system as any).board ?? '—'} />
            <InfoCard icon={<HardDrive size={14} color="hsl(var(--orange))" />}   label="SO"          value={(data.system as any).os ?? '—'} />
          </div>
        </Section>
      )}

      {/* ── Row 3: Temperaturas ── */}
      {Object.keys(data.temperatures ?? {}).length > 0 && (
        <Section title="Temperaturas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
            {Object.entries(data.temperatures ?? {}).map(([k, v]) => (
              <TempChip key={k} label={k.replace(/_/g, ' ')} value={v as number} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Row 4: Discos ── */}
      {disks.length > 0 && (
        <Section title="Discos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disks.map((d, i) => {
              const c = colorPct(d.usage)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
                  <HardDrive size={15} color={c} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.mount}</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{d.device} · {d.fstype}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', color: c }}>{d.usage}%</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{d.used_gb.toFixed(0)}/{d.total_gb.toFixed(0)} GB</div>
                  </div>
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: 'hsl(var(--border))', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${d.usage}%`, background: c, transition: 'width 0.5s ease', borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Row 5: Fans ── */}
      {fans.length > 0 && (
        <Section title="Ventiladores">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            {fans.map((f, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 12, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
                <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4 }}>{f.label || f.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: f.rpm > 0 ? 'hsl(var(--accent))' : 'hsl(var(--muted))' }}>
                  {(f.rpm ?? 0).toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: 'hsl(var(--muted))' }}>RPM</span>
                </div>
                {f.pwm_pct != null && (
                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'hsl(var(--border))' }}>
                    <div style={{ height: '100%', width: `${f.pwm_pct}%`, background: 'hsl(var(--accent))', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '14px 16px', borderRadius: 16, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'hsl(var(--muted))', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
      <span style={{ color: 'hsl(var(--muted))' }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', color: color ?? 'hsl(var(--text))' }}>{value}</span>
    </div>
  )
}

function TempChip({ label, value }: { label: string; value: number }) {
  const color = value > 85 ? 'hsl(var(--red))' : value > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', borderRadius: 10, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
      <span style={{ fontSize: 9, color: 'hsl(var(--muted))', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>{value}°C</span>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}>
      {icon}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  )
}
