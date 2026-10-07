import { ipcMain, shell, BrowserWindow } from 'electron'
import type { AppRow } from './types'
import { scanInstalledApps } from './scanner'
import { checkApp } from './checker'
import { downloadInstaller } from './downloads'
import { loadCheckCache, saveCheckCache, loadSettings, saveSettings } from './store'
import { clearCaskCache } from './sources/homebrew'
import type { Settings } from './types'

/**
 * Central state in the main process: the merged list of installed apps and
 * their last check results. The renderer stays a pure view over this.
 */
class AppState {
  rows: AppRow[] = []
  checking = new Set<string>()

  mergeScan(): AppRow[] {
    const installed = scanInstalledApps(loadSettings().scanPaths)
    const prev = new Map(this.rows.map((r) => [r.id, r]))
    this.rows = installed.map((app) => {
      const old = prev.get(app.id)
      return old ? { ...old, ...app } : { ...app, status: 'unknown' }
    })
    return this.rows
  }

  mergeCheck(id: string, patch: Partial<AppRow>): AppRow[] {
    this.checking.delete(id)
    const idx = this.rows.findIndex((r) => r.id === id)
    if (idx >= 0) this.rows[idx] = { ...this.rows[idx], ...patch }
    return this.rows
  }
}

export const state = new AppState()

export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('apps:scan', () => {
    return state.mergeScan()
  })

  ipcMain.handle('apps:get', () => {
    if (state.rows.length === 0) {
      const cached = loadCheckCache()
      if (cached.length > 0) {
        state.rows = cached
        return cached
      }
      return state.mergeScan()
    }
    return state.rows
  })

  ipcMain.handle('apps:checkAll', async () => {
    const targets = state.rows.filter((r) => !state.checking.has(r.id))
    let done = 0
    const concurrency = 6
    const queue = [...targets]

    async function worker(): Promise<void> {
      for (;;) {
        const row = queue.shift()
        if (!row) return
        state.checking.add(row.id)
        const patch = await checkApp(row)
        state.mergeCheck(row.id, patch)
        done++
        getWin()?.webContents.send('check:progress', {
          id: row.id,
          done,
          total: targets.length
        })
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker))
    saveCheckCache(state.rows)
    return state.rows
  })

  ipcMain.handle('apps:checkOne', async (_e, id: string) => {
    const row = state.rows.find((r) => r.id === id)
    if (!row || state.checking.has(id)) return state.rows
    state.checking.add(id)
    const patch = await checkApp(row)
    state.mergeCheck(id, patch)
    saveCheckCache(state.rows)
    return state.rows
  })

  ipcMain.handle('download:start', async (_e, url: string, filename: string) => {
    const win = getWin()
    if (!win) return { success: false, error: 'no window' }
    return downloadInstaller(win, url, filename)
  })

  ipcMain.handle('shell:openUrl', (_e, url: string) => {
    void shell.openExternal(url)
  })

  ipcMain.handle('shell:reveal', (_e, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle('settings:get', () => loadSettings())

  ipcMain.handle('settings:set', (_e, s: Settings) => {
    saveSettings(s)
    return true
  })

  ipcMain.handle('cache:clearCask', () => {
    clearCaskCache()
    return true
  })
}
