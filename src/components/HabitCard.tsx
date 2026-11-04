import type { AppState, Habit } from '../types'
import { dueStatus, isCompleted, MAX_SKIPS_PER_WEEK, skipsInWeek, streak, weekCount, XP_BY_DIFFICULTY } from '../lib/engine'
import { range, weekEnd, weekStart } from '../lib/dates'
import { formatDuration, formatTime, scheduleLabel } from '../lib/time'

interface Props {
  state: AppState
  habit: Habit
  day: string
  onToggle: () => void
  /** Only offered for today, when the habit has a duration and isn't done. */
  onStartTimer?: () => void
  timerRunning?: boolean
  onSkip?: (skipped: boolean) => void
}

export function HabitCard({ state, habit, day, onToggle, onStartTimer, timerRunning, onSkip }: Props) {
  const status = dueStatus(state, habit, day)
  const done = status === 'done'
  const resting = status === 'skipped'
  const st = streak(state, habit, day)
  const risk = !done && !resting && st.atRisk
  const schedule = scheduleLabel(habit.startTime, habit.durationMin)
  const log = state.logs[day]?.[habit.id]
  const skipsLeft = MAX_SKIPS_PER_WEEK - skipsInWeek(state.skips, habit.id, day)
  const canRest = !done && !resting && onSkip && habit.frequency.type !== 'perWeek' && skipsLeft > 0

  let freq: React.ReactNode = null
  if (habit.frequency.type === 'perWeek') {
    const count = weekCount(state, habit.id, day)
    const target = habit.frequency.target
    const dots = range(weekStart(day), weekEnd(day)).map((d) => isCompleted(state, habit.id, d))
    freq = (
      <>
        <span className={`pill ${count >= target ? 'good' : status === 'must' ? 'warn' : ''}`}>
          {count}/{target} this week
        </span>
        <span className="weekdots" aria-hidden>
          {dots.map((on, i) => (
            <i key={i} className={on ? 'on' : ''} />
          ))}
        </span>
      </>
    )
  }

  return (
    <div className={`habit ${done ? 'done' : ''} ${risk ? 'risk' : ''} ${resting ? 'resting' : ''}`}>
      <div className="emoji" aria-hidden>{habit.emoji}</div>
      <div>
        <div className="name">{habit.name}</div>
        <div className="meta">
          {schedule && <span className="pill"><span aria-hidden>⏰</span> {schedule}</span>}
          {st.current > 0 && (
            <span className={`pill ${st.current >= 7 ? 'hot' : ''}`}>
              <span aria-hidden>🔥</span> {st.current} {st.unit === 'week' ? 'wk' : 'day'}
              {st.current === 1 ? '' : 's'}
            </span>
          )}
          {risk && <span className="pill warn"><span aria-hidden>⚠️</span> Never miss twice</span>}
          {resting && <span className="pill">Rest day</span>}
          {freq}
          {status === 'optional' && <span className="pill">optional today</span>}
          <span className="pill">+{XP_BY_DIFFICULTY[habit.difficulty]} xp</span>
          {done && log && (log.at || log.minutes) && (
            <span className="pill good">
              ✓ {[log.at && formatTime(log.at), log.minutes && formatDuration(log.minutes)].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      <button
        className={`check ${done ? 'on' : ''}`}
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${done ? 'Undo' : 'Complete'} ${habit.name}`}
      >
        {done ? '✓' : ''}
      </button>
      {!done && !resting && (habit.cue || habit.why) && <div className="sub">{habit.cue ?? habit.why}</div>}
      {(onStartTimer && !done && !resting && habit.durationMin) || canRest || resting ? (
        <div className="actions">
          {onStartTimer && !done && !resting && habit.durationMin ? (
            <button className="btn sm" onClick={onStartTimer} disabled={timerRunning}>
              {timerRunning ? 'Timer running' : `▶ Start ${formatDuration(habit.durationMin)} timer`}
            </button>
          ) : null}
          {canRest && (
            <button className="btn sm" onClick={() => onSkip!(true)}>
              Rest day ({skipsLeft} left this week)
            </button>
          )}
          {resting && onSkip && (
            <button className="btn sm" onClick={() => onSkip(false)}>Undo rest day</button>
          )}
        </div>
      ) : null}
    </div>
  )
}
