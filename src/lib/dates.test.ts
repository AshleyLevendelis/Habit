/// <reference types="node" />
import { afterAll, describe, expect, it } from 'vitest'
import { addDays, daysBetween, range, toKey, weekStart } from './dates'

// Day keys are local-calendar based. Prove nothing drifts across DST changes or in far-off zones.
const ZONES = ['America/New_York', 'Europe/London', 'Pacific/Auckland', 'Asia/Kolkata', 'America/Sao_Paulo', 'UTC']
const originalTZ = process.env.TZ
afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ
  else process.env.TZ = originalTZ
})

describe.each(ZONES)('date keys in %s', (tz) => {
  it('adds days one calendar day at a time across spring/autumn DST changes', () => {
    process.env.TZ = tz
    // Cover both hemispheres' transitions.
    for (const start of ['2026-03-06', '2026-03-27', '2026-04-03', '2026-09-24', '2026-10-30', '2026-11-04']) {
      let cur = start
      for (let i = 1; i <= 10; i++) {
        const next = addDays(cur, 1)
        expect(daysBetween(cur, next)).toBe(1)
        expect(next > cur).toBe(true)
        cur = next
      }
      expect(addDays(addDays(start, 10), -10)).toBe(start)
    }
  })
  it('ranges and weeks are always whole calendar days', () => {
    process.env.TZ = tz
    expect(range('2026-03-01', '2026-03-31')).toHaveLength(31)
    expect(range('2026-10-25', '2026-11-08')).toHaveLength(15)
    expect(weekStart('2026-03-08')).toBe('2026-03-02') // Sunday belongs to the week starting Monday
    expect(weekStart('2026-03-09')).toBe('2026-03-09')
  })
  it('a late-night moment stays on its own local date', () => {
    process.env.TZ = tz
    expect(toKey(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15')
    expect(toKey(new Date(2026, 5, 16, 0, 0, 1))).toBe('2026-06-16')
  })
})
