import { RingGauge } from '../shared/RingGauge'
import { Sparkline } from '../shared/Sparkline'
import { HardDrive } from 'lucide-react'
import { normalizeDisks } from './DisksPanel'
import type { SensorData } from '../../hooks/useSensorData'
import nvidiaLogoUrl  from '../../assets/nvidia.png'
import amdRadeonUrl   from '../../assets/amd-radeon.png'

interface OverviewProps {
  data: SensorData
  cpuHistory: number[]
  tempHistory: number[]
}

function colorPct(v: number)  { return v > 85 ? 'hsl(var(--red))' : v > 65 ? 'hsl(var(--orange))' : 'hsl(var(--accent))' }
function colorTemp(t: number) { return t > 85 ? 'hsl(var(--red))' : t > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))' }

// ── Logos CPU inline SVG ──────────────────────────────────────────────────────
function IntelLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size * 1.6} height={size} viewBox="0 0 80 40" fill="none">
      <rect width="80" height="40" rx="6" fill="#0071C5"/>
      <text x="40" y="28" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="Arial,sans-serif">intel</text>
    </svg>
  )
}
function AMDCpuLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 70 40" fill="none">
      <rect width="70" height="40" rx="6" fill="#ED1C24"/>
      <text x="35" y="27" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Arial,sans-serif">AMD</text>
    </svg>
  )
}

// ── GPU logos: usa PNG reais ───────────────────────────────────────────────────
function GpuLogo({ brand, height = 40 }: { brand: string; height?: number }) {
  if (brand === 'nvidia') return (
    <img src={nvidiaLogoUrl} alt="NVIDIA" style={{ height, objectFit:'contain', maxWidth: 120 }} />
  )
  if (brand === 'amd') return (
    <img src={amdRadeonUrl} alt="AMD Radeon" style={{ height, objectFit:'contain', maxWidth: 120 }} />
  )
  return null
}

function detectCpuBrand(model: string) {
  const m = model.toLowerCase()
  if (m.includes('intel')) return 'intel'
  if (m.includes('amd') || m.includes('ryzen') || m.includes('epyc')) return 'amd'
  return 'unknown'
}
function detectGpuBrand(name: string) {
  const n = (name || '').toLowerCase()
  if (n.includes('nvidia') || n.includes('geforce') || n.includes('rtx') || n.includes('gtx')) return 'nvidia'
  if (n.includes('amd') || n.includes('radeon') || n.includes('rx ') || n.includes('vega')) return 'amd'
  return 'unknown'
}

