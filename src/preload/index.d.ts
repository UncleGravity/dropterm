import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    ipc: {
      send: (channel: string, data: unknown) => void
      on: (channel: string, func: (...args: unknown[]) => void) => void
    }
  }
}
