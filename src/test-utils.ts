import type { AppState, Habit } from './types'
import { defaultSettings } from './lib/storage'

export function habit(partial: Partial<Habit> = {}): Habit {
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

export function appState(habits: Habit[], completions: Record<string, string[]> = {}, extra: Partial<AppState> = {}): AppState {
  return { version: 1, habits, completions, logs: {}, skips: {}, notes: {}, settings: defaultSettings(), ...extra }
}