export function OverviewPanel({ data, cpuHistory, tempHistory }: OverviewProps) {
  const cpuPct  = data.cpu?.usage    ?? 0
  const memPct  = data.memory?.usage ?? 0
  const disks   = normalizeDisks(data)
  const fans    = data.fans ?? []
  const gpuTemp = (data.gpu as any)?.temp ?? (data.temperatures as any)?.gpu ?? 0
  const gpuName = (data.system as any)?.gpu_name ?? ''
  const gpuBrand = detectGpuBrand(gpuName)
  const cpuModel = data.cpu?.model ?? data.cpu?.sockets?.[0]?.model ?? ''
  const cpuShort = cpuModel.replace(/Intel\(R\)|Core\(TM\)/gi, '').replace(/\s+/g, ' ').trim().split('@')[0].trim()
  const cpuBrand = detectCpuBrand(cpuModel)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto', height:'100%', paddingRight:4 }}>

      {/* ── Row 1: Rings ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12 }}>
        {/* CPU */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <RingGauge value={cpuPct} size={88} thickness={8} color={colorPct(cpuPct)} label="CPU" unit="%" />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                {cpuBrand === 'intel' && <IntelLogo size={26} />}
                {cpuBrand === 'amd'   && <AMDCpuLogo size={26} />}
                <div style={{ fontSize:11, color:'hsl(var(--muted))', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {cpuShort || 'CPU'}
                </div>
              </div>
              {/* Temperatura por socket */}
              {(data.cpus_temps ?? []).map(cpu => (
                <div key={cpu.socket} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                  <span style={{ color:'hsl(var(--muted))' }}>CPU {cpu.socket}</span>
                  <span style={{ fontWeight:700, fontFamily:'JetBrains Mono', color:colorTemp(cpu.package) }}>
                    {Math.round(cpu.package)}°C
                  </span>
                </div>
              ))}
              <Row label="Freq" value={`${(data.cpu?.freq ?? 0).toFixed(1)} GHz`} />
              <div style={{ marginTop:8, height:28 }}>
                <Sparkline data={cpuHistory} height={28} color={colorPct(cpuPct)} />
              </div>
            </div>
          </div>
        </Card>

        {/* RAM */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <RingGauge value={memPct} size={88} thickness={8} color={colorPct(memPct)} label="RAM" unit="%" />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'hsl(var(--muted))', marginBottom:6 }}>Memória RAM</div>
              <Row label="Usado" value={`${(data.memory?.used_gb ?? 0).toFixed(1)} GB`} />
              <Row label="Total" value={`${(data.memory?.total_gb ?? 0).toFixed(1)} GB`} />
              <Row label="Slots" value={`${data.memory?.occupied_slots ?? 0}/${data.memory?.total_slots ?? 0}`} />
            </div>
          </div>
        </Card>

        {/* GPU */}
        {gpuTemp > 0 && (
          <Card>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <RingGauge value={(data.gpu as any)?.usage ?? 0} size={88} thickness={8}
                color={colorPct((data.gpu as any)?.usage ?? 0)} label="GPU" unit="%" />
              <div style={{ flex:1 }}>
                <div style={{ marginBottom:6, minHeight:40, display:'flex', alignItems:'center' }}>
                  <GpuLogo brand={gpuBrand} height={38} />
                  {gpuBrand === 'unknown' && <div style={{ fontSize:11, color:'hsl(var(--muted))' }}>GPU</div>}
                </div>
                <Row label="Temp"  value={`${Math.round(gpuTemp)}°C`} color={colorTemp(gpuTemp)} />
                {(data.gpu as any)?.vram_total_gb && (
                  <Row label="VRAM" value={`${(data.gpu as any).vram_used_gb?.toFixed(1)}/${(data.gpu as any).vram_total_gb?.toFixed(1)} GB`} />
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Discos com logo do tipo ── */}
      {disks.length > 0 && (
        <Section title="Discos">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {disks.map((d: any, i: number) => {
              const c = colorPct(d.usage)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
                  <DiskTypeIcon type={d.disk_type} color={c} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'hsl(var(--text))', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {d.mount}
                    </div>
                    <div style={{ fontSize:10, color:'hsl(var(--muted))' }}>{d.device} · {d.fstype}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <div style={{ fontSize:10, color:'hsl(var(--muted))', fontFamily:'JetBrains Mono' }}>
                      ↓{d.read_mb.toFixed(1)} ↑{d.write_mb.toFixed(1)} MB/s
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono', color:c }}>{d.usage}%</div>
                      <div style={{ fontSize:10, color:'hsl(var(--muted))' }}>{d.used_gb.toFixed(0)}/{d.total_gb.toFixed(0)} GB</div>
                    </div>
                    <div style={{ width:48, height:4, borderRadius:2, background:'hsl(var(--border))', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${d.usage}%`, background:c, borderRadius:2, transition:'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Fans ── */}
      {fans.filter((f:any) => (f.rpm??0) > 0).length > 0 && (
        <Section title="Fans">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8 }}>
            {fans.filter((f:any) => (f.rpm??0) > 0).map((f:any, i:number) => (
              <div key={i} style={{ padding:'10px 14px', borderRadius:12, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
                <div style={{ fontSize:10, color:'hsl(var(--muted))', marginBottom:4 }}>{f.label||f.name}</div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:'JetBrains Mono', color:'hsl(var(--accent))' }}>
                  {(f.rpm??0).toLocaleString()} <span style={{ fontSize:10, color:'hsl(var(--muted))' }}>RPM</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function DiskTypeIcon({ type, color }: { type: string; color: string }) {
  const labels: Record<string, string> = { nvme:'NVMe', ssd:'SSD', hdd:'HDD' }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0 }}>
      <div style={{ width:36, height:36, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, border:`1px solid ${color}44` }}>
        <HardDrive size={16} color={color} />
      </div>
      <span style={{ fontSize:8, fontWeight:800, color, letterSpacing:'0.05em' }}>{labels[type]??'DISK'}</span>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ padding:'14px 16px', borderRadius:16, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>{children}</div>
}
function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'hsl(var(--muted))', marginBottom:8 }}>{title}</div>
      {children}
    </div>
  )
}
function Row({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
      <span style={{ color:'hsl(var(--muted))' }}>{label}</span>
      <span style={{ fontWeight:600, fontFamily:'JetBrains Mono', color:color??'hsl(var(--text))' }}>{value}</span>
    </div>
  )
}
