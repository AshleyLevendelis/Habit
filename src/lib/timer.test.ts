import { describe, expect, it } from 'vitest'
import { elapsedMinutes, formatClock, isFinished, remainingMs, startTimer } from './timer'

describe('timer', () => {
  const t = startTimer('h1', '2026-03-04', 25, 1_000_000)
  it('counts down from the planned duration and finishes on time', () => {
    expect(remainingMs(t, 1_000_000)).toBe(25 * 60_000)
    expect(remainingMs(t, 1_000_000 + 10 * 60_000)).toBe(15 * 60_000)
    expect(isFinished(t, t.endsAt - 1)).toBe(false)
    expect(isFinished(t, t.endsAt)).toBe(true)
    expect(remainingMs(t, t.endsAt + 99)).toBe(0)
  })
  it('credits elapsed minutes, at least 1, never more than planned', () => {
    expect(elapsedMinutes(t, t.startedAt + 5_000)).toBe(1)
    expect(elapsedMinutes(t, t.startedAt + 10 * 60_000)).toBe(10)
    expect(elapsedMinutes(t, t.endsAt + 3 * 3_600_000)).toBe(25) // walked away: only the plan counts
  })
  it('formats the clock', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(61_500)).toBe('1:02')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(0)).toBe('0:00')
  })
})
