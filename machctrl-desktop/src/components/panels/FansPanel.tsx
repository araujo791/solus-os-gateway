import { useEffect, useRef, useState } from 'react'
import fanIconUrl from '../../assets/fan-icon.png'
import type { SensorData } from '../../hooks/useSensorData'

interface FansPanelProps {
  data: SensorData
  onCommand: (cmd: object) => void
}

export function FansPanel({ data, onCommand }: FansPanelProps) {
  const fans = (data.fans ?? []).filter((f: any) => (f.rpm ?? 0) > 0 || f.has_pwm)
  if (!fans.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))' }}>
      Nenhum ventilador ativo detectado
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, overflowY: 'auto', height: '100%', alignContent: 'start' }}>
      {fans.map((fan: any, i: number) => <FanCard key={i} fan={fan} onCommand={onCommand} />)}
    </div>
  )
}

function FanCard({ fan, onCommand }: { fan: any; onCommand: (c: object) => void }) {
  const pct  = fan.speed_percent ?? fan.pwm_pct ?? 0
  const rpm  = fan.rpm ?? 0
  const [mode, setMode] = useState<'auto' | 'manual' | 'max'>(fan.mode ?? 'auto')
  const [manualPct, setManualPct] = useState(pct || 50)
  const [feedback, setFeedback]   = useState('')
  const angleRef = useRef(0)
  const rafRef   = useRef<number>()
  const imgRef   = useRef<HTMLImageElement>(null)

  // Animação da ventoinha — gira o PNG das hélices
  useEffect(() => {
    // Velocidade: 0 RPM = parado, 1000 RPM = ~1 volta/s, 3000+ = rápido
    const degPerFrame = rpm > 0 ? Math.max(0.5, rpm / 400) : 0
    const animate = () => {
      if (imgRef.current && degPerFrame > 0) {
        angleRef.current = (angleRef.current + degPerFrame) % 360
        imgRef.current.style.transform = `rotate(${angleRef.current}deg)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [rpm])

  const sendCmd = (m: 'auto' | 'manual' | 'max', speedOverride?: number) => {
    const speed = speedOverride ?? manualPct
    setMode(m)
    if (m === 'auto') {
      // Backend espera "action" não "type"
      onCommand({ action: 'set_fan_auto', fan: fan.name })
      setFeedback('Automático')
    } else if (m === 'max') {
      onCommand({ action: 'set_fan_speed', fan: fan.name, speed: 100 })
      setFeedback('Máximo 100%')
    } else {
      onCommand({ action: 'set_fan_speed', fan: fan.name, speed })
      setFeedback(`Manual ${speed}%`)
    }
    setTimeout(() => setFeedback(''), 2500)
  }

  const color = rpm > 3000 ? 'hsl(var(--orange))' : rpm > 0 ? 'hsl(var(--accent))' : 'hsl(var(--muted))'

  return (
    <div style={{
      padding: '18px 18px', borderRadius: 16,
      background: 'hsl(var(--surface))',
      border: '1px solid hsl(var(--border))',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header: ícone animado + info + RPM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Fan PNG animado */}
        <div style={{
          width: 60, height: 60, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: rpm > 0 ? 'hsl(var(--accent) / 0.08)' : 'hsl(var(--border) / 0.4)',
          border: `1px solid ${rpm > 0 ? 'hsl(var(--accent) / 0.25)' : 'hsl(var(--border))'}`,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <img
            ref={imgRef}
            src={fanIconUrl}
            alt="fan"
            style={{
              width: 52, height: 52,
              objectFit: 'contain',
              willChange: 'transform',
              transition: rpm === 0 ? 'transform 0.5s ease' : 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fan.label}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 1 }}>
            modo: <span style={{ color: mode === 'auto' ? 'hsl(var(--green))' : mode === 'max' ? 'hsl(var(--orange))' : 'hsl(var(--accent))' }}>
              {mode === 'auto' ? 'Automático' : mode === 'max' ? 'Máximo' : 'Manual'}
            </span>
            {feedback && <span style={{ color: 'hsl(var(--green))', marginLeft: 8 }}>✓ {feedback}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono', color, lineHeight: 1 }}>
            {rpm.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>RPM</div>
        </div>
      </div>

      {/* PWM bar */}
      {fan.has_pwm && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4 }}>
            <span>PWM</span>
            <span style={{ fontFamily: 'JetBrains Mono', color: 'hsl(var(--text))' }}>{pct}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'hsl(var(--border))' }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${pct}%`,
              background: `linear-gradient(90deg, hsl(var(--accent)), ${pct > 75 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Slider manual */}
      {mode === 'manual' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'hsl(var(--muted))', marginBottom: 4 }}>
            <span>Velocidade manual</span>
            <span style={{ fontFamily: 'JetBrains Mono', color: 'hsl(var(--accent))' }}>{manualPct}%</span>
          </div>
          <input
            type="range" min={20} max={100} step={5} value={manualPct}
            onChange={e => setManualPct(Number(e.target.value))}
            onMouseUp={e => sendCmd('manual', Number((e.target as HTMLInputElement).value))}
            onTouchEnd={e => sendCmd('manual', Number((e.target as HTMLInputElement).value))}
            style={{ width: '100%', accentColor: 'hsl(var(--accent))' }}
          />
        </div>
      )}

      {/* Botões de modo */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['auto', 'manual', 'max'] as const).map(m => (
          <button key={m} onClick={() => sendCmd(m)} style={{
            flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${mode === m ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))'}`,
            background: mode === m ? 'hsl(var(--accent) / 0.12)' : 'transparent',
            color: mode === m ? 'hsl(var(--accent))' : 'hsl(var(--muted))',
            transition: 'all 0.15s',
          }}>
            {m === 'auto' ? 'Auto' : m === 'manual' ? 'Manual' : 'Máximo'}
          </button>
        ))}
      </div>
    </div>
  )
}
