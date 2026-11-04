import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportJson, importJson, load, normalize, save } from './storage'
import { appState, habit } from '../test-utils'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage())
  })

  it('upgrades a save from before logs/skips/new settings existed', () => {
    const old = { version: 1, habits: [habit({})], completions: { '2026-01-01': ['h1'] }, notes: {}, settings: { name: 'A', reminderTime: '08:00' } }
    localStorage.setItem('habit-app-state-v1', JSON.stringify(old))
    const s = load()
    expect(s.logs).toEqual({})
    expect(s.skips).toEqual({})
    expect(s.settings).toEqual({ name: 'A', reminderTime: '08:00', habitReminders: false, lastBackup: '' })
    expect(s.completions['2026-01-01']).toEqual(['h1'])
  })
  it('round-trips through save/load and export/import', () => {
    const s = appState([habit({ startTime: '07:30', durationMin: 25 })], { '2026-01-01': ['h1'] }, { logs: { '2026-01-01': { h1: { at: '07:31', minutes: 25 } } } })
    save(s)
    expect(load()).toEqual(s)
    expect(importJson(exportJson(s))).toEqual(s)
  })
  it('falls back to starter data for corrupt or foreign saves', () => {
    localStorage.setItem('habit-app-state-v1', '{nope')
    expect(load().habits.length).toBeGreaterThan(0)
    localStorage.setItem('habit-app-state-v1', JSON.stringify({ version: 2, habits: [] }))
    expect(load().version).toBe(1)
  })
  it('rejects an invalid backup file', () => {
    expect(() => importJson('{"version":1}')).toThrow(/valid backup/)
  })
  it('normalize keeps unknown-but-valid parts and fills the rest', () => {
    expect(normalize({ habits: [] }).settings.habitReminders).toBe(false)
  })
})
