import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2, Sun, Moon } from 'lucide-react'
import type { Theme } from '../../hooks/useTheme'

interface TitlebarProps {
  connected?: boolean
  theme: Theme
  onToggleTheme: () => void
}

export function Titlebar({ connected = false, theme, onToggleTheme }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron?.isMaximized().then(setIsMaximized)
  }, [])

  return (
    <div className="drag-region" style={{
      display: 'flex', height: 44, alignItems: 'center',
      justifyContent: 'space-between', padding: '0 12px', flexShrink: 0,
      background: 'hsl(var(--bg))',
      borderBottom: '1px solid hsl(var(--border))',
    }}>
      {/* Left: logo */}
      <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src="/src/assets/app-icon.png"
          alt="MachCtrl"
          style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'contain' }}
          onError={e => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            const next = el.nextElementSibling as HTMLElement
            if (next) next.style.display = 'flex'
          }}
        />
        {/* Fallback se imagem não carregar */}
        <div style={{
          width: 26, height: 26, borderRadius: 7, display: 'none',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, hsl(217 100% 62%), hsl(262 80% 65%))',
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'white' }}>M</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--text))' }}>MachCtrl</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: 'hsl(var(--border))', color: 'hsl(var(--muted))' }}>v2.0</span>
      </div>

      {/* Center: status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? 'hsl(var(--green))' : 'hsl(var(--red))',
          boxShadow: connected ? '0 0 6px hsl(var(--green) / 0.8)' : 'none',
        }} />
        <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {/* Right: theme toggle + window controls */}
      <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Tema */}
        <WinBtn onClick={onToggleTheme} color="hsl(var(--muted))" hoverColor="hsl(var(--accent))">
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
        </WinBtn>
        <div style={{ width: 1, height: 16, background: 'hsl(var(--border))', margin: '0 4px' }} />
        <WinBtn onClick={() => window.electron?.minimize()} color="hsl(var(--muted))" hoverColor="#febc2e">
          <Minus size={10} />
        </WinBtn>
        <WinBtn onClick={() => window.electron?.maximize().then(() => setIsMaximized(m => !m))} color="hsl(var(--muted))" hoverColor="#28c840">
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
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hovered ? `${hoverColor}22` : 'transparent',
        color: hovered ? hoverColor : color, transition: 'all 0.15s',
      }}>
      {children}
    </button>
  )
}
