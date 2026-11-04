import { useEffect, useReducer } from 'react'
import type { AppState, CompletionLog, Habit, Settings } from './types'
import { load, save, uid } from './lib/storage'
import { todayKey } from './lib/dates'
import { MAX_SKIPS_PER_WEEK, skipsInWeek } from './lib/engine'

export type Action =
  | { type: 'toggle'; habitId: string; day: string; log?: CompletionLog }
  | { type: 'skip'; habitId: string; day: string; skipped: boolean }
  | { type: 'addHabit'; habit: Omit<Habit, 'id' | 'createdAt'> }
  | { type: 'updateHabit'; habit: Habit }
  | { type: 'archiveHabit'; habitId: string; archived: boolean }
  | { type: 'deleteHabit'; habitId: string }
  | { type: 'reorder'; habitIds: string[] }
  | { type: 'note'; day: string; text: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'replace'; state: AppState }
  | { type: 'reset' }

function withoutSkip(skips: AppState['skips'], day: string, habitId: string): AppState['skips'] {
  const list = skips[day]
  if (!list?.includes(habitId)) return skips
  const next = { ...skips }
  const kept = list.filter((id) => id !== habitId)
  if (kept.length) next[day] = kept
  else delete next[day]
  return next
}

/** Rebuild a day-keyed record, dropping days the mapper returns undefined for. */
function mapDays<T>(rec: Record<string, T>, fn: (v: T) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(rec)) {
    const r = fn(v)
    if (r !== undefined) out[k] = r
  }
  return out
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'toggle': {
      const list = state.completions[action.day] ?? []
      const next = list.includes(action.habitId)
        ? list.filter((id) => id !== action.habitId)
        : [...list, action.habitId]
      const completions = { ...state.completions }
      if (next.length) completions[action.day] = next
      else delete completions[action.day]

      const completing = !list.includes(action.habitId)
      // Completing a rest-day habit means you did it after all.
      const skips = completing ? withoutSkip(state.skips, action.day, action.habitId) : state.skips

      const logs = { ...state.logs }
      const dayLogs = { ...(logs[action.day] ?? {}) }
      if (completing && action.log && Object.keys(action.log).length) dayLogs[action.habitId] = action.log
      else delete dayLogs[action.habitId]
      if (Object.keys(dayLogs).length) logs[action.day] = dayLogs
      else delete logs[action.day]
      return { ...state, completions, logs, skips }
    }
    case 'skip': {
      const habit = state.habits.find((h) => h.id === action.habitId)
      if (!habit || habit.frequency.type === 'perWeek') return state // weekly habits already have slack
      if (!action.skipped) return { ...state, skips: withoutSkip(state.skips, action.day, action.habitId) }
      if ((state.completions[action.day] ?? []).includes(action.habitId)) return state
      if (skipsInWeek(state.skips, action.habitId, action.day) >= MAX_SKIPS_PER_WEEK) return state
      const list = state.skips[action.day] ?? []
      if (list.includes(action.habitId)) return state
      return { ...state, skips: { ...state.skips, [action.day]: [...list, action.habitId] } }
    }
    case 'addHabit':
      return { ...state, habits: [...state.habits, { ...action.habit, id: uid(), createdAt: todayKey() }] }
    case 'updateHabit':
      return { ...state, habits: state.habits.map((h) => (h.id === action.habit.id ? action.habit : h)) }
    case 'archiveHabit':
      return {
        ...state,
        habits: state.habits.map((h) => (h.id === action.habitId ? { ...h, archived: action.archived } : h)),
      }
    case 'deleteHabit': {
      const completions: AppState['completions'] = {}
      for (const [day, ids] of Object.entries(state.completions)) {
        const kept = ids.filter((id) => id !== action.habitId)
        if (kept.length) completions[day] = kept
      }
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.habitId),
        completions,
        logs: mapDays(state.logs, (day) => {
          const { [action.habitId]: _gone, ...rest } = day
          return Object.keys(rest).length ? rest : undefined
        }),
        skips: mapDays(state.skips, (ids) => {
          const kept = ids.filter((id) => id !== action.habitId)
          return kept.length ? kept : undefined
        }),
      }
    }
    case 'reorder': {
      const byId = new Map(state.habits.map((h) => [h.id, h]))
      const ordered = action.habitIds.map((id) => byId.get(id)!).filter(Boolean)
      const rest = state.habits.filter((h) => !action.habitIds.includes(h.id))
      return { ...state, habits: [...ordered, ...rest] }
    }
    case 'note': {
      const notes = { ...state.notes }
      if (action.text.trim()) notes[action.day] = action.text
      else delete notes[action.day]
      return { ...state, notes }
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'replace':
      return action.state
    case 'reset':
      return load() // caller clears storage first
  }
}

export function useAppState(): [AppState, (a: Action) => void] {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => save(state), [state])
  return [state, dispatch]
}
