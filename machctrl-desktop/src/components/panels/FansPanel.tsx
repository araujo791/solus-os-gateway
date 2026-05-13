import { useState } from 'react'
import { Wind } from 'lucide-react'
import type { SensorData } from '../../hooks/useSensorData'

interface FansPanelProps {
  data: SensorData
  onCommand: (cmd: object) => void
}

export function FansPanel({ data, onCommand }: FansPanelProps) {
  const fans = data.fans ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      {fans.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'hsl(var(--muted))', fontSize: 13 }}>
          Nenhum ventilador detectado
        </div>
      )}
      {fans.map((fan, i) => (
        <FanCard key={i} fan={fan} onCommand={onCommand} />
      ))}
    </div>
  )
}

function FanCard({ fan, onCommand }: { fan: SensorData['fans'][0]; onCommand: (c: object) => void }) {
  const [dragging, setDragging] = useState(false)
  const pct = fan.pwm_pct ?? 0
  const isAuto = fan.mode === 'auto' || fan.mode === 'AUTO'

  const color = fan.rpm > 3000 ? 'hsl(var(--orange))' : fan.rpm > 0 ? 'hsl(var(--accent))' : 'hsl(var(--muted))'

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 14,
      background: 'hsl(var(--surface))',
      border: '1px solid hsl(var(--border))',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: fan.rpm > 0 ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--border))',
          border: `1px solid ${fan.rpm > 0 ? 'hsl(var(--accent) / 0.3)' : 'hsl(var(--border))'}`,
        }}>
          <Wind size={18} color={color} style={{
            animation: fan.rpm > 0 ? `spin ${Math.max(0.3, 3 - fan.rpm / 1500)}s linear infinite` : 'none'
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>
            {fan.label || fan.name}
          </div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
            {fan.name} · modo <span style={{ color: isAuto ? 'hsl(var(--green))' : 'hsl(var(--accent))' }}>
              {fan.mode ?? 'auto'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'JetBrains Mono', color, lineHeight: 1 }}>
            {fan.rpm.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>RPM</div>
        </div>
      </div>

      {/* PWM slider */}
      {pct != null && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: 'hsl(var(--muted))' }}>PWM</span>
            <span style={{ fontFamily: 'JetBrains Mono', color: 'hsl(var(--text))' }}>{pct}%</span>
          </div>
          <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'hsl(var(--border))' }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${pct}%`,
              background: `linear-gradient(90deg, hsl(var(--accent)), ${pct > 75 ? 'hsl(var(--orange))' : 'hsl(var(--accent))'})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {['auto', 'manual', 'max'].map(mode => (
          <button key={mode} onClick={() => onCommand({ type: 'set_fan_mode', fan: fan.name, mode })}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${fan.mode === mode ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))'}`,
              background: fan.mode === mode ? 'hsl(var(--accent) / 0.1)' : 'transparent',
              color: fan.mode === mode ? 'hsl(var(--accent))' : 'hsl(var(--muted))',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}>
            {mode === 'auto' ? 'Automático' : mode === 'manual' ? 'Manual' : 'Máximo'}
          </button>
        ))}
      </div>
    </div>
  )
}
