import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appState, habit } from '../test-utils'
import { backupDue, daysSince, snoozeBackup } from './backup'

const DAY = 86_400_000
const withReps = (n: number, lastBackup = '') =>
  appState([habit({})], Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, ['h1']])), {
    settings: { name: '', reminderTime: '', habitReminders: false, lastBackup },
  })

describe('backup nudge', () => {
  beforeEach(() => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) })
  })
  const now = Date.parse('2026-02-01T12:00:00Z')

  it('does not nag when there is little to lose', () => {
    expect(backupDue(withReps(2), now)).toBe(false)
  })
  it('nags when there is history and no backup', () => {
    expect(backupDue(withReps(6), now)).toBe(true)
  })
  it('stays quiet for a week after a backup', () => {
    expect(backupDue(withReps(6, new Date(now - 3 * DAY).toISOString()), now)).toBe(false)
    expect(backupDue(withReps(6, new Date(now - 8 * DAY).toISOString()), now)).toBe(true)
  })
  it('respects "Later"', () => {
    snoozeBackup(3, now)
    expect(backupDue(withReps(6), now + DAY)).toBe(false)
    expect(backupDue(withReps(6), now + 4 * DAY)).toBe(true)
  })
  it('counts days since a backup', () => {
    expect(daysSince(new Date(now - 2 * DAY).toISOString(), now)).toBe(2)
    expect(daysSince('garbage', now)).toBeNull()
  })
})
