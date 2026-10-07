import { ElectronAPI } from '@electron-toolkit/preload'
import type { UpdatePilotApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: UpdatePilotApi
  }
}
