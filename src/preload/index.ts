import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppRow, Settings } from '../main/types'

export interface DownloadProgress {
  url: string
  progress: number
  received: number
  total: number
}

const api = {
  getApps: (): Promise<AppRow[]> => ipcRenderer.invoke('apps:get'),
  scanApps: (): Promise<AppRow[]> => ipcRenderer.invoke('apps:scan'),
  checkAll: (): Promise<AppRow[]> => ipcRenderer.invoke('apps:checkAll'),
  checkOne: (id: string): Promise<AppRow[]> => ipcRenderer.invoke('apps:checkOne', id),
  download: (url: string, filename: string): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('download:start', url, filename),
  openUrl: (url: string): Promise<void> => ipcRenderer.invoke('shell:openUrl', url),
  reveal: (p: string): Promise<void> => ipcRenderer.invoke('shell:reveal', p),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (s: Settings): Promise<boolean> => ipcRenderer.invoke('settings:set', s),
  clearCaskCache: (): Promise<boolean> => ipcRenderer.invoke('cache:clearCask'),
  onCheckProgress: (cb: (p: { id: string; done: number; total: number }) => void): void => {
    ipcRenderer.on('check:progress', (_e, p) => cb(p))
  },
  onDownloadProgress: (cb: (p: DownloadProgress) => void): void => {
    ipcRenderer.on('download:progress', (_e, p) => cb(p))
  },
  onDownloadComplete: (cb: (p: { url: string; filePath: string }) => void): void => {
    ipcRenderer.on('download:complete', (_e, p) => cb(p))
  },
  onDownloadError: (cb: (p: { url: string; error: string }) => void): void => {
    ipcRenderer.on('download:error', (_e, p) => cb(p))
  }
}

export type UpdatePilotApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
