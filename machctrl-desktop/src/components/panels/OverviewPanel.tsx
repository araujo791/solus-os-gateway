import { RingGauge } from '../shared/RingGauge'
import { Sparkline } from '../shared/Sparkline'
import { HardDrive } from 'lucide-react'
import { normalizeDisks } from './DisksPanel'
import type { SensorData } from '../../hooks/useSensorData'
import nvidiaLogoUrl from '../../assets/nvidia.png'
import amdRadeonUrl  from '../../assets/amd-radeon.png'

interface OverviewProps {
  data: SensorData
  cpuHistory: number[]
  tempHistory: number[]
}

const colorPct  = (v: number) => v > 85 ? 'hsl(var(--red))' : v > 65 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'
const colorTemp = (t: number) => t > 85 ? 'hsl(var(--red))' : t > 70 ? 'hsl(var(--orange))' : 'hsl(var(--green))'

function detectCpuBrand(m: string) {
  const s = m.toLowerCase()
  if (s.includes('intel')) return 'intel'
  if (s.includes('amd') || s.includes('ryzen') || s.includes('epyc')) return 'amd'
  return 'unknown'
}
function detectGpuBrand(n: string) {
  const s = (n||'').toLowerCase()
  if (s.includes('nvidia') || s.includes('geforce') || s.includes('rtx') || s.includes('gtx')) return 'nvidia'
  if (s.includes('amd') || s.includes('radeon') || s.includes('rx ')) return 'amd'
  return 'unknown'
}

function IntelLogo({ h=22 }: { h?: number }) {
  return <svg width={h*2} height={h} viewBox="0 0 80 36" fill="none">
    <rect width="80" height="36" rx="5" fill="#0071C5"/>
    <text x="40" y="25" textAnchor="middle" fill="white" fontSize="18" fontWeight="900" fontFamily="Arial">intel</text>
  </svg>
}
function AMDCpuLogo({ h=22 }: { h?: number }) {
  return <svg width={h*1.8} height={h} viewBox="0 0 72 36" fill="none">
    <rect width="72" height="36" rx="5" fill="#ED1C24"/>
    <text x="36" y="25" textAnchor="middle" fill="white" fontSize="17" fontWeight="900" fontFamily="Arial">AMD</text>
  </svg>
}

