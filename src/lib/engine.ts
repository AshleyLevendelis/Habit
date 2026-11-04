import type { AppState, Difficulty, Habit, TimeOfDay } from '../types'
import { addDays, daysBetween, range, todayKey, weekday, weekEnd, weekStart } from './dates'
import { timeOfDayFor } from './time'

/* ---------- XP constants ---------- */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35 }
export const PERFECT_DAY_BONUS = 30
export const WEEKLY_TARGET_BONUS = 40

/* ---------- Scheduling ---------- */

export function isCompleted(state: AppState, habitId: string, day: string): boolean {
  return (state.completions[day] ?? []).includes(habitId)
}

/* ---------- Rest days ---------- */

/** Planned rest days per habit per Mon–Sun week. Keeps "skip" from becoming a loophole. */
export const MAX_SKIPS_PER_WEEK = 2

export function isSkipped(state: AppState, habitId: string, day: string): boolean {
  return (state.skips[day] ?? []).includes(habitId)
}

/** How many rest days this habit has used in the Mon–Sun week containing `day`. */
export function skipsInWeek(skips: AppState['skips'], habitId: string, day: string): number {
  return range(weekStart(day), weekEnd(day)).filter((d) => skips[d]?.includes(habitId)).length
}

/** Daily/weekday habits: is this a scheduled day? perWeek habits are eligible every day. */
export function isScheduled(habit: Habit, day: string): boolean {
  if (day < habit.createdAt) return false
  switch (habit.frequency.type) {
    case 'daily':
      return true
    case 'weekdays':
      return habit.frequency.days.includes(weekday(day))
    case 'perWeek':
      return true
  }
}

/** Completions of a perWeek habit in the week containing `day`. */
export function weekCount(state: AppState, habitId: string, day: string): number {
  return range(weekStart(day), weekEnd(day)).filter((d) => isCompleted(state, habitId, d)).length
}

export type DueStatus = 'done' | 'must' | 'optional' | 'off' | 'skipped'

/**
 * What does this habit want from you on `day`?
 *  - done:     already completed
 *  - must:     required today (daily/weekday schedule, or a weekly target that can only still be hit if you go today)
 *  - optional: weekly habit with slack left this week
 *  - off:      not scheduled
 *  - skipped:  planned rest day (does not break the streak or count against the day)
 */
export function dueStatus(state: AppState, habit: Habit, day: string): DueStatus {
  if (habit.archived || day < habit.createdAt) return 'off'
  if (isCompleted(state, habit.id, day)) return 'done'
  if (habit.frequency.type !== 'perWeek' && isSkipped(state, habit.id, day)) return 'skipped'
  if (habit.frequency.type !== 'perWeek') return isScheduled(habit, day) ? 'must' : 'off'
  const remaining = habit.frequency.target - weekCount(state, habit.id, day)
  if (remaining <= 0) return 'off' // target met; extra reps still allowed
  const daysLeft = daysBetween(day, weekEnd(day)) + 1
  return remaining >= daysLeft ? 'must' : 'optional'
}

/* ---------- Streaks ("never miss twice") ---------- */

export interface StreakInfo {
  current: number
  best: number
  /** The last scheduled unit (day or week) was missed; the next miss breaks the streak. */
  atRisk: boolean
  unit: 'day' | 'week'
}

/**
 * Generic streak over an ordered list of units, oldest first.
 * A single miss is forgiven (the streak pauses); two consecutive misses break it.
 * `trailingPending` = the final unit is still in progress and should not count as a miss.
 */
function computeStreak(units: boolean[], trailingPending: boolean): { current: number; best: number; atRisk: boolean } {
  let best = 0
  let run = 0
  let misses = 0
  const n = trailingPending ? units.length - 1 : units.length
  for (let i = 0; i < n; i++) {
    if (units[i]) {
      run++
      misses = 0
      best = Math.max(best, run)
    } else {
      misses++
      if (misses >= 2) run = 0
    }
  }
  // Add trailing unit if already done
  if (trailingPending && units[units.length - 1]) {
    run++
    misses = 0
    best = Math.max(best, run)
  }
  const atRisk = run > 0 && misses === 1
  return { current: run, best, atRisk }
}

