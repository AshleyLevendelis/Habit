import { describe, expect, it } from 'vitest'
import { appState, habit } from '../test-utils'
import { dayScore, dueStatus, habitInsights, streak, suggestions, weekSummary } from './engine'
import { addDays, range } from './dates'

describe('rest days', () => {
  const h = habit({})
  it('are neither a hit nor a miss for streaks', () => {
    // Done Jan 1-2, rest day Jan 3, done Jan 4. Without the rest day Jan 3 would be a miss (streak survives either way),
    // so use two consecutive rest days to prove they would otherwise break it: Jan 3+4 skipped, done Jan 5.
    const s = appState([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'], '2026-01-05': ['h1'] }, { skips: { '2026-01-03': ['h1'], '2026-01-04': ['h1'] } })
    expect(streak(s, h, '2026-01-05').current).toBe(3)
  })
  it('without the rest days the same history breaks the streak', () => {
    const s = appState([h], { '2026-01-01': ['h1'], '2026-01-02': ['h1'], '2026-01-05': ['h1'] })
    expect(streak(s, h, '2026-01-05').current).toBe(1)
  })
  it('are reported as skipped and do not count against the day', () => {
    const s = appState([h], {}, { skips: { '2026-01-03': ['h1'] } })
    expect(dueStatus(s, h, '2026-01-03')).toBe('skipped')
    expect(dayScore(s, '2026-01-03').required).toBe(0)
  })
  it('are excluded from the weekly review targets', () => {
    const s = appState([h], { '2026-01-05': ['h1'] }, { skips: { '2026-01-06': ['h1'] } })
    const [row] = weekSummary(s, '2026-01-07', '2026-01-07')
    // Mon-Wed = 3 scheduled days, 1 rest -> target 2, done 1
    expect(row).toMatchObject({ target: 2, done: 1 })
  })
  it('a completed habit still counts even if marked rest', () => {
    const s = appState([h], { '2026-01-03': ['h1'] }, { skips: { '2026-01-03': ['h1'] } })
    expect(dueStatus(s, h, '2026-01-03')).toBe('done')
  })
})

describe('suggestions', () => {
  const today = '2026-02-20'
  const days = (from: number, to: number) => range(addDays(today, -from), addDays(today, -to))

  it('stays quiet for a brand-new habit', () => {
    const h = habit({ createdAt: addDays(today, -3) })
    expect(suggestions(appState([h]), today)).toEqual([])
  })
  it('halves the duration of a habit that keeps getting missed', () => {
    const h = habit({ durationMin: 30, createdAt: addDays(today, -30) })
    const s = appState([h], Object.fromEntries(days(13, 11).map((d) => [d, ['h1']])))
    const [tip] = suggestions(s, today)
    expect(tip).toMatchObject({ kind: 'scale-back', patch: { durationMin: 15 } })
  })
  it('suggests a tiny version when there is no duration to shrink', () => {
    const h = habit({ createdAt: addDays(today, -30) })
    const [tip] = suggestions(appState([h]), today)
    expect(tip.kind).toBe('tiny-version')
    expect(tip.patch).toBeUndefined()
  })
  it('does not count rest days as misses', () => {
    const h = habit({ createdAt: addDays(today, -30) })
    const skips = Object.fromEntries(days(13, 1).map((d) => [d, ['h1']]))
    expect(suggestions(appState([h], {}, { skips }), today)).toEqual([])
  })
  it('lowers a weekly target the habit keeps missing', () => {
    const h = habit({ frequency: { type: 'perWeek', target: 4 }, createdAt: addDays(today, -40) })
    const [tip] = suggestions(appState([h]), today)
    expect(tip).toMatchObject({ kind: 'scale-back', patch: { frequency: { type: 'perWeek', target: 3 } } })
  })
  it('offers a level-up for a rock-solid habit', () => {
    const h = habit({ durationMin: 20, createdAt: addDays(today, -40) })
    const done = Object.fromEntries(range(addDays(today, -39), today).map((d) => [d, ['h1']]))
    const [tip] = suggestions(appState([h], done), today)
    expect(tip).toMatchObject({ kind: 'level-up', patch: { durationMin: 25 } })
  })
})

describe('insights', () => {
  const today = '2026-02-20' // a Friday
  it('finds the weekday you keep missing', () => {
    const h = habit({ createdAt: '2026-01-01' })
    // Done every day in the last 4 weeks except Mondays.
    const done: Record<string, string[]> = {}
    for (const d of range(addDays(today, -27), addDays(today, -1))) {
      if (new Date(d + 'T00:00:00').getDay() !== 1) done[d] = ['h1']
    }
    const [i] = habitInsights(appState([h], done), today)
    expect(i.weakestWeekday?.day).toBe(1)
    expect(i.rate).toBeGreaterThan(0.8)
  })
  it('reports usual time of day and average timed minutes from logs', () => {
    const h = habit({})
    const logs = {
      '2026-02-16': { h1: { at: '07:10', minutes: 20 } },
      '2026-02-17': { h1: { at: '06:50', minutes: 30 } },
      '2026-02-18': { h1: { at: '08:00', minutes: 25 } },
    }
    const [i] = habitInsights(appState([h], {}, { logs }), today)
    expect(i.usualTime).toBe('morning')
    expect(i.avgMinutes).toEqual({ value: 25, sessions: 3 })
  })
  it('needs at least three logged times before claiming a pattern', () => {
    const logs = { '2026-02-16': { h1: { at: '07:10' } } }
    const [i] = habitInsights(appState([habit({})], {}, { logs }), today)
    expect(i.usualTime).toBeNull()
  })
})
