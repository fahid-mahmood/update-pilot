import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import * as plist from 'plist'
import type { InstalledApp } from './types'

interface PlistData {
  CFBundleIdentifier?: string
  CFBundleName?: string
  CFBundleDisplayName?: string
  CFBundleShortVersionString?: string
  CFBundleVersion?: string
  SUFeedURL?: string
  SUFeedURLKey?: string
  CFBundleHomePage?: string
}

/**
 * Scan the standard application folders and return every .app with the
 * identity fields we need from its Info.plist.
 */
export function scanInstalledApps(scanPaths?: string[]): InstalledApp[] {
  const folders = scanPaths?.length
    ? scanPaths
    : ['/Applications', path.join(os.homedir(), 'Applications')]

  const apps: InstalledApp[] = []
  const seen = new Set<string>()

  for (const folder of folders) {
    let entries: string[]
    try {
      entries = fs.readdirSync(folder)
    } catch {
      continue // folder may not exist
    }
    for (const entry of entries) {
      if (!entry.endsWith('.app')) continue
      const appPath = path.join(folder, entry)
      const app = readApp(appPath)
      if (app && !seen.has(app.id)) {
        seen.add(app.id)
        apps.push(app)
      }
    }
  }

  apps.sort((a, b) => a.name.localeCompare(b.name))
  return apps
}

export function readApp(appPath: string): InstalledApp | null {
  try {
    const infoPath = path.join(appPath, 'Contents', 'Info.plist')
    if (!fs.existsSync(infoPath)) return null

    const data = plist.parse(fs.readFileSync(infoPath, 'utf8')) as PlistData
    const bundleId = data.CFBundleIdentifier || ''
    const name =
      data.CFBundleDisplayName || data.CFBundleName || path.basename(appPath, '.app')
    const version = data.CFBundleShortVersionString || data.CFBundleVersion || ''

    return {
      id: bundleId || appPath,
      path: appPath,
      bundleId,
      name,
      installedVersion: version,
      updateFeedUrl: data.SUFeedURL || data.SUFeedURLKey || undefined,
      homepage: data.CFBundleHomePage || undefined
    }
  } catch {
    return null
  }
}
