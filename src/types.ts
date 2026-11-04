export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime'

export type Frequency =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { type: 'perWeek'; target: number } // e.g. exercise 4x per week

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Habit {
  id: string
  name: string
  emoji: string
  /** Why this matters to you. Shown when you're tempted to skip. */
  why?: string
  /** Implementation intention: "After I ___, I will ___" (Atomic Habits). */
  cue?: string
  frequency: Frequency
  timeOfDay: TimeOfDay
  /** Optional scheduled start, "HH:MM" (24h). */
  startTime?: string
  /** Optional planned duration in minutes. */
  durationMin?: number
  difficulty: Difficulty
  createdAt: string // YYYY-MM-DD
  archived?: boolean
}

/** dayKey (YYYY-MM-DD) -> list of habit ids completed that day */
export type Completions = Record<string, string[]>

export interface Settings {
  name: string
  reminderTime: string // "HH:MM" or ''
  /** Journal lines per day, optional end-of-day reflection */
}

export interface AppState {
  version: 1
  habits: Habit[]
  completions: Completions
  notes: Record<string, string> // dayKey -> reflection
  settings: Settings
}
