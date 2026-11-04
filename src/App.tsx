import { useEffect, useState } from 'react'
import { useAppState } from './store'
import { TodayView } from './components/TodayView'
import { ProgressView } from './components/ProgressView'
import { HabitsView } from './components/HabitsView'
import { SettingsView } from './components/SettingsView'
import { dayScore } from './lib/engine'
import { todayKey } from './lib/dates'

type Tab = 'today' | 'progress' | 'habits' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'habits', label: 'Habits', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  const [state, dispatch] = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const [toast, setToast] = useState<string | null>(null)
  const [, setTick] = useState(0)

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  // Re-render when the date rolls over or the app comes back to the foreground.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const id = window.setInterval(bump, 60_000)
    document.addEventListener('visibilitychange', bump)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [])

  // Daily reminder: fire once per day at the chosen time while the app is open.
  useEffect(() => {
    const time = state.settings.reminderTime
    if (!time || typeof Notification === 'undefined') return
    const check = () => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const key = `reminded-${todayKey()}`
      if (hhmm >= time && !localStorage.getItem(key) && Notification.permission === 'granted') {
        const s = dayScore(state, todayKey())
        const left = s.required - s.done
        if (left > 0) new Notification('Habit check-in', { body: `${left} left today. Never miss twice.` })
        localStorage.setItem(key, '1')
      }
    }
    check()
    const id = window.setInterval(check, 30_000)
    return () => window.clearInterval(id)
  }, [state])

  return (
    <>
      {tab === 'today' && <TodayView state={state} dispatch={dispatch} onToast={showToast} />}
      {tab === 'progress' && <ProgressView state={state} />}
      {tab === 'habits' && <HabitsView state={state} dispatch={dispatch} />}
      {tab === 'settings' && <SettingsView state={state} dispatch={dispatch} onToast={showToast} />}

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabs">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              <span className="i">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
