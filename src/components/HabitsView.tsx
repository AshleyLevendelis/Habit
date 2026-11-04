import { useState } from 'react'
import type { AppState, Habit } from '../types'
import type { Action } from '../store'
import { WEEKDAY_NAMES } from '../lib/dates'
import { HabitForm } from './HabitForm'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
}

function describe(h: Habit): string {
  const f = h.frequency
  if (f.type === 'daily') return 'Every day'
  if (f.type === 'perWeek') return `${f.target}× per week`
  if (f.days.length === 7) return 'Every day'
  if ([1, 2, 3, 4, 5].every((d) => f.days.includes(d)) && f.days.length === 5) return 'Weekdays'
  return f.days.map((d) => WEEKDAY_NAMES[d]).join(' ')
}

export function HabitsView({ state, dispatch }: Props) {
  const [editing, setEditing] = useState<Habit | null>(null)
  const [adding, setAdding] = useState(false)
  const active = state.habits.filter((h) => !h.archived)
  const archived = state.habits.filter((h) => h.archived)

  function move(h: Habit, dir: -1 | 1) {
    const ids = active.map((x) => x.id)
    const i = ids.indexOf(h.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    dispatch({ type: 'reorder', habitIds: ids })
  }

  function remove(h: Habit) {
    if (confirm(`Delete "${h.name}" and all its history? Archive instead if you want to keep the data.`)) {
      dispatch({ type: 'deleteHabit', habitId: h.id })
    }
  }

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div className="date">Habits</div>
          <h1>{active.length} active</h1>
        </div>
      </div>

      <div className="stack">
        {active.map((h, i) => (
          <div key={h.id} className="card list-item">
            <div className="emoji">{h.emoji}</div>
            <div>
              <b>{h.name}</b>
              <div className="muted small">{describe(h)} · {h.timeOfDay} · {h.difficulty}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" onClick={() => move(h, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="icon-btn" onClick={() => move(h, 1)} disabled={i === active.length - 1} aria-label="Move down">↓</button>
              <button className="icon-btn" onClick={() => setEditing(h)} aria-label="Edit">✎</button>
            </div>
          </div>
        ))}
        {active.length === 0 && <div className="empty">No habits yet. Tap + to add one.</div>}
      </div>

      {archived.length > 0 && (
        <>
          <div className="section">Archived</div>
          <div className="stack">
            {archived.map((h) => (
              <div key={h.id} className="card list-item" style={{ opacity: 0.7 }}>
                <div className="emoji">{h.emoji}</div>
                <div><b>{h.name}</b><div className="muted small">{describe(h)}</div></div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => dispatch({ type: 'archiveHabit', habitId: h.id, archived: false })}>Restore</button>
                  <button className="btn sm danger" onClick={() => remove(h)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="muted small" style={{ marginTop: 18 }}>
        Tip: keep it to 5–8 habits. More than that and the list becomes the thing you avoid.
      </p>

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add habit">+</button>

      {adding && (
        <HabitForm
          onSave={(h) => {
            dispatch({ type: 'addHabit', habit: h })
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <HabitForm
          initial={editing}
          onSave={(h) => {
            dispatch({ type: 'updateHabit', habit: { ...editing, ...h } })
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {editing && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 21, pointerEvents: 'none' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 12px', pointerEvents: 'auto', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn sm" onClick={() => { dispatch({ type: 'archiveHabit', habitId: editing.id, archived: true }); setEditing(null) }}>Archive</button>
            <button className="btn sm danger" onClick={() => { remove(editing); setEditing(null) }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
