import { useState } from 'react'
import type { Difficulty, Frequency, Habit, TimeOfDay } from '../types'
import { WEEKDAY_LABELS } from '../lib/dates'
import { formatEnd, parseTime, timeOfDayFor } from '../lib/time'

const DURATIONS = [5, 10, 15, 30, 45, 60, 90]

const EMOJIS = ['🌅', '🏋️', '🥊', '🍳', '🥗', '🏠', '📚', '🧘', '💧', '🛏️', '🚫', '💼', '🧹', '💊', '🚶', '🧠', '💰', '✍️']

interface Props {
  initial?: Habit
  onSave: (h: Omit<Habit, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

export function HabitForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '✅')
  const [why, setWhy] = useState(initial?.why ?? '')
  const [cue, setCue] = useState(initial?.cue ?? '')
  const [freqType, setFreqType] = useState<Frequency['type']>(initial?.frequency.type ?? 'daily')
  const [days, setDays] = useState<number[]>(
    initial?.frequency.type === 'weekdays' ? initial.frequency.days : [1, 2, 3, 4, 5],
  )
  const [target, setTarget] = useState(initial?.frequency.type === 'perWeek' ? initial.frequency.target : 3)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initial?.timeOfDay ?? 'anytime')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '')
  const [duration, setDuration] = useState<number | ''>(initial?.durationMin ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'medium')

  const valid = name.trim().length > 0 && (freqType !== 'weekdays' || days.length > 0)

  function submit() {
    const frequency: Frequency =
      freqType === 'daily'
        ? { type: 'daily' }
        : freqType === 'weekdays'
          ? { type: 'weekdays', days: [...days].sort() }
          : { type: 'perWeek', target: Math.min(7, Math.max(1, target)) }
    onSave({
      name: name.trim(),
      emoji,
      why: why.trim() || undefined,
      cue: cue.trim() || undefined,
      frequency,
      timeOfDay: parseTime(startTime) !== null ? timeOfDayFor(startTime) : timeOfDay,
      startTime: parseTime(startTime) !== null ? startTime : undefined,
      durationMin: duration ? Math.min(1440, Math.max(1, Math.round(duration))) : undefined,
      difficulty,
      archived: initial?.archived,
    })
  }

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <h2>{initial ? 'Edit habit' : 'New habit'}</h2>

        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold shower" autoFocus />
        </div>

        <div className="field">
          <label>Icon</label>
          <div className="emojipick">
            {[emoji, ...EMOJIS.filter((e) => e !== emoji)].map((e) => (
              <button key={e} className={e === emoji ? 'on' : ''} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>How often</label>
          <div className="seg">
            <button className={freqType === 'daily' ? 'on' : ''} onClick={() => setFreqType('daily')}>Every day</button>
            <button className={freqType === 'weekdays' ? 'on' : ''} onClick={() => setFreqType('weekdays')}>Specific days</button>
            <button className={freqType === 'perWeek' ? 'on' : ''} onClick={() => setFreqType('perWeek')}>Times per week</button>
          </div>
          {freqType === 'weekdays' && (
            <div className="daypick">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d}
                  className={days.includes(d) ? 'on' : ''}
                  onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              ))}
            </div>
          )}
          {freqType === 'perWeek' && (
            <div className="seg">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} className={target === n ? 'on' : ''} onClick={() => setTarget(n)}>
                  {n}×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Time of day</label>
          <div className="seg">
            {(['morning', 'afternoon', 'evening', 'anytime'] as TimeOfDay[]).map((t) => (
              <button key={t} className={timeOfDay === t ? 'on' : ''} onClick={() => setTimeOfDay(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Start time (optional)</label>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ flex: 1 }} />
            {startTime && <button className="btn" onClick={() => setStartTime('')}>Clear</button>}
          </div>
          {startTime && <div className="muted small">Placed in {timeOfDayFor(startTime)} on Today.</div>}
        </div>

        <div className="field">
          <label>Duration (optional)</label>
          <div className="seg">
            {DURATIONS.map((m) => (
              <button key={m} className={duration === m ? 'on' : ''} onClick={() => setDuration(duration === m ? '' : m)}>
                {m < 60 ? `${m} min` : m === 60 ? '1 hr' : '1.5 hr'}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <input
              className="input"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Custom minutes"
              style={{ flex: 1 }}
            />
          </div>
          {startTime && duration ? <div className="muted small">Ends around {formatEnd(startTime, Number(duration))}.</div> : null}
        </div>

        <div className="field">
          <label>Effort (sets XP)</label>
          <div className="seg">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Cue — "After I ___, I will ___"</label>
          <input className="input" value={cue} onChange={(e) => setCue(e.target.value)} placeholder="After I make coffee, I will…" />
        </div>

        <div className="field">
          <label>Why it matters (shown when you want to skip)</label>
          <textarea className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One honest sentence." />
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!valid} style={{ flex: 2 }}>
            {initial ? 'Save' : 'Add habit'}
          </button>
        </div>
      </div>
    </div>
  )
}