export function streak(state: AppState, habit: Habit, today = todayKey()): StreakInfo {
  if (habit.frequency.type === 'perWeek') {
    const target = habit.frequency.target
    const firstWeek = weekStart(habit.createdAt)
    const thisWeek = weekStart(today)
    const weeks: boolean[] = []
    let w = firstWeek
    while (w <= thisWeek) {
      weeks.push(weekCount(state, habit.id, w) >= target)
      w = addDays(w, 7)
    }
    const pending = weekCount(state, habit.id, today) < target
    return { ...computeStreak(weeks, pending), unit: 'week' }
  }
  // Rest days are neither a hit nor a miss: they simply don't exist for streak purposes.
  const days = range(habit.createdAt, today).filter(
    (d) => isScheduled(habit, d) && (isCompleted(state, habit.id, d) || !isSkipped(state, habit.id, d)),
  )
  const units = days.map((d) => isCompleted(state, habit.id, d))
  const lastIsToday = days[days.length - 1] === today
  const pending = lastIsToday && !isCompleted(state, habit.id, today)
  return { ...computeStreak(units, pending), unit: 'day' }
}

/* ---------- Daily score & XP ---------- */

export interface DayScore {
  required: number
  done: number
  /** 0..1, 1 when every required habit is done */
  ratio: number
  perfect: boolean
  xp: number
}

export function dayScore(state: AppState, day: string): DayScore {
  const active = state.habits.filter((h) => !h.archived || isCompleted(state, h.id, day))
  let required = 0
  let done = 0
  let xp = 0
  for (const h of active) {
    const completed = isCompleted(state, h.id, day)
    if (completed) xp += XP_BY_DIFFICULTY[h.difficulty]
    if (h.frequency.type === 'perWeek') {
      // Count as required only if it was a "must" day, which we approximate retroactively:
      // required if completed, or if (target - completions in week) >= days left at that point.
      const status = dueStatus(state, h, day)
      if (status === 'must') required++
      else if (completed) {
        required++
        done++
      }
    } else if (isScheduled(h, day) && !h.archived) {
      if (isSkipped(state, h.id, day) && !completed) continue // rest day
      required++
      if (completed) done++
    } else if (completed) {
      required++
      done++
    }
  }
  const perfect = required > 0 && done === required
  if (perfect) xp += PERFECT_DAY_BONUS
  return { required, done, ratio: required ? done / required : 0, perfect, xp }
}

function earliestDay(state: AppState): string {
  const keys = [...Object.keys(state.completions), ...state.habits.map((h) => h.createdAt)]
  return keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : todayKey()
}

export interface Totals {
  xp: number
  completions: number
  perfectDays: number
  perfectWeeks: number
  weeklyTargetsHit: number
}

export function totals(state: AppState, today = todayKey()): Totals {
  const days = range(earliestDay(state), today)
  let xp = 0
  let completions = 0
  let perfectDays = 0
  for (const d of days) {
    const s = dayScore(state, d)
    xp += s.xp
    completions += (state.completions[d] ?? []).length
    if (s.perfect) perfectDays++
  }
  // Weekly target bonuses (completed weeks + current week once hit)
  let weeklyTargetsHit = 0
  for (const h of state.habits) {
    if (h.frequency.type !== 'perWeek') continue
    let w = weekStart(h.createdAt)
    const last = weekStart(today)
    while (w <= last) {
      if (weekCount(state, h.id, w) >= h.frequency.target) weeklyTargetsHit++
      w = addDays(w, 7)
    }
  }
  xp += weeklyTargetsHit * WEEKLY_TARGET_BONUS
  // Perfect weeks: every day of a finished week was perfect (or had nothing required)
  let perfectWeeks = 0
  let w = weekStart(earliestDay(state))
  while (weekEnd(w) < today) {
    const ds = range(w, weekEnd(w)).map((d) => dayScore(state, d))
    if (ds.some((s) => s.required > 0) && ds.every((s) => s.required === 0 || s.perfect)) perfectWeeks++
    w = addDays(w, 7)
  }
  return { xp, completions, perfectDays, perfectWeeks, weeklyTargetsHit }
}

