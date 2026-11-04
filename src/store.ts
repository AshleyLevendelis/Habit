import { useEffect, useReducer } from 'react'
import type { AppState, Habit, Settings } from './types'
import { load, save, uid } from './lib/storage'
import { todayKey } from './lib/dates'

export type Action =
  | { type: 'toggle'; habitId: string; day: string }
  | { type: 'addHabit'; habit: Omit<Habit, 'id' | 'createdAt'> }
  | { type: 'updateHabit'; habit: Habit }
  | { type: 'archiveHabit'; habitId: string; archived: boolean }
  | { type: 'deleteHabit'; habitId: string }
  | { type: 'reorder'; habitIds: string[] }
  | { type: 'note'; day: string; text: string }
  | { type: 'settings'; settings: Partial<Settings> }
  | { type: 'replace'; state: AppState }
  | { type: 'reset' }

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
      return { ...state, completions }
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
      return { ...state, habits: state.habits.filter((h) => h.id !== action.habitId), completions }
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
