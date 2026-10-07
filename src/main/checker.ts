import type { AppRow, InstalledApp, UpdateInfo } from './types'
import { compareVersions } from './versioncmp'
import { checkSparkle } from './sources/sparkle'
import { checkHomebrew } from './sources/homebrew'

/**
 * Run the update-source chain for one app: Sparkle first (exact, official),
 * then the Homebrew cask index by name. Returns the row fields to merge.
 */
export async function checkApp(app: InstalledApp): Promise<Partial<AppRow>> {
  let info: UpdateInfo | null = null

  try {
    info = await checkSparkle(app)
  } catch (e) {
    console.error(`Sparkle check failed for ${app.name}:`, e)
  }

  if (!info) {
    try {
      info = await checkHomebrew(app)
    } catch (e) {
      console.error(`Homebrew check failed for ${app.name}:`, e)
    }
  }

  if (!info) {
    // No machine-readable source; offer the vendor page if we know it
    if (app.homepage) {
      return {
        status: 'unknown',
        info: { source: 'vendor', homepage: app.homepage }
      }
    }
    return { status: 'unknown' }
  }

  if (!info.latestVersion) {
    return { status: 'unknown', info, lastChecked: Date.now() }
  }

  const cmp = compareVersions(app.installedVersion, info.latestVersion)
  return {
    status: cmp >= 0 ? 'uptodate' : 'update-available',
    info,
    lastChecked: Date.now()
  }
}
