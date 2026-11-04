import { useEffect, useState } from 'react'
import type { Habit } from '../types'
import { formatClock, isFinished, remainingMs, type ActiveTimer } from '../lib/timer'

interface Props {
  timer: ActiveTimer
  habit: Habit | undefined
  onDone: () => void
  onCancel: () => void
}

export function TimerBar({ timer, habit, onDone, onCancel }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const finished = isFinished(timer, now)
  const total = timer.endsAt - timer.startedAt
  const pct = Math.min(100, ((now - timer.startedAt) / total) * 100)

  return (
    <div className={`timerbar ${finished ? 'finished' : ''}`} role="timer" aria-live="off">
      <div className="tb-top">
        <span aria-hidden>{habit?.emoji ?? '⏱️'}</span>
        <b className="tb-name">{habit?.name ?? 'Timer'}</b>
        <span className="tb-clock" aria-label={finished ? "Time's up" : `${formatClock(remainingMs(timer, now))} left`}>
          {finished ? "Time's up" : formatClock(remainingMs(timer, now))}
        </span>
      </div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn sm primary" onClick={onDone}>{finished ? '✓ Mark done' : 'Finish now'}</button>
        <button className="btn sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
