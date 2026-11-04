import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appState, habit } from '../test-utils'
import { dueCheckin, dueHabitReminders, markSent, REMINDER_GRACE_MIN, wasSent } from './notify'

const at = (hh: number, mm: number) => new Date(2026, 2, 4, hh, mm, 0) // 4 Mar 2026 (Wed), local time
const timed = habit({ id: 't', name: 'Run', emoji: '🏃', startTime: '07:00', durationMin: 30, createdAt: '2026-01-01' })

describe('start-time reminders', () => {
  const s = appState([timed])
  it('fire at the start time', () => {
    const [r] = dueHabitReminders(s, at(7, 0))
    expect(r.title).toContain('Run')
    expect(r.body).toContain('30 min')
  })
  it('do not fire before the start time', () => {
    expect(dueHabitReminders(s, at(6, 59))).toEqual([])
  })
  it('do not announce a stale reminder when the app is opened late', () => {
    expect(dueHabitReminders(s, at(7, REMINDER_GRACE_MIN))).toHaveLength(1)
    expect(dueHabitReminders(s, at(7, REMINDER_GRACE_MIN + 1))).toEqual([])
    expect(dueHabitReminders(s, at(15, 0))).toEqual([])
  })
  it('fire at most once', () => {
    const sent = new Set<string>()
    const [r] = dueHabitReminders(s, at(7, 1), (k) => sent.has(k))
    sent.add(r.key)
    expect(dueHabitReminders(s, at(7, 2), (k) => sent.has(k))).toEqual([])
  })
  it('skip habits already done, rested, archived, or without a start time', () => {
    expect(dueHabitReminders(appState([timed], { '2026-03-04': ['t'] }), at(7, 0))).toEqual([])
    expect(dueHabitReminders(appState([timed], {}, { skips: { '2026-03-04': ['t'] } }), at(7, 0))).toEqual([])
    expect(dueHabitReminders(appState([{ ...timed, archived: true }]), at(7, 0))).toEqual([])
    expect(dueHabitReminders(appState([{ ...timed, startTime: undefined }]), at(7, 0))).toEqual([])
  })
  it('respect the weekday schedule', () => {
    const weekend = { ...timed, frequency: { type: 'weekdays' as const, days: [0, 6] } }
    expect(dueHabitReminders(appState([weekend]), at(7, 0))).toEqual([]) // Wednesday
  })
})

describe('daily check-in', () => {
  it('says how many are left, only after the set time, and only when something is left', () => {
    const s = appState([timed])
    expect(dueCheckin(s, at(8, 59), '09:00')).toBeNull()
    expect(dueCheckin(s, at(9, 0), '09:00')?.body).toContain('1 left')
    expect(dueCheckin(appState([timed], { '2026-03-04': ['t'] }), at(9, 0), '09:00')).toBeNull()
    expect(dueCheckin(s, at(9, 0), '')).toBeNull()
  })
})

describe('de-duplication markers', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    })
  })
  const d1 = new Date(2026, 2, 4, 9, 0)
  const d2 = new Date(2026, 2, 5, 9, 0)

  it('remembers a key for the rest of the day, including keys that carry no date (timers)', () => {
    expect(wasSent('timer:1772600000000', d1)).toBe(false)
    markSent('timer:1772600000000', d1)
    expect(wasSent('timer:1772600000000', d1)).toBe(true)
    markSent('habit:other', d1) // writing another marker must not wipe the first one
    expect(wasSent('timer:1772600000000', d1)).toBe(true)
  })
  it('forgets yesterday so keys can fire again', () => {
    markSent('checkin', d1)
    markSent('anything', d2)
    expect(wasSent('checkin', d2)).toBe(false)
    expect([...store.keys()].every((k) => k.startsWith('sent:2026-03-05:'))).toBe(true)
  })
})
