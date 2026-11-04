export interface ActiveTimer {
  habitId: string
  day: string
  startedAt: number // epoch ms
  endsAt: number
  plannedMin: number
}

const KEY = 'habit-active-timer'

export function startTimer(habitId: string, day: string, plannedMin: number, now = Date.now()): ActiveTimer {
  return { habitId, day, startedAt: now, endsAt: now + plannedMin * 60_000, plannedMin }
}

export function remainingMs(t: ActiveTimer, now = Date.now()): number {
  return Math.max(0, t.endsAt - now)
}

export function isFinished(t: ActiveTimer, now = Date.now()): boolean {
  return now >= t.endsAt
}

/** Whole minutes actually spent, at least 1, never more than planned (we only credit the plan). */
export function elapsedMinutes(t: ActiveTimer, now = Date.now()): number {
  const mins = Math.round((Math.min(now, t.endsAt) - t.startedAt) / 60_000)
  return Math.max(1, Math.min(t.plannedMin, mins))
}

/** 1500000 -> "25:00" */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export function loadTimer(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as ActiveTimer
    return typeof t.endsAt === 'number' && typeof t.habitId === 'string' ? t : null
  } catch {
    return null
  }
}

export function saveTimer(t: ActiveTimer | null): void {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: timer still works until reload */
  }
}
