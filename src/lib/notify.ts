import type { AppState, Habit } from '../types'
import { dayScore, dueStatus } from './engine'
import { toKey } from './dates'
import { formatTime, parseTime } from './time'

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export function permission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

/**
 * Prefer the service worker (works for installed PWAs, and is the only route on Android Chrome);
 * fall back to a page notification on desktop.
 */
export async function notify(title: string, body: string, tag: string): Promise<boolean> {
  if (permission() !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: '/pwa-192.png', badge: '/pwa-192.png' })
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body, tag, icon: '/pwa-192.png' })
    return true
  } catch {
    return false
  }
}

/* ---- de-duplication: each reminder fires at most once ---- */

const sentKey = (day: string, key: string) => `sent:${day}:${key}`

export function wasSent(key: string, now = new Date()): boolean {
  try {
    return localStorage.getItem(sentKey(toKey(now), key)) !== null
  } catch {
    return false
  }
}

/** Remember that `key` fired today, and forget markers from earlier days. */
export function markSent(key: string, now = new Date()): void {
  try {
    const today = toKey(now)
    localStorage.setItem(sentKey(today, key), '1')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith('sent:') && !k.startsWith(`sent:${today}:`)) localStorage.removeItem(k)
    }
  } catch {
    /* storage unavailable */
  }
}

/* ---- what is due right now (pure, so it can be tested) ---- */

export interface DueReminder {
  key: string
  habit: Habit
  title: string
  body: string
}

/** Don't announce a 7:00 habit at 3pm just because the app was opened late. */
export const REMINDER_GRACE_MIN = 10

export function dueHabitReminders(state: AppState, now: Date, sent: (key: string) => boolean = () => false): DueReminder[] {
  const day = toKey(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const out: DueReminder[] = []
  for (const habit of state.habits) {
    const start = parseTime(habit.startTime)
    if (start === null || !habit.startTime) continue
    if (nowMin < start || nowMin - start > REMINDER_GRACE_MIN) continue
    const status = dueStatus(state, habit, day)
    if (status !== 'must' && status !== 'optional') continue
    const key = `habit:${day}:${habit.id}:${habit.startTime}`
    if (sent(key)) continue
    out.push({
      key,
      habit,
      title: `${habit.emoji} ${habit.name}`,
      body: habit.durationMin ? `Starts now · ${habit.durationMin} min` : `Starts now (${formatTime(habit.startTime)})`,
    })
  }
  return out
}

/** The once-a-day check-in at `time` ("HH:MM"). Returns null if nothing to say or not time yet. */
export function dueCheckin(state: AppState, now: Date, time: string, sent: (key: string) => boolean = () => false): DueReminder | null {
  const at = parseTime(time)
  if (at === null) return null
  const day = toKey(now)
  if (now.getHours() * 60 + now.getMinutes() < at) return null
  const key = `checkin:${day}`
  if (sent(key)) return null
  const s = dayScore(state, day)
  const left = s.required - s.done
  if (left <= 0) return null
  return { key, habit: state.habits[0], title: 'Habit check-in', body: `${left} left today. Never miss twice.` }
}
