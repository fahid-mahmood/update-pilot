import { describe, expect, it } from 'vitest'
import { buildIndexMap } from '../src/main/sources/homebrew'

const CASKS = [
  {
    token: 'visual-studio-code',
    name: ['Visual Studio Code'],
    version: '1.99.0',
    homepage: 'https://code.visualstudio.com/',
    url: 'https://update.code.visualstudio.com/1.99.0/darwin-arm64/stable'
  },
  {
    token: 'rectangle',
    name: ['Rectangle'],
    version: '0.85,106',
    homepage: 'https://rectangleapp.com/',
    url: 'https://rectangleapp.com/downloads/Rectangle0.85.dmg'
  }
]

describe('buildIndexMap', () => {
  const map = buildIndexMap(CASKS)

  it('indexes by token and display name', () => {
    expect(map.get('visualstudiocode')?.token).toBe('visual-studio-code')
    expect(map.get('rectangle')?.version).toBe('0.85')
  })

  it('splits compound versions at the comma', () => {
    expect(map.get('rectangle')?.version).toBe('0.85')
  })

  it('matches an installed app name ignoring case and punctuation', () => {
    expect(map.get('visualstudiocode')).toBeDefined()
    expect(map.get('Visual Studio Code'.toLowerCase().replace(/[^a-z0-9]/g, ''))).toBeDefined()
  })
})
