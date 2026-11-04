import type { AppState, Habit, Settings } from '../types'
import { todayKey } from './dates'

const KEY = 'habit-app-state-v1'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Your starting list. Edit freely in the Habits tab. */
export function seedHabits(): Habit[] {
  const createdAt = todayKey()
  const mk = (h: Omit<Habit, 'id' | 'createdAt'>): Habit => ({ id: uid(), createdAt, ...h })
  return [
    mk({
      name: 'Get up early',
      emoji: '🌅',
      why: 'The morning is the only time nobody else owns.',
      cue: 'When the alarm goes, feet on the floor before I think.',
      frequency: { type: 'daily' },
      timeOfDay: 'morning',
      difficulty: 'medium',
    }),
    mk({
      name: 'Healthy breakfast',
      emoji: '🍳',
      cue: 'After I get up, I eat protein before I touch my phone.',
      frequency: { type: 'daily' },
      timeOfDay: 'morning',
      difficulty: 'easy',
    }),
    mk({
      name: 'Healthy lunch',
      emoji: '🥗',
      frequency: { type: 'daily' },
      timeOfDay: 'afternoon',
      difficulty: 'easy',
    }),
    mk({
      name: 'Exercise',
      emoji: '🏋️',
      why: 'Strength is the base everything else is built on.',
      frequency: { type: 'perWeek', target: 4 },
      timeOfDay: 'anytime',
      difficulty: 'hard',
    }),
    mk({
      name: 'Muay Thai',
      emoji: '🥊',
      frequency: { type: 'perWeek', target: 3 },
      timeOfDay: 'evening',
      difficulty: 'hard',
    }),
    mk({
      name: 'Look for investment properties',
      emoji: '🏠',
      cue: 'After lunch, 20 minutes on listings before anything else.',
      frequency: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
      timeOfDay: 'afternoon',
      difficulty: 'medium',
    }),
  ]
}

export function defaultSettings(): Settings {
  return { name: '', reminderTime: '', habitReminders: false, lastBackup: '' }
}

export function initialState(): AppState {
  return {
    version: 1,
    habits: seedHabits(),
    completions: {},
    logs: {},
    skips: {},
    notes: {},
    settings: defaultSettings(),
  }
}

/** Fill in anything an older save is missing so the rest of the app can rely on it. */
export function normalize(parsed: Partial<AppState>): AppState {
  return {
    version: 1,
    habits: parsed.habits ?? [],
    completions: parsed.completions ?? {},
    logs: parsed.logs ?? {},
    skips: parsed.skips ?? {},
    notes: parsed.notes ?? {},
    settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
  }
}

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (parsed.version !== 1 || !Array.isArray(parsed.habits)) return initialState()
    return normalize(parsed)
  } catch {
    return initialState()
  }
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable (private mode); app still works for the session */
  }
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importJson(text: string): AppState {
  const parsed = JSON.parse(text) as Partial<AppState>
  if (parsed.version !== 1 || !Array.isArray(parsed.habits)) throw new Error('Not a valid backup file')
  return normalize(parsed)
}
