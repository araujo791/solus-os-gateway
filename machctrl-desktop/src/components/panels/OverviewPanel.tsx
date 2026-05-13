import { RingGauge } from '../shared/RingGauge'
import { Sparkline } from '../shared/Sparkline'
import { Cpu, MemoryStick, HardDrive, Wind, Thermometer, Zap } from 'lucide-react'
import type { SensorData } from '../../hooks/useSensorData'

interface OverviewProps {
  data: SensorData
  cpuHistory: number[]
  tempHistory: number[]
}

function colorForPct(v: number) {
  if (v > 85) return 'hsl(var(--red))'
  if (v > 65) return 'hsl(var(--orange))'
  return 'hsl(var(--accent))'
}
function colorForTemp(t: number) {
  if (t > 85) return 'hsl(var(--red))'
  if (t > 70) return 'hsl(var(--orange))'
  return 'hsl(var(--green))'
}

export function OverviewPanel({ data, cpuHistory, tempHistory }: OverviewProps) {
  const cpuPkg  = data.cpus_temps?.[0]?.package ?? data.temperatures?.cpu ?? 0
  const gpuTemp = data.gpu?.temp ?? data.temperatures?.gpu ?? 0
  const memPct  = data.memory?.usage ?? 0
  const cpuPct  = data.cpu?.usage ?? 0
  const fans    = data.fans ?? []
  const disks   = data.disks ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 2px', overflowY: 'auto', height: '100%' }}>

      {/* ── Row 1: Big rings ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {/* CPU */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RingGauge value={cpuPct} size={90} thickness={8}
              color={colorForPct(cpuPct)} label="CPU" unit="%" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 4 }}>
                {data.cpu?.model?.split(' ').slice(0, 3).join(' ') || 'CPU'}
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                Freq <span style={{ color: 'hsl(var(--text))' }}>{(data.cpu?.freq ?? 0).toFixed(1)} GHz</span>
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                Temp <span style={{ color: colorForTemp(cpuPkg) }}>{cpuPkg}°C</span>
              </div>
              <div style={{ marginTop: 8, height: 32 }}>
                <Sparkline data={cpuHistory} height={32} color={colorForPct(cpuPct)} />
              </div>
            </div>
          </div>
        </Card>

        {/* Memory */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RingGauge value={memPct} size={90} thickness={8}
              color={colorForPct(memPct)} label="RAM" unit="%" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 4 }}>Memória RAM</div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                Usado <span style={{ color: 'hsl(var(--text))' }}>{data.memory?.used_gb?.toFixed(1)} GB</span>
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                Total <span style={{ color: 'hsl(var(--text))' }}>{data.memory?.total_gb?.toFixed(1)} GB</span>
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                Slots <span style={{ color: 'hsl(var(--text))' }}>
                  {data.memory?.occupied_slots}/{data.memory?.total_slots}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* GPU */}
        {(gpuTemp > 0 || data.gpu) && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <RingGauge value={data.gpu?.usage ?? 0} size={90} thickness={8}
                color={colorForPct(data.gpu?.usage ?? 0)} label="GPU" unit="%" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 4 }}>GPU</div>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                  Temp <span style={{ color: colorForTemp(gpuTemp) }}>{gpuTemp}°C</span>
                </div>
                {data.gpu?.vram_total_gb && (
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                    VRAM <span style={{ color: 'hsl(var(--text))' }}>
                      {data.gpu.vram_used_gb?.toFixed(1)}/{data.gpu.vram_total_gb?.toFixed(1)} GB
                    </span>
                  </div>
                )}
                {data.gpu?.power_w != null && (
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                    Potência <span style={{ color: 'hsl(var(--text))' }}>{data.gpu.power_w} W</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Row 2: Temp sensors grid ── */}
      <Section title="Temperaturas">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
          {Object.entries(data.temperatures ?? {}).map(([k, v]) => (
            <TempChip key={k} label={k.replace(/_/g, ' ').replace(/^cpu\d+\s*/i, '')} value={v as number} />
          ))}
        </div>
      </Section>

      {/* ── Row 3: Disks ── */}
      {disks.length > 0 && (
        <Section title="Discos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disks.map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--border))',
              }}>
                <HardDrive size={15} color="hsl(var(--accent))" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.mount}
                  </div>
                  <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                    {d.device} · {d.fstype}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colorForPct(d.usage) }}>
                    {d.usage}%
                  </div>
                  <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                    {d.used_gb.toFixed(0)}/{d.total_gb.toFixed(0)} GB
                  </div>
                </div>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: 'hsl(var(--border))', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${d.usage}%`,
                    background: colorForPct(d.usage),
                    transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Row 4: Fans ── */}
      {fans.length > 0 && (
        <Section title="Ventiladores">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {fans.map((f, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 12,
                background: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--border))',
              }}>
                <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4 }}>
                  {f.label || f.name}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: f.rpm > 0 ? 'hsl(var(--accent))' : 'hsl(var(--muted))' }}>
                  {f.rpm} <span style={{ fontSize: 11, fontWeight: 400, color: 'hsl(var(--muted))' }}>RPM</span>
                </div>
                {f.pwm_pct != null && (
                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'hsl(var(--border))' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${f.pwm_pct}%`,
                      background: 'hsl(var(--accent))', transition: 'width 0.5s ease' }} />
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
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16,
      background: 'hsl(var(--surface))',
      border: '1px solid hsl(var(--border))',
    }}>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'hsl(var(--muted))', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function TempChip({ label, value }: { label: string; value: number }) {
  const color = value > 85 ? 'hsl(var(--red))' : value > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '8px 10px', borderRadius: 10,
      background: 'hsl(var(--surface))',
      border: '1px solid hsl(var(--border))',
    }}>
      <span style={{ fontSize: 10, color: 'hsl(var(--muted))', textTransform: 'capitalize' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', color }}>
        {value}°C
      </span>
    </div>
  )
}
