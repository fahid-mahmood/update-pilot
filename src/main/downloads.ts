import fs from 'node:fs'
import path from 'node:path'
import { app, dialog, net, BrowserWindow } from 'electron'
import type { AppRow } from './types'

export interface DownloadResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

/**
 * Download an official installer to a user-chosen location, streaming to
 * disk and reporting progress to the renderer.
 */
export async function downloadInstaller(
  win: BrowserWindow,
  url: string,
  filename: string
): Promise<DownloadResult> {
  let defaultName = path.basename(new URL(url).pathname) || filename
  if (!path.extname(defaultName)) defaultName = filename

  const chosen = await dialog.showSaveDialog(win, {
    title: 'Save Update',
    defaultPath: path.join(appDownloadsDir(), defaultName)
  })
  if (chosen.canceled || !chosen.filePath) {
    return { success: false, canceled: true }
  }
  const target = chosen.filePath

  try {
    const res = await net.fetch(url, {
      signal: AbortSignal.timeout(600000),
      headers: { 'User-Agent': 'UpdatePilot/0.1 (macOS app update checker)' }
    })
    if (!res.ok || !res.body) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const total = Number(res.headers.get('content-length') || 0)
    const out = fs.createWriteStream(target)
    let received = 0

    const reader = res.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out.write(Buffer.from(value))
      received += value.length
      if (total > 0) {
        win.webContents.send('download:progress', {
          url,
          progress: Math.round((received / total) * 100),
          received,
          total
        })
      }
    }
    await new Promise<void>((resolve, reject) => {
      out.end(resolve)
      out.on('error', reject)
    })

    win.webContents.send('download:complete', { url, filePath: target })
    return { success: true, filePath: target }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    win.webContents.send('download:error', { url, error })
    return { success: false, error }
  }
}

function appDownloadsDir(): string {
  // Default location for the save dialog; nothing is written until the
  // user explicitly picks a destination there.
  try {
    return app.getPath('downloads')
  } catch {
    return process.env.HOME || '/tmp'
  }
}

export function rowsToFilenameHint(rows: AppRow[], id: string): string {
  const row = rows.find((r) => r.id === id)
  return row ? `${row.name.replace(/[/\\?%*:|"<>\s]+/g, '')}-${row.info?.latestVersion || 'update'}.dmg` : 'update.dmg'
}
