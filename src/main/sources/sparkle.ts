import { net } from 'electron'
import { XMLParser } from 'fast-xml-parser'
import type { InstalledApp, UpdateInfo } from '../types'

interface AppcastItem {
  title?: string | { '#text'?: string }
  sparkles?: { releaseNotesLink?: string }
  'sparkle:releaseNotesLink'?: string
  // some feeds put the version on the item instead of the enclosure
  'sparkle:shortVersionString'?: string
  'sparkle:version'?: string
  enclosure?: {
    '@_url'?: string
    '@_sparkle:shortVersionString'?: string
    '@_sparkle:version'?: string
    '@_length'?: string
  }
}

interface Appcast {
  rss?: {
    channel?: {
      item?: AppcastItem | AppcastItem[]
    }
  }
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
})

export interface AppcastResult {
  latestVersion?: string
  downloadUrl?: string
  notesUrl?: string
  notes?: string
}

/** Parse a Sparkle appcast XML document (pure, unit-tested). */
export function parseAppcast(xmlText: string): AppcastResult | null {
  let cast: Appcast
  try {
    cast = xml.parse(xmlText) as Appcast
  } catch {
    return null
  }

  const items = cast.rss?.channel?.item
  if (!items) return null
  const first = Array.isArray(items) ? items[0] : items
  if (!first?.enclosure) return null

  const latest =
    first.enclosure['@_sparkle:shortVersionString'] ||
    first.enclosure['@_sparkle:version'] ||
    first['sparkle:shortVersionString'] ||
    first['sparkle:version'] ||
    undefined
  const downloadUrl = first.enclosure['@_url'] || undefined
  if (!latest && !downloadUrl) return null

  const notesUrl =
    first['sparkle:releaseNotesLink'] || first.sparkles?.releaseNotesLink || undefined

  return {
    latestVersion: latest,
    downloadUrl,
    notesUrl,
    notes: typeof first.title === 'string' ? first.title : first.title?.['#text']
  }
}

/**
 * Check an app's own Sparkle appcast feed (SUFeedURL from its Info.plist).
 * This is the vendor's official update feed, so the result is exact.
 */
export async function checkSparkle(app: InstalledApp): Promise<UpdateInfo | null> {
  if (!app.updateFeedUrl) return null

  const xmlText = await fetchText(app.updateFeedUrl)
  if (!xmlText) return null

  const parsed = parseAppcast(xmlText)
  if (!parsed) return null

  return { ...parsed, source: 'sparkle', homepage: app.homepage }
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await net.fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'UpdatePilot/0.1 (macOS app update checker)' }
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
