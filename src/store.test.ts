import { describe, expect, it } from 'vitest'
import { reducer } from './store'
import { appState, habit } from './test-utils'

describe('toggle + logs', () => {
  const base = appState([habit({})])
  it('records the log when completing and removes it on undo', () => {
    const done = reducer(base, { type: 'toggle', habitId: 'h1', day: '2026-03-01', log: { at: '07:05', minutes: 20 } })
    expect(done.completions['2026-03-01']).toEqual(['h1'])
    expect(done.logs['2026-03-01'].h1).toEqual({ at: '07:05', minutes: 20 })
    const undone = reducer(done, { type: 'toggle', habitId: 'h1', day: '2026-03-01' })
    expect(undone.completions['2026-03-01']).toBeUndefined()
    expect(undone.logs['2026-03-01']).toBeUndefined()
  })
  it('completing without a log (backfill) stores no log', () => {
    const done = reducer(base, { type: 'toggle', habitId: 'h1', day: '2026-03-01' })
    expect(done.logs).toEqual({})
  })
  it('completing a rest-day habit clears the rest day', () => {
    const rested = reducer(base, { type: 'skip', habitId: 'h1', day: '2026-03-02', skipped: true })
    expect(rested.skips['2026-03-02']).toEqual(['h1'])
    const done = reducer(rested, { type: 'toggle', habitId: 'h1', day: '2026-03-02' })
    expect(done.skips['2026-03-02']).toBeUndefined()
  })
})

describe('skip rules', () => {
  const base = appState([habit({}), habit({ id: 'w', frequency: { type: 'perWeek', target: 3 } })])
  it('caps rest days per habit per week', () => {
    let s = base
    for (const d of ['2026-03-02', '2026-03-03', '2026-03-04']) s = reducer(s, { type: 'skip', habitId: 'h1', day: d, skipped: true })
    expect(Object.keys(s.skips).sort()).toEqual(['2026-03-02', '2026-03-03']) // third refused
    // next week is a fresh allowance
    s = reducer(s, { type: 'skip', habitId: 'h1', day: '2026-03-09', skipped: true })
    expect(s.skips['2026-03-09']).toEqual(['h1'])
  })
  it('refuses to rest a habit already completed that day', () => {
    const done = reducer(base, { type: 'toggle', habitId: 'h1', day: '2026-03-02' })
    expect(reducer(done, { type: 'skip', habitId: 'h1', day: '2026-03-02', skipped: true })).toBe(done)
  })
  it('weekly-target habits cannot be rested (they already have slack)', () => {
    expect(reducer(base, { type: 'skip', habitId: 'w', day: '2026-03-02', skipped: true })).toBe(base)
  })
  it('can undo a rest day', () => {
    const r = reducer(base, { type: 'skip', habitId: 'h1', day: '2026-03-02', skipped: true })
    expect(reducer(r, { type: 'skip', habitId: 'h1', day: '2026-03-02', skipped: false }).skips).toEqual({})
  })
})

describe('deleteHabit', () => {
  it('removes the habit and every trace of it, keeping other habits intact', () => {
    let s = appState([habit({}), habit({ id: 'h2' })])
    s = reducer(s, { type: 'toggle', habitId: 'h1', day: '2026-03-01', log: { at: '07:00' } })
    s = reducer(s, { type: 'toggle', habitId: 'h2', day: '2026-03-01', log: { at: '08:00' } })
    s = reducer(s, { type: 'skip', habitId: 'h1', day: '2026-03-02', skipped: true })
    const after = reducer(s, { type: 'deleteHabit', habitId: 'h1' })
    expect(after.habits.map((h) => h.id)).toEqual(['h2'])
    expect(after.completions).toEqual({ '2026-03-01': ['h2'] })
    expect(after.logs).toEqual({ '2026-03-01': { h2: { at: '08:00' } } })
    expect(after.skips).toEqual({})
  })
})

describe('updateHabit', () => {
  it('can clear a start time and duration', () => {
    const h = habit({ startTime: '07:00', durationMin: 30 })
    const s = reducer(appState([h]), { type: 'updateHabit', habit: { ...h, ...{ startTime: undefined, durationMin: undefined } } })
    expect(s.habits[0].startTime).toBeUndefined()
    expect(s.habits[0].durationMin).toBeUndefined()
  })
})