/* ---------- Levels ---------- */

export interface LevelInfo {
  level: number
  title: string
  /** XP earned inside the current level */
  into: number
  /** XP needed to finish the current level */
  need: number
}

const TITLES: [number, string][] = [
  [1, 'Rookie'],
  [3, 'Committed'],
  [6, 'Consistent'],
  [10, 'Disciplined'],
  [15, 'Relentless'],
  [20, 'Elite'],
  [30, 'Legend'],
]

export function xpToFinishLevel(level: number): number {
  return 100 + (level - 1) * 60
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  let rest = xp
  while (rest >= xpToFinishLevel(level)) {
    rest -= xpToFinishLevel(level)
    level++
  }
  const title = TITLES.filter(([min]) => level >= min).at(-1)![1]
  return { level, title, into: rest, need: xpToFinishLevel(level) }
}

/* ---------- Achievements ---------- */

export interface Achievement {
  id: string
  name: string
  emoji: string
  description: string
  earned: boolean
}

export function achievements(state: AppState, today = todayKey()): Achievement[] {
  const t = totals(state, today)
  const streaks = state.habits.filter((h) => !h.archived).map((h) => streak(state, h, today))
  const bestDay = Math.max(0, ...streaks.filter((s) => s.unit === 'day').map((s) => s.best))
  const bestWeek = Math.max(0, ...streaks.filter((s) => s.unit === 'week').map((s) => s.best))
  const lvl = levelInfo(t.xp).level
  // Comeback: a day completed right after a missed scheduled day
  const comeback = state.habits.some((h) => {
    if (h.frequency.type === 'perWeek') return false
    const days = range(h.createdAt, today).filter((d) => isScheduled(h, d) && !isSkipped(state, h.id, d))
    for (let i = 1; i < days.length; i++) {
      if (!isCompleted(state, h.id, days[i - 1]) && isCompleted(state, h.id, days[i])) return true
    }
    return false
  })
  const def = (id: string, name: string, emoji: string, description: string, earned: boolean): Achievement => ({
    id,
    name,
    emoji,
    description,
    earned,
  })
  return [
    def('first', 'First rep', '✅', 'Complete your first habit', t.completions >= 1),
    def('perfect1', 'Clean sheet', '🌟', 'Finish a perfect day', t.perfectDays >= 1),
    def('comeback', 'Comeback', '💪', 'Miss a day, then show up the next', comeback),
    def('streak7', 'One week strong', '🔥', '7-day streak on any habit', bestDay >= 7),
    def('week1', 'Perfect week', '🏆', 'Every habit, every day, for a full week', t.perfectWeeks >= 1),
    def('target4', 'Weekly warrior', '🥊', 'Hit a weekly target 4 weeks in a row', bestWeek >= 4),
    def('streak30', 'Thirty', '🚀', '30-day streak on any habit', bestDay >= 30),
    def('reps100', 'Century', '💯', '100 total completions', t.completions >= 100),
    def('perfect30', 'Thirty perfect days', '👑', '30 perfect days in total', t.perfectDays >= 30),
    def('level10', 'Disciplined', '🧠', 'Reach level 10', lvl >= 10),
    def('streak100', 'Unbreakable', '💎', '100-day streak on any habit', bestDay >= 100),
    def('level20', 'Elite', '🏅', 'Reach level 20', lvl >= 20),
  ]
}

/* ---------- Review helpers ---------- */

export interface HabitWeekSummary {
  habit: Habit
  done: number
  target: number
  rate: number
}

export function weekSummary(state: AppState, anyDayInWeek: string, today = todayKey()): HabitWeekSummary[] {
  const start = weekStart(anyDayInWeek)
  const end = weekEnd(anyDayInWeek)
  const upto = end < today ? end : today
  return state.habits
    .filter((h) => !h.archived)
    .map((habit) => {
      const days = range(start, upto)
      let done = 0
      let target = 0
      if (habit.frequency.type === 'perWeek') {
        target = habit.frequency.target
        done = Math.min(target, weekCount(state, habit.id, start))
      } else {
        for (const d of days) {
          if (isScheduled(habit, d) && (isCompleted(state, habit.id, d) || !isSkipped(state, habit.id, d))) {
            target++
            if (isCompleted(state, habit.id, d)) done++
          }
        }
      }
      return { habit, done, target, rate: target ? done / target : 0 }
    })
}

