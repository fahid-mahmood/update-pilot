# Update Pilot

A macOS app that scans your installed applications and checks for updates
using official sources — Sparkle update feeds, Homebrew cask data, and
vendor download pages. Shows what's outdated and downloads official
installers.

## Status

Work in progress (v0.1.0). Electron + Vue 3 + TypeScript.

## Development

```bash
npm install
npm run dev        # run in dev mode
npm test           # unit tests
npm run build:mac  # package .app + dmg
```

## How update checks work

1. **Scan**: reads `/Applications` and `~/Applications`, parsing each app's
   `Info.plist` (bundle id, name, version, update feed).
2. **Sparkle** (primary): if the app ships a Sparkle feed (`SUFeedURL`),
   the feed's appcast gives the exact latest version and download URL.
3. **Homebrew cask** (fallback): matches the app against the public
   Homebrew cask index for version and official download URL.
4. **Vendor** (last resort): links out to the official site.

All sources are public feeds/APIs published by app vendors for exactly this
purpose. No scraping, no third-party download mirrors.
