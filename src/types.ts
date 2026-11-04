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
  /** Daily check-in time, "HH:MM" or '' */
  reminderTime: string
  /** Notify at each habit's own start time. */
  habitReminders: boolean
  /** ISO timestamp of the last exported backup, or ''. */
  lastBackup: string
}

/** What actually happened when a habit was completed (all optional). */
export interface CompletionLog {
  /** Local clock time it was ticked off, "HH:MM". Only recorded for today. */
  at?: string
  /** Minutes actually spent (from the timer). */
  minutes?: number
}

export interface AppState {
  version: 1
  habits: Habit[]
  completions: Completions
  /** dayKey -> habitId -> details of that completion */
  logs: Record<string, Record<string, CompletionLog>>
  /** dayKey -> habit ids on a rest day (skipped without breaking the streak) */
  skips: Record<string, string[]>
  notes: Record<string, string> // dayKey -> reflection
  settings: Settings
}
