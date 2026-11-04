import { useEffect, useRef } from 'react'
import type { AppState } from '../types'
import { dueCheckin, dueHabitReminders, markSent, notify, permission, wasSent } from './notify'

/**
 * Fires start-time reminders and the daily check-in while the app is running
 * (foreground, or backgrounded but alive). A fully closed web app cannot be woken
 * without a push server, so this is best-effort by design.
 */
export function useReminders(state: AppState): void {
  const ref = useRef(state)
  useEffect(() => {
    ref.current = state
  }, [state])

  useEffect(() => {
    const tick = () => {
      if (permission() !== 'granted') return
      const s = ref.current
      const now = new Date()
      if (s.settings.habitReminders) {
        for (const r of dueHabitReminders(s, now, wasSent)) {
          markSent(r.key)
          void notify(r.title, r.body, r.key)
        }
      }
      if (s.settings.reminderTime) {
        const c = dueCheckin(s, now, s.settings.reminderTime, wasSent)
        if (c) {
          markSent(c.key)
          void notify(c.title, c.body, c.key)
        }
      }
    }
    tick()
    const id = window.setInterval(tick, 15_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
}
