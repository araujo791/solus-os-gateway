import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

interface TitlebarProps {
  title?: string
  connected?: boolean
}

export function Titlebar({ title = 'MachCtrl', connected = false }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron?.isMaximized().then(setIsMaximized)
  }, [])

  return (
    <div className="drag-region flex h-11 items-center justify-between px-4 flex-shrink-0"
         style={{ background: 'hsl(var(--bg))' }}>
      {/* Left: logo + title */}
      <div className="no-drag flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg"
             style={{ background: 'linear-gradient(135deg, hsl(217 100% 62%), hsl(262 80% 65%))' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>M</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>{title}</span>
        <span style={{
          fontSize: 10, fontWeight: 500,
          padding: '2px 6px', borderRadius: 6,
          background: 'hsl(var(--border))',
          color: 'hsl(var(--muted))',
          letterSpacing: '0.05em',
        }}>v2.0</span>
      </div>

      {/* Center: connection status */}
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full"
             style={{ background: connected ? 'hsl(var(--green))' : 'hsl(var(--red))',
                      boxShadow: connected ? '0 0 6px hsl(152 100% 47% / 0.8)' : 'none' }} />
        <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {/* Right: window controls */}
      <div className="no-drag flex items-center gap-1">
        <WinBtn onClick={() => window.electron?.minimize()} color="hsl(var(--muted))" hoverColor="#febc2e">
          <Minus size={10} />
        </WinBtn>
        <WinBtn onClick={() => window.electron?.maximize().then(() => setIsMaximized(m => !m))}
                color="hsl(var(--muted))" hoverColor="#28c840">
          {isMaximized ? <Square size={9} /> : <Maximize2 size={9} />}
        </WinBtn>
        <WinBtn onClick={() => window.electron?.close()} color="hsl(var(--muted))" hoverColor="#ff5f57">
          <X size={10} />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({ onClick, color, hoverColor, children }: any) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
        background: hovered ? `${hoverColor}22` : 'transparent',
        color: hovered ? hoverColor : color,
        transition: 'all 0.15s ease',
      }}>
      {children}
    </button>
  )
}