/** Plain-spoken coach line, computed from the data, no fluff. */
export function coachLine(state: AppState, today = todayKey()): string {
  const s = dayScore(state, today)
  const active = state.habits.filter((h) => !h.archived)
  if (active.length === 0) return 'Add your first habit. Start with one you can do even on a bad day.'
  const risky = active.map((h) => ({ h, st: streak(state, h, today) })).filter((x) => x.st.atRisk)
  if (risky.length) {
    const names = risky.map((x) => x.h.name).join(', ')
    return `Never miss twice. ${names}: you missed last time, so today is the one that counts.`
  }
  if (s.required === 0) return 'Nothing is required today. Rest is part of the program.'
  if (s.perfect) return 'Perfect day. That is what a professional looks like.'
  const left = s.required - s.done
  if (s.done === 0) return `${s.required} to do today. Knock out the easiest one first to build momentum.`
  return `${left} left. Finish the day, not just the easy half.`
}

/* ---------- Insights & adaptive suggestions ---------- */

/** Scheduled (non-rest) days for a habit in [from, to], excluding an unfinished `today`. */
function scheduledDays(state: AppState, habit: Habit, from: string, to: string, today: string): string[] {
  return range(from < habit.createdAt ? habit.createdAt : from, to).filter((d) => {
    if (habit.frequency.type === 'perWeek' || !isScheduled(habit, d)) return false
    if (isCompleted(state, habit.id, d)) return true
    if (isSkipped(state, habit.id, d)) return false
    return d < today // today isn't a miss yet
  })
}

export interface HabitInsight {
  habit: Habit
  /** Completion rate over the last 28 days of scheduled days, or null if too little data. */
  rate: number | null
  /** The weekday you most often miss this habit (needs enough history and a clear gap). */
  weakestWeekday: { day: number; rate: number } | null
  /** When you usually tick it off, from recorded completion times (needs >= 3). */
  usualTime: TimeOfDay | null
  /** Average minutes spent when timed, and how many sessions that is based on. */
  avgMinutes: { value: number; sessions: number } | null
}

export function habitInsights(state: AppState, today = todayKey()): HabitInsight[] {
  return state.habits
    .filter((h) => !h.archived)
    .map((habit) => {
      const days = scheduledDays(state, habit, addDays(today, -27), today, today)
      let rate: number | null = null
      let weakestWeekday: HabitInsight['weakestWeekday'] = null
      if (habit.frequency.type === 'perWeek') {
        // Weekly habits: rate = share of the last 4 finished-or-current weeks that hit target.
        const weeks = [0, 1, 2, 3].map((i) => addDays(weekStart(today), -7 * i)).filter((w) => w >= weekStart(habit.createdAt))
        if (weeks.length >= 2) {
          const hit = weeks.filter((w) => weekCount(state, habit.id, w) >= (habit.frequency as { target: number }).target).length
          rate = hit / weeks.length
        }
      } else if (days.length >= 5) {
        rate = days.filter((d) => isCompleted(state, habit.id, d)).length / days.length
        const by: Record<number, { n: number; done: number }> = {}
        for (const d of days) {
          const wd = weekday(d)
          by[wd] ??= { n: 0, done: 0 }
          by[wd].n++
          if (isCompleted(state, habit.id, d)) by[wd].done++
        }
        const worst = Object.entries(by)
          .filter(([, v]) => v.n >= 3)
          .map(([k, v]) => ({ day: Number(k), rate: v.done / v.n }))
          .sort((a, b) => a.rate - b.rate)[0]
        if (worst && worst.rate <= 0.5 && rate - worst.rate >= 0.3) weakestWeekday = worst
      }

      const logs = Object.values(state.logs).map((day) => day[habit.id]).filter(Boolean)
      const times = logs.map((l) => l.at).filter((t): t is string => !!t)
      let usualTime: TimeOfDay | null = null
      if (times.length >= 3) {
        const counts: Partial<Record<TimeOfDay, number>> = {}
        for (const t of times) {
          const b = timeOfDayFor(t)
          counts[b] = (counts[b] ?? 0) + 1
        }
        const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1])
        usualTime = top[0] as TimeOfDay
      }
      const mins = logs.map((l) => l.minutes).filter((m): m is number => typeof m === 'number')
      const avgMinutes = mins.length ? { value: Math.round(mins.reduce((a, b) => a + b, 0) / mins.length), sessions: mins.length } : null
      return { habit, rate, weakestWeekday, usualTime, avgMinutes }
    })
}

