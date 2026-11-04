import type { AppState } from '../types'
import { exportJson } from './storage'

const DAY_MS = 86_400_000
export const BACKUP_EVERY_DAYS = 7
const SNOOZE_KEY = 'backup-snoozed-until'

/** Worth nagging about once there is real history to lose. */
export function backupDue(state: AppState, now = Date.now()): boolean {
  const reps = Object.values(state.completions).reduce((n, ids) => n + ids.length, 0)
  if (reps < 5) return false
  const last = state.settings.lastBackup ? Date.parse(state.settings.lastBackup) : 0
  if (now - last < BACKUP_EVERY_DAYS * DAY_MS) return false
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
    if (until > now) return false
  } catch {
    /* ignore */
  }
  return true
}

export function snoozeBackup(days = 3, now = Date.now()): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(now + days * DAY_MS))
  } catch {
    /* ignore */
  }
}

export function daysSince(iso: string, now = Date.now()): number | null {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : Math.floor((now - t) / DAY_MS)
}

/**
 * Save a backup file. On phones this opens the share sheet (Files, iCloud Drive, Google Drive, email…),
 * which is the closest a web app gets to "saved somewhere safe". Elsewhere it downloads.
 * Returns true if a backup was produced (not cancelled).
 */
export async function backupNow(state: AppState): Promise<boolean> {
  const name = `habits-backup-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([exportJson(state)], name, { type: 'application/json' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Habit backup' })
      return true
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return false // user closed the share sheet
    /* otherwise fall back to a download */
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/** Ask the browser not to evict our data under storage pressure. Best-effort. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    /* ignore */
  }
  return false
}
