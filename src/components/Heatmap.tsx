import { addDays, todayKey, weekStart } from '../lib/dates'

interface Props {
  /** dayKey -> 0..1 */
  values: Record<string, number>
  weeks?: number
}

export function Heatmap({ values, weeks = 16 }: Props) {
  const today = todayKey()
  const end = addDays(weekStart(today), 6)
  const start = addDays(end, -(weeks * 7 - 1))
  const cells: { day: string; ratio: number }[] = []
  let d = start
  while (d <= end) {
    cells.push({ day: d, ratio: values[d] ?? 0 })
    d = addDays(d, 1)
  }
  const level = (r: number) => (r <= 0 ? '' : r < 0.34 ? 'l1' : r < 0.67 ? 'l2' : r < 1 ? 'l3' : 'l4')
  return (
    <div className="heatmap" aria-label="Completion heatmap">
      {cells.map((c) => (
        <i
          key={c.day}
          title={`${c.day}: ${Math.round(c.ratio * 100)}%`}
          className={[level(c.ratio), c.day === today ? 'today' : '', c.day > today ? 'future' : ''].join(' ')}
        />
      ))}
    </div>
  )
}
