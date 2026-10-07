import { describe, expect, it, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { readApp, scanInstalledApps } from '../src/main/scanner'

let fixtureDir: string

beforeAll(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-pilot-test-'))
  const appPath = path.join(fixtureDir, 'Fake App.app')
  fs.mkdirSync(path.join(appPath, 'Contents'), { recursive: true })
  fs.writeFileSync(
    path.join(appPath, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>com.example.fakeapp</string>
  <key>CFBundleName</key><string>Fake App</string>
  <key>CFBundleShortVersionString</key><string>3.4.5</string>
  <key>CFBundleVersion</key><string>345</string>
  <key>SUFeedURL</key><string>https://example.app/appcast.xml</string>
</dict>
</plist>`
  )
  // a non-app entry and a broken app that should be skipped
  fs.mkdirSync(path.join(fixtureDir, 'readme.txt'), { recursive: true })
  fs.mkdirSync(path.join(fixtureDir, 'Broken.app'), { recursive: true }) // no Info.plist
})

describe('readApp', () => {
  it('parses identity fields from Info.plist', () => {
    const app = readApp(path.join(fixtureDir, 'Fake App.app'))
    expect(app).not.toBeNull()
    expect(app?.bundleId).toBe('com.example.fakeapp')
    expect(app?.name).toBe('Fake App')
    expect(app?.installedVersion).toBe('3.4.5')
    expect(app?.updateFeedUrl).toBe('https://example.app/appcast.xml')
  })

  it('returns null for an app without Info.plist', () => {
    expect(readApp(path.join(fixtureDir, 'Broken.app'))).toBeNull()
  })
})

describe('scanInstalledApps', () => {
  it('finds apps, skips junk, and sorts by name', () => {
    const apps = scanInstalledApps([fixtureDir])
    expect(apps.length).toBe(1)
    expect(apps[0]?.name).toBe('Fake App')
  })
})
