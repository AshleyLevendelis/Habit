import { useEffect, useRef, useState } from 'react'
import { useAppState } from './store'
import { TodayView } from './components/TodayView'
import { ProgressView } from './components/ProgressView'
import { HabitsView } from './components/HabitsView'
import { SettingsView } from './components/SettingsView'
import { TimerBar } from './components/TimerBar'
import type { Habit } from './types'
import { backupDue, backupNow, requestPersistence, snoozeBackup } from './lib/backup'
import { markSent, notify, requestPermission, wasSent } from './lib/notify'
import { useReminders } from './lib/useReminders'
import { elapsedMinutes, isFinished, loadTimer, saveTimer, startTimer, type ActiveTimer } from './lib/timer'

type Tab = 'today' | 'progress' | 'habits' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'habits', label: 'Habits', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function App() {
  const [state, dispatch] = useAppState()
  const [tab, setTab] = useState<Tab>('today')
  const [toast, setToast] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [timer, setTimer] = useState<ActiveTimer | null>(loadTimer)
  const [, setBackupTick] = useState(0)
  const timerAlerted = useRef<number | null>(null)

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

  // Start-time reminders and the daily check-in.
  useReminders(state)

  // Ask the browser to keep our data when storage is tight.
  useEffect(() => {
    void requestPersistence()
  }, [])

  // Timer: persist it, and alert once when it runs out.
  useEffect(() => saveTimer(timer), [timer])
  useEffect(() => {
    if (!timer) return
    const check = () => {
      if (!isFinished(timer)) return
      const key = `timer:${timer.startedAt}`
      if (timerAlerted.current === timer.startedAt || wasSent(key)) return
      timerAlerted.current = timer.startedAt
      markSent(key)
      const habit = state.habits.find((h) => h.id === timer.habitId)
      void notify(`${habit?.emoji ?? '⏱️'} Time's up`, habit ? `${habit.name}: ${timer.plannedMin} min done.` : 'Timer finished.', key)
      navigator.vibrate?.([200, 100, 200])
    }
    check()
    const id = window.setInterval(check, 1000)
    return () => window.clearInterval(id)
  }, [timer, state.habits])

  function onStartTimer(h: Habit, day: string) {
    if (!h.durationMin) return
    if (timer) return showToast('Finish the current timer first')
    void requestPermission() // so "time's up" can reach you if the app is in the background
    setTimer(startTimer(h.id, day, h.durationMin))
  }

  function finishTimer() {
    if (!timer) return
    const done = (state.completions[timer.day] ?? []).includes(timer.habitId)
    if (!done) {
      dispatch({
        type: 'toggle',
        habitId: timer.habitId,
        day: timer.day,
        log: { at: nowHHMM(), minutes: elapsedMinutes(timer) },
      })
      showToast(`Logged ${elapsedMinutes(timer)} min`)
    }
    setTimer(null)
  }

  const showBackup = backupDue(state) && tab !== 'settings'
  async function doBackup() {
    if (await backupNow(state)) {
      dispatch({ type: 'settings', settings: { lastBackup: new Date().toISOString() } })
      showToast('Backup saved')
    }
  }

  return (
    <>
      {showBackup && (
        <aside className="banner" aria-label="Backup reminder">
          <span>💾 Your data lives only on this device. Back it up?</span>
          <span className="row" style={{ gap: 6 }}>
            <button className="btn sm primary" onClick={doBackup}>Back up</button>
            <button
              className="btn sm"
              onClick={() => {
                snoozeBackup()
                setBackupTick((n) => n + 1)
              }}
            >
              Later
            </button>
          </span>
        </aside>
      )}

      <main>
        {tab === 'today' && (
          <TodayView state={state} dispatch={dispatch} onToast={showToast} timer={timer} onStartTimer={onStartTimer} />
        )}
        {tab === 'progress' && <ProgressView state={state} dispatch={dispatch} />}
        {tab === 'habits' && <HabitsView state={state} dispatch={dispatch} />}
        {tab === 'settings' && <SettingsView state={state} dispatch={dispatch} onToast={showToast} />}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}

      {timer && (
        <aside aria-label="Active timer">
          <TimerBar
            timer={timer}
            habit={state.habits.find((h) => h.id === timer.habitId)}
            onDone={finishTimer}
            onCancel={() => setTimer(null)}
          />
        </aside>
      )}

      <nav className="tabs" aria-label="Main">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'on' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <span className="i" aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