export interface Suggestion {
  habitId: string
  kind: 'scale-back' | 'tiny-version' | 'level-up'
  message: string
  /** Applying it is a one-tap edit. Absent when the advice is behavioural. */
  patch?: Partial<Habit>
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)

/**
 * Rule-based coaching: ease off when a habit keeps getting missed, push when it is easy.
 * Deliberately conservative: it needs a couple of weeks of history before saying anything.
 */
export function suggestions(state: AppState, today = todayKey()): Suggestion[] {
  const out: Suggestion[] = []
  for (const habit of state.habits) {
    if (habit.archived) continue
    const age = daysBetween(habit.createdAt, today)
    if (age < 7) continue

    if (habit.frequency.type === 'perWeek') {
      const target = habit.frequency.target
      const weeks = [1, 2, 3].map((i) => addDays(weekStart(today), -7 * i)).filter((w) => w >= weekStart(habit.createdAt))
      if (weeks.length < 2) continue
      const counts = weeks.map((w) => weekCount(state, habit.id, w))
      const missed = counts.filter((c) => c < target).length
      if (missed >= 2 && target > 1) {
        out.push({
          habitId: habit.id,
          kind: 'scale-back',
          message: `${habit.name}: you hit ${target}× in only ${weeks.length - missed} of the last ${weeks.length} weeks. Drop to ${target - 1}× and rebuild; raising it later is easy.`,
          patch: { frequency: { type: 'perWeek', target: target - 1 } },
        })
      } else if (missed === 0 && target < 6 && weeks.length >= 3) {
        out.push({
          habitId: habit.id,
          kind: 'level-up',
          message: `${habit.name}: ${target}× a week for ${weeks.length} weeks straight. Ready for ${target + 1}×?`,
          patch: { frequency: { type: 'perWeek', target: target + 1 } },
        })
      }
      continue
    }

    const days = scheduledDays(state, habit, addDays(today, -13), today, today)
    if (days.length < 5) continue
    const done = days.filter((d) => isCompleted(state, habit.id, d)).length
    const rate = done / days.length
    if (rate < 0.5) {
      if (habit.durationMin && habit.durationMin > 10) {
        const shorter = roundTo5(habit.durationMin / 2)
        out.push({
          habitId: habit.id,
          kind: 'scale-back',
          message: `${habit.name}: done ${done} of the last ${days.length}. Shrink it from ${habit.durationMin} to ${shorter} min until it sticks.`,
          patch: { durationMin: shorter },
        })
      } else {
        out.push({
          habitId: habit.id,
          kind: 'tiny-version',
          message: `${habit.name}: done ${done} of the last ${days.length}. Make the smallest version (2 minutes) your standard and do it right after your cue.`,
        })
      }
    } else if (rate >= 0.9 && days.length >= 12 && streak(state, habit, today).current >= 14) {
      out.push(
        habit.durationMin
          ? {
              habitId: habit.id,
              kind: 'level-up',
              message: `${habit.name}: ${done}/${days.length} lately. Add 5 minutes (${habit.durationMin} → ${habit.durationMin + 5}).`,
              patch: { durationMin: habit.durationMin + 5 },
            }
          : {
              habitId: habit.id,
              kind: 'level-up',
              message: `${habit.name}: ${done}/${days.length} lately and a ${streak(state, habit, today).current}-day streak. Consider raising the bar or adding a stretch version.`,
            },
      )
    }
  }
  return out
}
