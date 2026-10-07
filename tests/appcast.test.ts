import { describe, expect, it } from 'vitest'
import { parseAppcast } from '../src/main/sources/sparkle'

const SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Example App Changelog</title>
    <item>
      <title>Version 2.1.0</title>
      <sparkle:releaseNotesLink>https://example.app/releases/2.1.0.html</sparkle:releaseNotesLink>
      <enclosure
        url="https://example.app/downloads/Example-2.1.0.zip"
        sparkle:version="2100"
        sparkle:shortVersionString="2.1.0"
        length="12345678"
        type="application/octet-stream" />
    </item>
    <item>
      <title>Version 2.0.9</title>
      <enclosure
        url="https://example.app/downloads/Example-2.0.9.zip"
        sparkle:version="2099"
        sparkle:shortVersionString="2.0.9"
        length="12345678" />
    </item>
  </channel>
</rss>`

describe('parseAppcast', () => {
  it('reads the newest item first', () => {
    const r = parseAppcast(SAMPLE)
    expect(r).not.toBeNull()
    expect(r?.latestVersion).toBe('2.1.0')
    expect(r?.downloadUrl).toBe('https://example.app/downloads/Example-2.1.0.zip')
    expect(r?.notesUrl).toBe('https://example.app/releases/2.1.0.html')
  })

  it('falls back to the build number when shortVersionString is missing', () => {
    const noShort = SAMPLE.replace('sparkle:shortVersionString="2.1.0"', '')
    const r = parseAppcast(noShort)
    expect(r?.latestVersion).toBe('2100')
  })

  it('reads the version from item-level sparkle elements (AdGuard style)', () => {
    const itemLevel = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0">
  <channel>
    <item>
      <title>Version 2.10.1</title>
      <sparkle:version>1142</sparkle:version>
      <sparkle:shortVersionString>2.10.1</sparkle:shortVersionString>
      <enclosure url="https://example.app/dl.dmg" type="application/octet-stream" length="123"></enclosure>
    </item>
  </channel>
</rss>`
    const r = parseAppcast(itemLevel)
    expect(r?.latestVersion).toBe('2.10.1')
    expect(r?.downloadUrl).toBe('https://example.app/dl.dmg')
  })

  it('returns null for non-appcast XML', () => {
    expect(parseAppcast('<html><body>nope</body></html>')).toBeNull()
    expect(parseAppcast('')).toBeNull()
    expect(parseAppcast('not xml at all >>>')).toBeNull()
  })
})
