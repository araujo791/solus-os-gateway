import { useEffect, useRef, useState } from 'react'
import type { SensorData } from '../../hooks/useSensorData'

interface FansPanelProps {
  data: SensorData
  onCommand: (cmd: object) => void
}

export function FansPanel({ data, onCommand }: FansPanelProps) {
  // Filtra fans sem RPM (desligados / não existentes)
  const fans = (data.fans ?? []).filter(f => f.rpm > 0 || f.has_pwm)

  if (!fans.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))' }}>
      Nenhum ventilador ativo detectado
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, overflowY: 'auto', height: '100%', alignContent: 'start' }}>
      {fans.map((fan, i) => <FanCard key={i} fan={fan} onCommand={onCommand} />)}
    </div>
  )
}

function FanCard({ fan, onCommand }: { fan: any; onCommand: (c: object) => void }) {
  const pct = fan.speed_percent ?? fan.pwm_pct ?? 0
  const rpm = fan.rpm ?? 0
  const [mode, setMode] = useState<'auto' | 'manual' | 'max'>(fan.mode ?? 'auto')
  const angleRef = useRef(0)
  const rafRef   = useRef<number>()
  const svgRef   = useRef<SVGGElement>(null)

  // Animação da ventoinha proporcional ao RPM
  useEffect(() => {
    const speed = rpm > 0 ? Math.max(0.3, rpm / 800) : 0
    const animate = () => {
      if (svgRef.current) {
        angleRef.current = (angleRef.current + speed) % 360
        svgRef.current.setAttribute('transform', `rotate(${angleRef.current}, 20, 20)`)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [rpm])

  const handleMode = (m: 'auto' | 'manual' | 'max') => {
    setMode(m)
    if (m === 'auto')   onCommand({ type: 'set_fan_auto',  fan: fan.name })
    if (m === 'max')    onCommand({ type: 'set_fan_speed', fan: fan.name, speed: 100 })
    if (m === 'manual') onCommand({ type: 'set_fan_speed', fan: fan.name, speed: pct })
  }

  const color = rpm > 3000 ? 'hsl(var(--orange))' : rpm > 0 ? 'hsl(var(--accent))' : 'hsl(var(--muted))'

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 16,
      background: 'hsl(var(--surface))',
      border: '1px solid hsl(var(--border))',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Ícone animado de ventoinha */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: rpm > 0 ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--border))',
          border: `1px solid ${rpm > 0 ? 'hsl(var(--accent) / 0.3)' : 'hsl(var(--border))'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <g ref={svgRef}>
              {/* Pás da ventoinha */}
              {[0, 60, 120, 180, 240, 300].map(angle => (
                <path
                  key={angle}
                  d="M20,20 Q22,14 26,12 Q24,18 20,20"
                  fill={color}
                  opacity={0.85}
                  transform={`rotate(${angle}, 20, 20)`}
                />
              ))}
              <circle cx="20" cy="20" r="3" fill={color} />
            </g>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fan.label}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 1 }}>
            modo <span style={{ color: 'hsl(var(--accent))' }}>{mode}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono', color, lineHeight: 1 }}>
            {rpm.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>RPM</div>
        </div>
      </div>

      {/* PWM bar */}
      {fan.has_pwm && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4 }}>
            <span>PWM</span><span style={{ fontFamily: 'JetBrains Mono' }}>{pct}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'hsl(var(--border))' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`,
              background: `linear-gradient(90deg, hsl(var(--accent)), ${pct > 75 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'})`,
              transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['auto', 'manual', 'max'] as const).map(m => (
          <button key={m} onClick={() => handleMode(m)} style={{
            flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${mode === m ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))'}`,
            background: mode === m ? 'hsl(var(--accent) / 0.12)' : 'transparent',
            color: mode === m ? 'hsl(var(--accent))' : 'hsl(var(--muted))',
            transition: 'all 0.15s',
          }}>
            {m === 'auto' ? 'Automático' : m === 'manual' ? 'Manual' : 'Máximo'}
          </button>
        ))}
      </div>
    </div>
  )
}
