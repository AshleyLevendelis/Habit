import type { AppState, Habit } from '../types'
import { dueStatus } from '../lib/engine'
import { findOverlaps, layoutTimeline, MIN_BLOCK_MIN } from '../lib/timeline'
import { formatEnd, formatTime, parseTime } from '../lib/time'
import { HabitCard } from './HabitCard'

const PX_PER_HOUR = 80

interface Props {
  state: AppState
  habits: Habit[]
  day: string
  isToday: boolean
  now: Date
  onToggle: (h: Habit) => void
}

export function Timeline({ state, habits, day, isToday, now, onToggle }: Props) {
  const timed = habits.filter((h) => parseTime(h.startTime) !== null)
  const untimed = habits.filter((h) => parseTime(h.startTime) === null)

  const items = timed.map((h) => {
    const start = parseTime(h.startTime)!
    return { id: h.id, start, end: Math.min(1440, start + (h.durationMin ?? 0)) }
  })
  const byId = new Map(habits.map((h) => [h.id, h]))
  const overlaps = findOverlaps(items)
  const clashing = new Set(overlaps.flat())
  const placed = layoutTimeline(items)

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const firstHour = Math.min(6, ...items.map((i) => Math.floor(i.start / 60)), isToday ? Math.floor(nowMin / 60) : 6)
  const lastHour = Math.min(24, Math.max(22, ...items.map((i) => Math.ceil(Math.max(i.end, i.start + MIN_BLOCK_MIN) / 60))))
  const top = (min: number) => ((min - firstHour * 60) / 60) * PX_PER_HOUR
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)

  return (
    <div className="stack">
      {timed.length === 0 && (
        <div className="empty">Give a habit a start time (Habits tab → edit) and it shows up on your day here.</div>
      )}

      {overlaps.length > 0 && (
        <div className="card warnbox" role="alert">
          <b>⚠️ Schedule clash</b>
          {overlaps.map(([a, b]) => {
            const x = byId.get(a)!
            const y = byId.get(b)!
            return (
              <div key={a + b} className="small">
                {x.emoji} {x.name} ({formatTime(x.startTime!)}) overlaps {y.emoji} {y.name} ({formatTime(y.startTime!)})
              </div>
            )
          })}
        </div>
      )}

      {timed.length > 0 && (
        <div className="timeline" style={{ height: hours.length * PX_PER_HOUR }}>
          {hours.map((h) => (
            <div key={h} className="hour" style={{ top: top(h * 60) }}>
              <span>{formatTime(`${h % 24}:00`)}</span>
            </div>
          ))}
          {isToday && nowMin >= firstHour * 60 && nowMin <= lastHour * 60 && (
            <div className="nowline" style={{ top: top(nowMin) }} aria-hidden />
          )}
          {placed.map((p) => {
            const h = byId.get(p.id)!
            const status = dueStatus(state, h, day)
            const height = Math.max(MIN_BLOCK_MIN, p.end - p.start) * (PX_PER_HOUR / 60)
            const done = status === 'done'
            return (
              <div
                key={p.id}
                className={`block ${done ? 'done' : ''} ${status === 'skipped' ? 'resting' : ''} ${clashing.has(p.id) ? 'clash' : ''}`}
                style={{
                  top: top(p.start),
                  height: height - 2,
                  left: `calc(52px + (100% - 56px) * ${p.col / p.cols})`,
                  width: `calc((100% - 56px) / ${p.cols} - 4px)`,
                }}
              >
                <div className="bt">
                  <span aria-hidden>{h.emoji}</span> <b>{h.name}</b>
                </div>
                <div className="bs">
                  {formatTime(h.startTime!)}
                  {h.durationMin && p.cols === 1 ? ` – ${formatEnd(h.startTime!, h.durationMin)}` : h.durationMin ? ` · ${h.durationMin}m` : ''}
                </div>
                <button
                  className={`check sm ${done ? 'on' : ''}`}
                  onClick={() => onToggle(h)}
                  aria-pressed={done}
                  aria-label={`${done ? 'Undo' : 'Complete'} ${h.name}`}
                >
                  {done ? '✓' : ''}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {untimed.length > 0 && timed.length > 0 && (
        <>
          <div className="section">No set time</div>
          <div className="stack">
            {untimed.map((h) => (
              <HabitCard key={h.id} state={state} habit={h} day={day} onToggle={() => onToggle(h)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
