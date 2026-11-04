import type { AppState, Habit } from '../types'
import { dueStatus, isCompleted, streak, weekCount, XP_BY_DIFFICULTY } from '../lib/engine'
import { range, weekEnd, weekStart } from '../lib/dates'
import { scheduleLabel } from '../lib/time'

interface Props {
  state: AppState
  habit: Habit
  day: string
  onToggle: () => void
}

export function HabitCard({ state, habit, day, onToggle }: Props) {
  const status = dueStatus(state, habit, day)
  const done = status === 'done'
  const st = streak(state, habit, day)
  const risk = !done && st.atRisk

  const schedule = scheduleLabel(habit.startTime, habit.durationMin)

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
    <div className={`habit ${done ? 'done' : ''} ${risk ? 'risk' : ''}`}>
      <div className="emoji">{habit.emoji}</div>
      <div>
        <div className="name">{habit.name}</div>
        <div className="meta">
          {schedule && <span className="pill">⏰ {schedule}</span>}
          {st.current > 0 && (
            <span className={`pill ${st.current >= 7 ? 'hot' : ''}`}>
              🔥 {st.current} {st.unit === 'week' ? 'wk' : 'day'}
              {st.current === 1 ? '' : 's'}
            </span>
          )}
          {risk && <span className="pill warn">⚠️ Never miss twice</span>}
          {freq}
          {status === 'optional' && <span className="pill">optional today</span>}
          <span className="pill">+{XP_BY_DIFFICULTY[habit.difficulty]} xp</span>
        </div>
      </div>
      <button className={`check ${done ? 'on' : ''}`} onClick={onToggle} aria-label={done ? 'Undo' : 'Complete'}>
        {done ? '✓' : ''}
      </button>
      {!done && (habit.cue || habit.why) && <div className="sub">{habit.cue ?? habit.why}</div>}
    </div>
  )
}
