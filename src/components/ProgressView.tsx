import type { AppState } from '../types'
import type { Action } from '../store'
import { achievements, dayScore, habitInsights, levelInfo, streak, suggestions, totals, weekSummary } from '../lib/engine'
import { addDays, formatShort, range, todayKey, weekEnd, weekStart, WEEKDAY_NAMES } from '../lib/dates'
import { formatDuration } from '../lib/time'
import { Heatmap } from './Heatmap'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
}

export function ProgressView({ state, dispatch }: Props) {
  const today = todayKey()
  const t = totals(state, today)
  const lvl = levelInfo(t.xp)
  const values: Record<string, number> = {}
  for (const d of range(addDays(today, -16 * 7), today)) values[d] = dayScore(state, d).ratio
  const active = state.habits.filter((h) => !h.archived)
  const streaks = active.map((h) => ({ h, s: streak(state, h, today) })).sort((a, b) => b.s.current - a.s.current)
  const thisWeek = weekSummary(state, today, today)
  const lastWeek = weekSummary(state, addDays(weekStart(today), -1), today)
  const rate = (rows: typeof thisWeek) => {
    const tot = rows.reduce((a, r) => a + r.target, 0)
    const done = rows.reduce((a, r) => a + r.done, 0)
    return tot ? Math.round((done / tot) * 100) : 0
  }
  const ach = achievements(state, today)
  const earned = ach.filter((a) => a.earned).length
  const tips = suggestions(state, today)
  const insights = habitInsights(state, today).filter((i) => i.rate !== null || i.weakestWeekday || i.usualTime || i.avgMinutes)

  return (
    <div className="screen">
      <div className="header">
        <div>
          <div className="date">Progress</div>
          <h1>Level {lvl.level} · {lvl.title}</h1>
        </div>
        <span className="pill hot">{t.xp} xp</span>
      </div>

      <div className="card">
        <div className="stats">
          <div className="stat"><b>{t.completions}</b><span>completions</span></div>
          <div className="stat"><b>{t.perfectDays}</b><span>perfect days</span></div>
          <div className="stat"><b>{t.perfectWeeks}</b><span>perfect weeks</span></div>
        </div>
      </div>

      {tips.length > 0 && (
        <>
          <div className="section">Coach suggestions</div>
          <div className="stack">
            {tips.map((s) => {
              const habit = state.habits.find((h) => h.id === s.habitId)!
              return (
                <div key={s.habitId + s.kind} className="card stack">
                  <div className="small">{s.message}</div>
                  {s.patch && (
                    <button
                      className="btn sm primary"
                      onClick={() => dispatch({ type: 'updateHabit', habit: { ...habit, ...s.patch } })}
                    >
                      {s.kind === 'level-up' ? 'Raise it' : 'Scale it back'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="section">Last 16 weeks</div>
      <div className="card">
        <Heatmap values={values} />
        <div className="muted small" style={{ marginTop: 8 }}>Each square is a day. Brighter = more of what was required got done.</div>
      </div>

      <div className="section">Streaks</div>
      <div className="card stack">
        {streaks.length === 0 && <div className="muted">No active habits.</div>}
        {streaks.map(({ h, s }) => (
          <div key={h.id} className="list-item">
            <div className="emoji">{h.emoji}</div>
            <div>
              <b>{h.name}</b>
              <div className="muted small">best {s.best} {s.unit}{s.best === 1 ? '' : 's'}{s.atRisk ? ' · at risk, never miss twice' : ''}</div>
            </div>
            <span className={`pill ${s.current >= 7 ? 'hot' : ''}`}>🔥 {s.current}</span>
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <>
          <div className="section">Patterns · last 4 weeks</div>
          <div className="card stack">
            {insights.map((i) => (
              <div key={i.habit.id}>
                <div className="spread small">
                  <span>{i.habit.emoji} <b>{i.habit.name}</b></span>
                  {i.rate !== null && <span className="muted">{Math.round(i.rate * 100)}%</span>}
                </div>
                <div className="muted small">
                  {[
                    i.weakestWeekday && `Hardest day: ${WEEKDAY_NAMES[i.weakestWeekday.day]} (${Math.round(i.weakestWeekday.rate * 100)}%)`,
                    i.usualTime && `Usually done in the ${i.usualTime}`,
                    i.avgMinutes && `Avg ${formatDuration(i.avgMinutes.value)} over ${i.avgMinutes.sessions} timed session${i.avgMinutes.sessions === 1 ? '' : 's'}${i.habit.durationMin ? ` (planned ${formatDuration(i.habit.durationMin)})` : ''}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Not enough history for patterns yet.'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section">Weekly review</div>
      <div className="card stack">
        <div className="spread">
          <b>This week</b>
          <span className="muted small">{formatShort(weekStart(today))} – {formatShort(weekEnd(today))} · {rate(thisWeek)}%</span>
        </div>
        {thisWeek.map((r) => (
          <div key={r.habit.id}>
            <div className="spread small"><span>{r.habit.emoji} {r.habit.name}</span><span className="muted">{r.done}/{r.target}</span></div>
            <div className="bar" style={{ marginTop: 4 }}><div style={{ width: `${r.rate * 100}%` }} /></div>
          </div>
        ))}
        <div className="spread" style={{ marginTop: 6 }}>
          <b>Last week</b>
          <span className="muted small">{rate(lastWeek)}%</span>
        </div>
        {lastWeek.map((r) => (
          <div key={r.habit.id}>
            <div className="spread small"><span>{r.habit.emoji} {r.habit.name}</span><span className="muted">{r.done}/{r.target}</span></div>
            <div className="bar" style={{ marginTop: 4 }}><div style={{ width: `${r.rate * 100}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="section">Achievements · {earned}/{ach.length}</div>
      <div className="badges">
        {ach.map((a) => (
          <div key={a.id} className={`badge ${a.earned ? '' : 'locked'}`}>
            <div className="e">{a.emoji}</div>
            <b>{a.name}</b>
            <span>{a.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
