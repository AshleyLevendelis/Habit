/** All date handling uses the device's local time and YYYY-MM-DD keys. */

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function weekday(key: string): number {
  return fromKey(key).getDay()
}

/** Monday-based start of the week containing `key`. */
export function weekStart(key: string): string {
  const wd = weekday(key)
  const offset = wd === 0 ? 6 : wd - 1
  return addDays(key, -offset)
}

export function weekEnd(key: string): string {
  return addDays(weekStart(key), 6)
}

/** Inclusive list of day keys from a to b. */
export function range(a: string, b: string): string[] {
  const out: string[] = []
  let cur = a
  while (cur <= b) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)
}

export function formatLong(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
