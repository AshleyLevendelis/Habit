import { useState } from 'react'
import type { AppState, Habit, TimeOfDay } from '../types'
import type { Action } from '../store'
import { coachLine, dayScore, dueStatus, levelInfo, totals } from '../lib/engine'
import { addDays, formatLong, todayKey } from '../lib/dates'
import { ProgressRing } from './ProgressRing'
import { HabitCard } from './HabitCard'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  onToast: (msg: string) => void
}

const ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime']
const LABEL: Record<TimeOfDay, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' }

export function TodayView({ state, dispatch, onToast }: Props) {
  const today = todayKey()
  const [day, setDay] = useState(today)
  const score = dayScore(state, day)
  const t = totals(state, today)
  const lvl = levelInfo(t.xp)
  const isToday = day === today

  const visible = state.habits.filter(
    (h) => !h.archived && day >= h.createdAt && (h.frequency.type === 'perWeek' || dueStatus(state, h, day) !== 'off'),
  )
  const groups = ORDER.map((tod) => ({ tod, habits: visible.filter((h) => h.timeOfDay === tod) })).filter((g) => g.habits.length)

  function toggle(h: Habit) {
    const wasDone = dueStatus(state, h, day) === 'done'
    dispatch({ type: 'toggle', habitId: h.id, day })
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

      {groups.length === 0 && <div className="empty">Nothing scheduled. Add habits in the Habits tab.</div>}

      {groups.map((g) => (
        <div key={g.tod}>
          <div className="section">{LABEL[g.tod]}</div>
          <div className="stack">
            {g.habits.map((h) => (
              <HabitCard key={h.id} state={state} habit={h} day={day} onToggle={() => toggle(h)} />
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
