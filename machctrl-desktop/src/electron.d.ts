declare global {
  interface Window {
    electron?: {
      minimize:       () => Promise<void>
      maximize:       () => Promise<void>
      close:          () => Promise<void>
      isMaximized:    () => Promise<boolean>
      getPlatform:    () => Promise<{ platform: string; arch: string; hostname: string; release: string }>
      restartBackend: () => Promise<{ ok: boolean }>
      openExternal:   (url: string) => Promise<void>
      onBackendStatus:(cb: (v: { connected: boolean; error?: string }) => void) => void
    }
  }
}

export {}
