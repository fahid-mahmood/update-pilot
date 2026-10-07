export interface InstalledApp {
  id: string // bundle id, falling back to path
  path: string
  bundleId: string
  name: string
  installedVersion: string
  updateFeedUrl?: string
  homepage?: string
}

export type UpdateStatus = 'uptodate' | 'update-available' | 'unknown' | 'checking'

export type UpdateSource = 'sparkle' | 'homebrew' | 'vendor'

export interface UpdateInfo {
  latestVersion?: string
  downloadUrl?: string
  notesUrl?: string
  notes?: string
  source: UpdateSource
  homepage?: string
}

export interface AppRow extends InstalledApp {
  status: UpdateStatus
  info?: UpdateInfo
  lastChecked?: number
  error?: string
}

export interface Settings {
  windowBounds?: { x: number; y: number; width: number; height: number }
  columnWidths?: Record<string, number>
  scanPaths: string[]
}
