import { describe, expect, it } from 'vitest'
import type { AppState, Habit } from '../types'
import { achievements, dayScore, dueStatus, levelInfo, streak, totals } from './engine'

function habit(partial: Partial<Habit>): Habit {
  return {
    id: 'h1',
    name: 'Test',
    emoji: '✅',
    frequency: { type: 'daily' },
    timeOfDay: 'anytime',
    difficulty: 'medium',
    createdAt: '2026-01-01',
    ...partial,
  }
}

function state(habits: Habit[], done: Record<string, string[]>): AppState {
  return { version: 1, habits, completions: done, logs: {}, skips: {}, notes: {}, settings: { name: '', reminderTime: '', habitReminders: false, lastBackup: '' } }
}

describe('daily streaks with "never miss twice"', () => {
  const h = habit({})
  it('counts consecutive days and does not count an incomplete today as a miss', () => {
    const s = state([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'], '2026-01-03': ['h1'] })
    expect(streak(s, h, '2026-01-04')).toMatchObject({ current: 3, best: 3, atRisk: false })
  })
  it('one miss pauses the streak and flags it at risk', () => {
    const s = state([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'] })
    // 3rd missed, today is the 4th
    expect(streak(s, h, '2026-01-04')).toMatchObject({ current: 2, atRisk: true })
  })
  it('two consecutive misses break the streak', () => {
    const s = state([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'] })
    expect(streak(s, h, '2026-01-05')).toMatchObject({ current: 0, best: 2, atRisk: false })
  })
  it('recovering after one miss continues the streak', () => {
    const s = state([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'], '2026-01-04': ['h1'] })
    expect(streak(s, h, '2026-01-04')).toMatchObject({ current: 3, atRisk: false })
  })
  it('ignores unscheduled days for weekday habits', () => {
    const wk = habit({ frequency: { type: 'weekdays', days: [1, 2, 3, 4, 5] }, createdAt: '2026-01-05' }) // Mon 5 Jan
    const s = state([wk], { '2026-01-08': ['h1'], '2026-01-09': ['h1'] }) // Thu, Fri; Sat/Sun off
    expect(streak(s, wk, '2026-01-12')).toMatchObject({ current: 2, atRisk: false }) // Monday, pending
    expect(dueStatus(s, wk, '2026-01-10')).toBe('off')
  })
})

describe('weekly target habits', () => {
  const h = habit({ frequency: { type: 'perWeek', target: 3 }, createdAt: '2026-01-05' }) // Mon
  it('is optional while there is slack and required when skipping would miss the target', () => {
    const s = state([h], {})
    expect(dueStatus(s, h, '2026-01-05')).toBe('optional') // 7 days left, need 3
    expect(dueStatus(s, h, '2026-01-09')).toBe('must') // Fri: 3 days left, need 3
    const s2 = state([h], { '2026-01-05': ['h1'], '2026-01-06': ['h1'], '2026-01-07': ['h1'] })
    expect(dueStatus(s2, h, '2026-01-08')).toBe('off') // target met
  })
  it('streaks count weeks, with a one-week grace', () => {
    const w1 = { '2026-01-05': ['h1'], '2026-01-06': ['h1'], '2026-01-07': ['h1'] }
    const w3 = { '2026-01-19': ['h1'], '2026-01-20': ['h1'], '2026-01-21': ['h1'] }
    const s = state([h], { ...w1, ...w3 }) // week 2 missed
    expect(streak(s, h, '2026-01-22')).toMatchObject({ current: 2, unit: 'week', atRisk: false })
    expect(streak(s, h, '2026-01-15')).toMatchObject({ current: 1, atRisk: false }) // week 2 pending
  })
})

describe('scores, xp and levels', () => {
  it('awards xp per completion and a perfect-day bonus', () => {
    const a = habit({ id: 'a', difficulty: 'easy' })
    const b = habit({ id: 'b', difficulty: 'hard' })
    const s = state([a, b], { '2026-01-01': ['a', 'b'] })
    const d = dayScore(s, '2026-01-01')
    expect(d).toMatchObject({ required: 2, done: 2, perfect: true, xp: 10 + 35 + 30 })
    expect(dayScore(s, '2026-01-02')).toMatchObject({ required: 2, done: 0, perfect: false })
  })
  it('adds a weekly target bonus once the target is hit', () => {
    const h = habit({ frequency: { type: 'perWeek', target: 2 }, difficulty: 'easy', createdAt: '2026-01-05' })
    const s = state([h], { '2026-01-05': ['h1'], '2026-01-06': ['h1'] })
    expect(totals(s, '2026-01-07').xp).toBe(10 + 10 + 30 + 30 + 40) // two perfect days + bonus
  })
  it('levels up with growing thresholds', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, need: 100 })
    expect(levelInfo(100)).toMatchObject({ level: 2, into: 0, need: 160 })
    expect(levelInfo(259)).toMatchObject({ level: 2, into: 159 })
    expect(levelInfo(260).level).toBe(3)
  })
  it('unlocks achievements from history', () => {
    const h = habit({})
    const s = state([h], { '2026-01-01': ['h1'], '2026-01-03': ['h1'] })
    const earned = achievements(s, '2026-01-03').filter((a) => a.earned).map((a) => a.id)
    expect(earned).toEqual(expect.arrayContaining(['first', 'perfect1', 'comeback']))
    expect(earned).not.toContain('streak7')
  })
})
