import { Leaf, Settings2, Zap } from 'lucide-react'
import type { SensorData } from '../../hooks/useSensorData'

const PROFILES = [
  { id: 'economia',    raw: ['silent', 'powersave', 'economia'], label: 'Economia',    icon: Leaf,      desc: 'Baixo consumo, silencioso',       gradient: 'hsl(152 100% 47%), hsl(180 100% 50%)' },
  { id: 'balanced',   raw: ['balanced'],                         label: 'Equilibrado', icon: Settings2, desc: 'Equilíbrio entre desempenho e consumo', gradient: 'hsl(217 100% 62%), hsl(200 100% 65%)' },
  { id: 'performance',raw: ['performance'],                      label: 'Desempenho',  icon: Zap,       desc: 'Máximo desempenho',               gradient: 'hsl(32 100% 58%), hsl(0 85% 58%)' },
]

function canonicalize(id: string): string {
  if (['silent','powersave','economia'].includes(id)) return 'economia'
  if (id === 'performance') return 'performance'
  return 'balanced'
}

interface PowerPanelProps {
  data: SensorData
  onCommand: (cmd: object) => void
}

export function PowerPanel({ data, onCommand }: PowerPanelProps) {
  // Backend pode enviar como power_profile{} ou campos soltos
  const current   = data.power_profile?.current   ?? data.current_profile   ?? 'balanced'
  const available = data.power_profile?.available  ?? data.available_profiles ?? []
  const governor  = data.power_profile?.current_governor ?? data.current_governor ?? ''
  const activeCanon = canonicalize(current)

  const handleSelect = (p: typeof PROFILES[0]) => {
    const raw = available.find((a: string) => p.raw.includes(a)) ?? p.raw[p.raw.length - 1]
    onCommand({ type: 'set_profile', profile: raw })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 4 }}>
        Governador atual: <span style={{ color: 'hsl(var(--text))', fontFamily: 'JetBrains Mono' }}>
          {governor || current}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {PROFILES.map(p => {
          const isActive = activeCanon === p.id
          const isAvail = p.raw.some(r => available.includes(r)) || available.length === 0
          const Icon = p.icon

          return (
            <button
              key={p.id}
              onClick={() => isAvail && handleSelect(p)}
              disabled={!isAvail}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '20px 14px', borderRadius: 16, cursor: isAvail ? 'pointer' : 'not-allowed',
                border: isActive ? `1px solid hsl(${p.gradient.split(',')[0].trim().replace('hsl(','').replace(')','')})` : '1px solid hsl(var(--border))',
                background: isActive
                  ? `linear-gradient(145deg, ${p.gradient.split(',').map(c => c.trim() + ' / 0.12').join(', ')})`
                  : 'hsl(var(--surface))',
                boxShadow: isActive ? `0 0 24px ${p.gradient.split(',')[0].trim()}44` : 'none',
                opacity: isAvail ? 1 : 0.4,
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? `linear-gradient(135deg, ${p.gradient})` : 'hsl(var(--border))',
              }}>
                <Icon size={22} color={isActive ? '#000' : 'hsl(var(--muted))'} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: isActive ? 'hsl(var(--text))' : 'hsl(var(--muted))',
                  marginBottom: 3,
                }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 10, color: 'hsl(var(--muted))', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
              {isActive && (
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 6,
                  background: `linear-gradient(135deg, ${p.gradient})`,
                  color: '#000',
                }}>
                  ATIVO
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
