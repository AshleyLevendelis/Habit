import type { TimeOfDay } from '../types'

/** "07:30" -> minutes since midnight, or null if invalid. */
export function parseTime(t: string | undefined): number | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** "07:30" -> "7:30 AM" */
export function formatTime(t: string): string {
  const mins = parseTime(t)
  if (mins === null) return t
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** 75 -> "1h 15m", 30 -> "30 min" */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** "07:30" + 45 -> "8:15 AM" (wraps past midnight). */
export function formatEnd(start: string, durationMin: number): string {
  const s = parseTime(start)
  if (s === null) return ''
  const e = (s + durationMin) % 1440
  return formatTime(`${Math.floor(e / 60)}:${String(e % 60).padStart(2, '0')}`)
}

/** Label like "7:30 AM · 30 min" or "7:30 – 8:00 AM"-style pieces; empty if neither set. */
export function scheduleLabel(startTime?: string, durationMin?: number): string {
  const parts: string[] = []
  if (startTime && parseTime(startTime) !== null) parts.push(formatTime(startTime))
  if (durationMin) parts.push(formatDuration(durationMin))
  return parts.join(' · ')
}

export function timeOfDayFor(t: string): TimeOfDay {
  const mins = parseTime(t)
  if (mins === null) return 'anytime'
  if (mins < 12 * 60) return 'morning'
  if (mins < 17 * 60) return 'afternoon'
  return 'evening'
}
