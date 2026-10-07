import path from 'node:path'
import fs from 'node:fs'
import { app, net } from 'electron'
import type { InstalledApp, UpdateInfo } from '../types'

const CASK_INDEX_URL = 'https://formulae.brew.sh/api/cask.json'
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface Cask {
  token: string
  name: string[]
  desc?: string
  homepage?: string
  version: string
  url?: string
  artifacts?: Array<{ app?: Array<string | { target: string }> }>
}

interface CaskIndexEntry {
  token: string
  names: string[]
  version: string
  homepage?: string
  url?: string
}

let index: Map<string, CaskIndexEntry> | null = null // key: normalized name
let indexPromise: Promise<Map<string, CaskIndexEntry>> | null = null

function cacheFile(): string {
  return path.join(app.getPath('userData'), 'cask-index.json')
}

/** Normalized name for matching: lowercase, no spaces/punctuation. */
function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Lazy-load the Homebrew cask index (all publicly available casks with their
 * versions and official download URLs). Downloaded once, cached on disk for
 * a week. This is Homebrew's public JSON API, published for tooling.
 */
export async function getCaskIndex(): Promise<Map<string, CaskIndexEntry>> {
  if (index) return index
  if (indexPromise) return indexPromise

  indexPromise = (async () => {
    // Try the on-disk cache first
    try {
      const stat = fs.statSync(cacheFile())
      if (Date.now() - stat.mtimeMs < ONE_WEEK_MS) {
        const raw = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as Cask[]
        index = buildMap(raw)
        return index
      }
    } catch {
      // no cache - fetch below
    }

    try {
      const res = await net.fetch(CASK_INDEX_URL, {
        signal: AbortSignal.timeout(120000)
      })
      if (res.ok) {
        const raw = (await res.json()) as Cask[]
        fs.mkdirSync(path.dirname(cacheFile()), { recursive: true })
        fs.writeFileSync(cacheFile(), JSON.stringify(raw))
        index = buildMap(raw)
        return index
      }
    } catch (e) {
      console.error('Failed to download cask index:', e)
    }

    index ??= new Map()
    return index
  })()

  return indexPromise
}

/** Build the name->cask lookup map (pure, unit-tested). */
export function buildIndexMap(casks: Cask[]): Map<string, CaskIndexEntry> {
  return buildMap(casks)
}

function buildMap(casks: Cask[]): Map<string, CaskIndexEntry> {
  // exported for tests via buildIndexMap
  const map = new Map<string, CaskIndexEntry>()
  for (const c of casks) {
    const entry: CaskIndexEntry = {
      token: c.token,
      names: c.name || [],
      version: c.version.split(',')[0], // casks like "4.94.0,241994"
      homepage: c.homepage,
      url: c.url
    }
    for (const n of [c.token, ...(c.name || [])]) {
      const key = norm(n)
      if (key && !map.has(key)) map.set(key, entry)
    }
  }
  return map
}

/**
 * Look up an installed app in the cask index by normalized name.
 * Returns null when there is no confident match.
 */
export async function checkHomebrew(appInfo: InstalledApp): Promise<UpdateInfo | null> {
  const idx = await getCaskIndex()
  if (idx.size === 0) return null

  const candidates = [appInfo.name, appInfo.bundleId]
  for (const cand of candidates) {
    if (!cand) continue
    const entry = idx.get(norm(cand))
    if (entry) {
      return {
        latestVersion: entry.version,
        downloadUrl: entry.url,
        source: 'homebrew',
        homepage: entry.homepage
      }
    }
  }
  return null
}

/** Empty the in-memory + on-disk cache (used by the refresh setting). */
export function clearCaskCache(): void {
  index = null
  indexPromise = null
  try {
    fs.unlinkSync(cacheFile())
  } catch {
    // nothing to remove
  }
}