function fmtBytes(mb: number) {
  if (mb >= 1024) return `${(mb/1024).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}
function fmtSecs(s: number) {
  if (!s || s <= 0) return ''
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtStorage(gb: number) {
  if (gb >= 1024) return `${(gb/1024).toFixed(1)} TB`
  return `${Math.round(gb)} GB`
}

export function OverviewPanel({ data, cpuHistory }: OverviewProps) {
  const sys    = (data as any).system ?? {}
  const cpu    = data.cpu
  const mem    = data.memory
  const disks  = normalizeDisks(data)
  const procs  = (data as any).top_processes ?? []
  const fans   = (data.fans ?? []).filter((f:any) => (f.rpm??0) > 0)
  const cpuTemps = data.cpus_temps ?? []
  const gpuTemp  = (data.gpu as any)?.temp ?? (data.temperatures as any)?.gpu ?? 0
  const gpuName  = sys.gpu_name ?? ''
  const gpuBrand = detectGpuBrand(gpuName)
  const cpuModel = cpu?.model ?? cpu?.sockets?.[0]?.model ?? ''
  const cpuShort = cpuModel.replace(/Intel\(R\)|Core\(TM\)/gi,'').replace(/\s+/g,' ').trim().split('@')[0].trim()
  const cpuBrand = detectCpuBrand(cpuModel)
  const battery  = sys.battery
  const totalDiskGb = sys.total_storage_gb ?? 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, overflowY:'auto', height:'100%', paddingRight:4 }}>

      {/* ── Header: placa-mãe + info sistema ── */}
      <div style={{ padding:'14px 18px', borderRadius:14, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'hsl(var(--text))' }}>
              {sys.hostname || 'Sistema'}
            </div>
            <div style={{ fontSize:11, color:'hsl(var(--muted))', marginTop:2 }}>
              {sys.os} · Kernel {sys.kernel}
            </div>
          </div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            <SysInfo label="Placa-mãe"     value={sys.board || '—'} />
            <SysInfo label="BIOS"          value={sys.bios_date ? `${sys.bios_vendor || ''} ${sys.bios_date}`.trim() : '—'} />
            <SysInfo label="Instalação"    value={sys.install_date || '—'} />
            <SysInfo label="Armazenamento" value={totalDiskGb > 0 ? fmtStorage(totalDiskGb) : '—'} />
            <SysInfo label="Uptime"        value={sys.uptime || '—'} />
          </div>
        </div>
      </div>

      {/* ── Bateria (só se existir) ── */}
      {battery && (
        <div style={{ padding:'12px 18px', borderRadius:12, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'hsl(var(--text))' }}>
              🔋 Bateria {battery.plugged ? '⚡' : ''}
            </div>
            <div style={{ display:'flex', gap:14 }}>
              <span style={{ fontSize:20, fontWeight:800, fontFamily:'JetBrains Mono',
                color: battery.percent > 50 ? 'hsl(var(--green))' : battery.percent > 20 ? 'hsl(var(--orange))' : 'hsl(var(--red))' }}>
                {battery.percent}%
              </span>
              {battery.secsleft > 0 && !battery.plugged && (
                <span style={{ fontSize:11, color:'hsl(var(--muted))', alignSelf:'center' }}>
                  {fmtSecs(battery.secsleft)} restantes
                </span>
              )}
            </div>
          </div>
          <div style={{ height:10, borderRadius:5, background:'hsl(var(--border))', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:5,
              width:`${battery.percent}%`,
              background: battery.percent > 50 ? 'hsl(var(--green))' : battery.percent > 20 ? 'hsl(var(--orange))' : 'hsl(var(--red))',
              transition:'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Row: CPU + RAM + GPU ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12 }}>

        {/* CPU */}
        <div style={{ padding:'14px 16px', borderRadius:14, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <RingGauge value={cpu?.usage??0} size={84} thickness={8} color={colorPct(cpu?.usage??0)} label="CPU" unit="%" />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                {cpuBrand==='intel' && <IntelLogo h={20} />}
                {cpuBrand==='amd'   && <AMDCpuLogo h={20} />}
                <div style={{ fontSize:10, color:'hsl(var(--muted))', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {cpuShort}
                </div>
              </div>
              {cpuTemps.map(c => (
                <div key={c.socket} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                  <span style={{ color:'hsl(var(--muted))' }}>CPU {c.socket} Temp</span>
                  <span style={{ fontWeight:700, fontFamily:'JetBrains Mono', color:colorTemp(c.package) }}>{Math.round(c.package)}°C</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                <span style={{ color:'hsl(var(--muted))' }}>Freq</span>
                <span style={{ fontFamily:'JetBrains Mono', color:'hsl(var(--text))' }}>{(cpu?.freq??0).toFixed(1)} GHz</span>
              </div>
              <div style={{ marginTop:6, height:28 }}>
                <Sparkline data={cpuHistory} height={28} color={colorPct(cpu?.usage??0)} />
              </div>
            </div>
          </div>
        </div>

        {/* RAM */}
        <div style={{ padding:'14px 16px', borderRadius:14, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <RingGauge value={mem?.usage??0} size={84} thickness={8} color={colorPct(mem?.usage??0)} label="RAM" unit="%" />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'hsl(var(--muted))', marginBottom:6, fontWeight:600 }}>Memória RAM</div>
              <R label="Usado"  v={`${(mem?.used_gb??0).toFixed(1)} GB`} />
              <R label="Total"  v={`${(mem?.total_gb??0).toFixed(1)} GB`} />
              <R label="Livre"  v={`${((mem?.total_gb??0)-(mem?.used_gb??0)).toFixed(1)} GB`} />
              <R label="Slots"  v={`${mem?.occupied_slots??0}/${mem?.total_slots??0}`} />
            </div>
          </div>
        </div>

        {/* GPU */}
        {gpuTemp > 0 && (
          <div style={{ padding:'14px 16px', borderRadius:14, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <RingGauge value={(data.gpu as any)?.usage??0} size={84} thickness={8} color={colorPct((data.gpu as any)?.usage??0)} label="GPU" unit="%" />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  {gpuBrand==='nvidia' && <img src={nvidiaLogoUrl} alt="NVIDIA" style={{ height:40, objectFit:'contain', maxWidth:130 }} />}
                  {gpuBrand==='amd'    && <img src={amdRadeonUrl}  alt="AMD"    style={{ height:46, objectFit:'contain', maxWidth:130 }} />}
                  <div>
                    <div style={{ fontSize:9, color:'hsl(var(--muted))' }}>Temp</div>
                    <div style={{ fontSize:18, fontWeight:800, fontFamily:'JetBrains Mono', color:colorTemp(gpuTemp), lineHeight:1 }}>{Math.round(gpuTemp)}°C</div>
                  </div>
                </div>
                {(data.gpu as any)?.vram_total_gb && <R label="VRAM" v={`${(data.gpu as any).vram_used_gb?.toFixed(1)}/${(data.gpu as any).vram_total_gb?.toFixed(1)} GB`} />}
                {(data.gpu as any)?.power_w != null && <R label="Potência" v={`${(data.gpu as any).power_w} W`} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Discos ── */}
      {disks.length > 0 && (
        <Section title="Discos">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {disks.map((d:any, i:number) => {
              const c = colorPct(d.usage)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
                  <div style={{ width:36, height:36, borderRadius:9, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:`${c}18`, border:`1px solid ${c}44`, flexShrink:0 }}>
                    <HardDrive size={14} color={c} />
                    <span style={{ fontSize:7, fontWeight:800, color:c, letterSpacing:'0.05em' }}>{(d.disk_type||'').toUpperCase()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'hsl(var(--text))', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.mount}</div>
                    <div style={{ fontSize:9, color:'hsl(var(--muted))' }}>{d.device} · {d.fstype}</div>
                    <div style={{ marginTop:4, height:3, borderRadius:2, background:'hsl(var(--border))' }}>
                      <div style={{ height:'100%', width:`${d.usage}%`, background:c, borderRadius:2, transition:'width 0.5s' }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono', color:c }}>{d.usage}%</div>
                    <div style={{ fontSize:9, color:'hsl(var(--muted))' }}>{d.used_gb.toFixed(0)}/{d.total_gb.toFixed(0)} GB</div>
                    <div style={{ fontSize:9, color:'hsl(var(--muted))' }}>↓{d.read_mb.toFixed(1)} ↑{d.write_mb.toFixed(1)} MB/s</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Top 10 processos por RAM ── */}
      {procs.length > 0 && (
        <Section title="Top Processos (RAM)">
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {procs.map((p:any, i:number) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 12px', borderRadius:8, background:'hsl(var(--surface))', border:'1px solid hsl(var(--border))' }}>
                <div style={{ width:18, fontSize:10, color:'hsl(var(--muted))', textAlign:'right', flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1, fontSize:12, fontWeight:500, color:'hsl(var(--text))', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize:11, fontFamily:'JetBrains Mono', color:'hsl(var(--accent))', flexShrink:0 }}>
                  {fmtBytes(p.mem_mb)}
                </div>
                <div style={{ width:60, flexShrink:0 }}>
                  <div style={{ height:3, borderRadius:2, background:'hsl(var(--border))' }}>
                    <div style={{ height:'100%', borderRadius:2,
                      width:`${Math.min(100, p.mem_mb / ((data.memory?.total_gb??1)*10.24))}%`,
                      background:'hsl(var(--accent))', transition:'width 0.4s' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'hsl(var(--muted))', marginBottom:8 }}>{title}</div>
      {children}
    </div>
  )
}
function SysInfo({ label, value }: { label:string; value:string }) {
  return (
    <div>
      <div style={{ fontSize:9, color:'hsl(var(--muted))', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'hsl(var(--text))' }}>{value}</div>
    </div>
  )
}
function R({ label, v }: { label:string; v:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
      <span style={{ color:'hsl(var(--muted))' }}>{label}</span>
      <span style={{ fontWeight:600, fontFamily:'JetBrains Mono', color:'hsl(var(--text))' }}>{v}</span>
    </div>
  )
}
