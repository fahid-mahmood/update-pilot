import { describe, expect, it } from 'vitest'
import { compareVersions } from '../src/main/versioncmp'

describe('compareVersions', () => {
  it('compares numeric segments numerically', () => {
    expect(compareVersions('1.10.2', '1.9.9')).toBe(1)
    expect(compareVersions('1.9.9', '1.10.2')).toBe(-1)
    expect(compareVersions('2.0', '2.0')).toBe(0)
  })

  it('treats more segments as newer when the prefix ties', () => {
    expect(compareVersions('1.2.1', '1.2')).toBe(1)
    expect(compareVersions('1.2', '1.2.1')).toBe(-1)
  })

  it('ignores a leading v and case', () => {
    expect(compareVersions('V1.5', 'v1.5')).toBe(0)
    expect(compareVersions('v2', '1.9')).toBe(1)
  })

  it('handles build numbers in parentheses', () => {
    expect(compareVersions('1.2 (345)', '1.2 (344)')).toBe(1)
    expect(compareVersions('1.2 (345)', '1.2')).toBe(1)
  })

  it('handles non-numeric suffixes lexically', () => {
    expect(compareVersions('1.2b', '1.2a')).toBe(1)
    expect(compareVersions('1.2.0-beta', '1.2.0-alpha')).toBe(1)
  })

  it('handles empty and garbage strings without throwing', () => {
    expect(compareVersions('', '')).toBe(0)
    expect(compareVersions('1', '')).toBe(1)
    expect(compareVersions('weird', '1.0')).toBeLessThanOrEqual(1)
  })
})
