import { useEffect, useState } from 'react'
import type { AppState, Habit, TimeOfDay } from '../types'
import type { Action } from '../store'
import { coachLine, dayScore, dueStatus, levelInfo, totals } from '../lib/engine'
import { addDays, formatLong, todayKey } from '../lib/dates'
import { parseTime } from '../lib/time'
import { ProgressRing } from './ProgressRing'
import { HabitCard } from './HabitCard'
import { Timeline } from './Timeline'
import type { ActiveTimer } from '../lib/timer'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  onToast: (msg: string) => void
  timer: ActiveTimer | null
  onStartTimer: (h: Habit, day: string) => void
}

const ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime']
const LABEL: Record<TimeOfDay, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' }

/** Timed habits first in chronological order; untimed keep their list order (stable sort). */
function byStart(a: Habit, b: Habit): number {
  const x = parseTime(a.startTime)
  const y = parseTime(b.startTime)
  if (x === null && y === null) return 0
  if (x === null) return 1
  if (y === null) return -1
  return x - y
}

type Mode = 'list' | 'timeline'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function loadMode(): Mode {
  try {
    return localStorage.getItem('habit-today-mode') === 'timeline' ? 'timeline' : 'list'
  } catch {
    return 'list'
  }
}

export function TodayView({ state, dispatch, onToast, timer, onStartTimer }: Props) {
  const today = todayKey()
  const [day, setDay] = useState(today)
  const [mode, setMode] = useState<Mode>(loadMode)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  function pickMode(m: Mode) {
    setMode(m)
    try {
      localStorage.setItem('habit-today-mode', m)
    } catch {
      /* ignore */
    }
  }
  const score = dayScore(state, day)
  const t = totals(state, today)
  const lvl = levelInfo(t.xp)
  const isToday = day === today

  const visible = state.habits.filter(
    (h) => !h.archived && day >= h.createdAt && (h.frequency.type === 'perWeek' || dueStatus(state, h, day) !== 'off'),
  )
  const groups = ORDER.map((tod) => ({ tod, habits: visible.filter((h) => h.timeOfDay === tod).sort(byStart) })).filter((g) => g.habits.length)

  function toggle(h: Habit) {
    const wasDone = dueStatus(state, h, day) === 'done'
    // Remember when you actually did it (only meaningful for today, not backfill).
    const log = !wasDone && isToday ? { at: nowHHMM() } : undefined
    dispatch({ type: 'toggle', habitId: h.id, day, log })
    if (!wasDone) {
      const after = dayScore({ ...state, completions: { ...state.completions, [day]: [...(state.completions[day] ?? []), h.id] } }, day)
      if (after.perfect) onToast('🌟 Perfect day! +30 bonus XP')
      else if (after.required - after.done === 1) onToast('One more to a perfect day')
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div className="date">{isToday ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : 'Backfill'}</div>
          <h1>{formatLong(day)}</h1>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">‹</button>
          <button className="icon-btn" onClick={() => setDay(addDays(day, 1))} disabled={isToday} aria-label="Next day">›</button>
        </div>
      </div>

      <div className="card hero">
        <ProgressRing ratio={score.ratio} label={`${score.done}/${score.required}`} sub={score.perfect ? 'perfect' : 'done'} />
        <div>
          <div className="spread">
            <b>Level {lvl.level} · {lvl.title}</b>
            <span className="muted small">{lvl.into}/{lvl.need} xp</span>
          </div>
          <div className="levelbar"><div style={{ width: `${(lvl.into / lvl.need) * 100}%` }} /></div>
          <p className="coach" style={{ margin: '10px 0 0' }}>{coachLine(state, day)}</p>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Today layout" style={{ marginTop: 14 }}>
        <button className={mode === 'list' ? 'on' : ''} aria-pressed={mode === 'list'} onClick={() => pickMode('list')}>List</button>
        <button className={mode === 'timeline' ? 'on' : ''} aria-pressed={mode === 'timeline'} onClick={() => pickMode('timeline')}>Timeline</button>
      </div>

      {visible.length === 0 && <div className="empty">Nothing scheduled. Add habits in the Habits tab.</div>}

      {mode === 'timeline' && visible.length > 0 && (
        <Timeline state={state} habits={visible} day={day} isToday={isToday} now={now} onToggle={toggle} />
      )}

      {mode === 'list' &&
        groups.map((g) => (
          <div key={g.tod}>
            <div className="section">{LABEL[g.tod]}</div>
            <div className="stack">
              {g.habits.map((h) => (
                <HabitCard
                  key={h.id}
                  state={state}
                  habit={h}
                  day={day}
                  onToggle={() => toggle(h)}
                  onStartTimer={isToday ? () => onStartTimer(h, day) : undefined}
                  timerRunning={timer?.habitId === h.id}
                  onSkip={(skipped) => dispatch({ type: 'skip', habitId: h.id, day, skipped })}
                />
              ))}
            </div>
          </div>
        ))}

      <div className="section">End of day</div>
      <textarea
        className="input"
        placeholder="One line: what went well, what got in the way?"
        value={state.notes[day] ?? ''}
        onChange={(e) => dispatch({ type: 'note', day, text: e.target.value })}
      />
    </div>
  )
}
