import { useState } from 'react'
import { Sidebar, type Tab } from './components/sidebar/Sidebar'
import { Titlebar } from './components/sidebar/Titlebar'
import { OverviewPanel } from './components/panels/OverviewPanel'
import { CpuPanel } from './components/panels/CpuPanel'
import { MemoryPanel } from './components/panels/MemoryPanel'
import { DisksPanel } from './components/panels/DisksPanel'
import { FansPanel } from './components/panels/FansPanel'
import { PowerPanel } from './components/panels/PowerPanel'
import { CleanerPanel } from './components/panels/CleanerPanel'
import { BenchmarkPanel } from './components/benchmark/BenchmarkPanel'
import { useSensorData } from './hooks/useSensorData'

export function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const { state, data, history, tempHistory, sendCommand } = useSensorData()
  const connected = state === 'connected'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'hsl(var(--bg))',
    }}>
      <Titlebar title="MachCtrl" connected={connected} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={tab} onChange={setTab} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px 18px' }}>
          <PageHeader tab={tab} data={data} />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {!data && <LoadingState state={state} />}
            {data && tab === 'overview'  && <OverviewPanel  data={data} cpuHistory={history} tempHistory={tempHistory} />}
            {data && tab === 'cpu'       && <CpuPanel       data={data} cpuHistory={history} />}
            {data && tab === 'memory'    && <MemoryPanel    data={data} />}
            {data && tab === 'disks'     && <DisksPanel     data={data} />}
            {data && tab === 'fans'      && <FansPanel      data={data} onCommand={sendCommand} />}
            {data && tab === 'power'     && <div style={{ padding: '4px 0', height: '100%', overflowY: 'auto' }}><PowerPanel data={data} onCommand={sendCommand} /></div>}
            {tab === 'cleaner'           && <CleanerPanel />}
            {tab === 'benchmark'         && <BenchmarkPanel />}
            {tab === 'about'             && <AboutPanel />}
          </div>
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const PAGE_TITLES: Record<Tab, string> = {
  overview: 'Visão Geral', cpu: 'CPU', memory: 'Memória',
  disks: 'Discos', fans: 'Ventiladores', power: 'Perfil de Energia',
  cleaner: 'Limpeza do Sistema', benchmark: 'Benchmark', about: 'Sobre',
}

function PageHeader({ tab, data }: { tab: Tab; data: any }) {
  return (
    <div style={{ marginBottom: 14, flexShrink: 0 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--text))', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {PAGE_TITLES[tab]}
      </h1>
      {data?.system && (
        <p style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3 }}>
          {data.system.hostname} · {data.system.os} · Uptime {data.system.uptime}
        </p>
      )}
    </div>
  )
}

function LoadingState({ state }: { state: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--accent))', animation: 'spin 0.9s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>
        {state === 'connecting' ? 'Conectando ao backend...' : state === 'error' ? 'Erro — tentando reconectar...' : 'Backend desconectado'}
      </div>
      <button onClick={() => window.electron?.restartBackend()} style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--muted))' }}>
        Reiniciar Backend
      </button>
    </div>
  )
}

function AboutPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18 }}>
      <div style={{ width: 88, height: 88, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, hsl(217 100% 62%), hsl(262 80% 65%))', boxShadow: '0 12px 40px hsl(217 100% 62% / 0.4)' }}>
        <span style={{ fontSize: 44, fontWeight: 900, color: 'white', lineHeight: 1 }}>M</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'hsl(var(--text))', letterSpacing: '-0.02em' }}>MachCtrl</div>
        <div style={{ fontSize: 13, color: 'hsl(var(--muted))', marginTop: 4 }}>Monitor e Otimizador de Hardware para Linux</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '4px 14px', borderRadius: 20, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', fontSize: 11, color: 'hsl(var(--muted))' }}>
          <span>v2.0.0</span><span style={{ opacity: 0.4 }}>·</span><span>CachyOS / Arch</span><span style={{ opacity: 0.4 }}>·</span><span>Electron + React</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 480, width: '100%' }}>
        {[['CPU','Núcleos, temp, freq'],['GPU','Temp, VRAM, carga'],['Memória','Uso, slots, módulos'],['Discos','Uso, I/O, filesystems'],['Benchmark','CPU, FP, RAM'],['Limpeza','Cache, logs, órfãos']].map(([l,d]) => (
          <div key={l} style={{ padding: '10px 14px', borderRadius: 12, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))' }}>{l}</div>
            <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
      <button onClick={() => window.electron?.openExternal('https://github.com/araujo791/solus-os-gateway')} style={{ fontSize: 12, padding: '8px 20px', borderRadius: 10, cursor: 'pointer', border: '1px solid hsl(var(--accent) / 0.3)', background: 'hsl(var(--accent) / 0.08)', color: 'hsl(var(--accent))' }}>
        GitHub → araujo791/solus-os-gateway
      </button>
    </div>
  )
}
