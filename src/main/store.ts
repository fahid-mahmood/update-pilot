import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { AppRow, Settings } from './types'

const DEFAULT_SETTINGS: Settings = {
  scanPaths: [],
  columnWidths: {}
}

function storeDir(): string {
  return app.getPath('userData')
}

function settingsFile(): string {
  return path.join(storeDir(), 'settings.json')
}

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsFile(), 'utf8')
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    fs.mkdirSync(storeDir(), { recursive: true })
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

function cacheFile(): string {
  return path.join(storeDir(), 'check-cache.json')
}

/** Persist the last known state of every row so the UI is instantly warm. */
export function saveCheckCache(rows: AppRow[]): void {
  try {
    fs.mkdirSync(storeDir(), { recursive: true })
    fs.writeFileSync(cacheFile(), JSON.stringify(rows, null, 2))
  } catch (e) {
    console.error('Failed to save check cache:', e)
  }
}

export function loadCheckCache(): AppRow[] {
  try {
    return JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as AppRow[]
  } catch {
    return []
  }
}
