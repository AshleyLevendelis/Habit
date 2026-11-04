import { useEffect, useId, useRef, useState } from 'react'
import type { Difficulty, Frequency, Habit, TimeOfDay } from '../types'
import { WEEKDAY_LABELS, WEEKDAY_NAMES } from '../lib/dates'
import { formatEnd, parseTime, timeOfDayFor } from '../lib/time'

const DURATIONS = [5, 10, 15, 30, 45, 60, 90]

const EMOJIS = ['🌅', '🏋️', '🥊', '🍳', '🥗', '🏠', '📚', '🧘', '💧', '🛏️', '🚫', '💼', '🧹', '💊', '🚶', '🧠', '💰', '✍️']

interface Props {
  initial?: Habit
  onSave: (h: Omit<Habit, 'id' | 'createdAt'>) => void
  onCancel: () => void
  /** Only passed when editing an existing habit. */
  onArchive?: () => void
  onDelete?: () => void
}

export function HabitForm({ initial, onSave, onCancel, onArchive, onDelete }: Props) {
  const uid = useId()
  const id = (n: string) => `${uid}-${n}`
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  }, [onCancel])

  // Escape closes; Tab stays inside the dialog; focus returns to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const el = dialogRef.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return cancelRef.current()
      if (e.key !== 'Tab' || !el) return
      const f = el.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [])

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
      <div ref={dialogRef} className="modal stack" role="dialog" aria-modal="true" aria-labelledby={id('title')} onClick={(e) => e.stopPropagation()}>
        <h2 id={id('title')}>{initial ? 'Edit habit' : 'New habit'}</h2>

        <div className="field">
          <label htmlFor={id('name')}>Name</label>
          <input id={id('name')} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold shower" autoFocus />
        </div>

        <div className="field" role="group" aria-labelledby={id('icon')}>
          <label id={id('icon')}>Icon</label>
          <div className="emojipick">
            {[emoji, ...EMOJIS.filter((e) => e !== emoji)].map((e) => (
              <button key={e} className={e === emoji ? 'on' : ''} aria-pressed={e === emoji} aria-label={`Icon ${e}`} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="field" role="group" aria-labelledby={id('freq')}>
          <label id={id('freq')}>How often</label>
          <div className="seg">
            <button className={freqType === 'daily' ? 'on' : ''} aria-pressed={freqType === 'daily'} onClick={() => setFreqType('daily')}>Every day</button>
            <button className={freqType === 'weekdays' ? 'on' : ''} aria-pressed={freqType === 'weekdays'} onClick={() => setFreqType('weekdays')}>Specific days</button>
            <button className={freqType === 'perWeek' ? 'on' : ''} aria-pressed={freqType === 'perWeek'} onClick={() => setFreqType('perWeek')}>Times per week</button>
          </div>
          {freqType === 'weekdays' && (
            <div className="daypick">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  key={d}
                  className={days.includes(d) ? 'on' : ''}
                  aria-pressed={days.includes(d)}
                  aria-label={WEEKDAY_NAMES[d]}
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
                <button key={n} className={target === n ? 'on' : ''} aria-pressed={target === n} onClick={() => setTarget(n)}>
                  {n}×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field" role="group" aria-labelledby={id('tod')}>
          <label id={id('tod')}>Time of day</label>
          <div className="seg">
            {(['morning', 'afternoon', 'evening', 'anytime'] as TimeOfDay[]).map((t) => (
              <button key={t} className={timeOfDay === t ? 'on' : ''} aria-pressed={timeOfDay === t} onClick={() => setTimeOfDay(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={id('start')}>Start time (optional)</label>
          <div className="row" style={{ gap: 8 }}>
            <input id={id('start')} className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ flex: 1 }} />
            {startTime && <button className="btn" onClick={() => setStartTime('')}>Clear</button>}
          </div>
          {startTime && <div className="muted small">Placed in {timeOfDayFor(startTime)} on Today.</div>}
        </div>

        <div className="field" role="group" aria-labelledby={id('dur')}>
          <label id={id('dur')}>Duration (optional)</label>
          <div className="seg">
            {DURATIONS.map((m) => (
              <button key={m} className={duration === m ? 'on' : ''} aria-pressed={duration === m} onClick={() => setDuration(duration === m ? '' : m)}>
                {m < 60 ? `${m} min` : m === 60 ? '1 hr' : '1.5 hr'}
              </button>
            ))}
          </div>
          <label htmlFor={id('custom')} style={{ marginTop: 6 }}>Or a custom length (minutes)</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              id={id('custom')}
              className="input"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 20"
              style={{ flex: 1 }}
            />
          </div>
          {startTime && duration ? <div className="muted small">Ends around {formatEnd(startTime, Number(duration))}.</div> : null}
        </div>

        <div className="field" role="group" aria-labelledby={id('eff')}>
          <label id={id('eff')}>Effort (sets XP)</label>
          <div className="seg">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button key={d} className={difficulty === d ? 'on' : ''} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={id('cue')}>Cue — "After I ___, I will ___"</label>
          <input id={id('cue')} className="input" value={cue} onChange={(e) => setCue(e.target.value)} placeholder="After I make coffee, I will…" />
        </div>

        <div className="field">
          <label htmlFor={id('why')}>Why it matters (shown when you want to skip)</label>
          <textarea id={id('why')} className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="One honest sentence." />
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!valid} style={{ flex: 2 }}>
            {initial ? 'Save' : 'Add habit'}
          </button>
        </div>
        {initial && (onArchive || onDelete) && (
          <div className="formactions">
            {onArchive && <button className="btn sm" onClick={onArchive}>Archive</button>}
            {onDelete && <button className="btn sm danger" onClick={onDelete}>Delete</button>}
          </div>
        )}
      </div>
    </div>
  )
}
