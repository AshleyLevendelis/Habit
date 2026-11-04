import { useRef } from 'react'
import type { AppState } from '../types'
import type { Action } from '../store'
import { importJson, initialState } from '../lib/storage'
import { backupNow, daysSince } from '../lib/backup'
import { notify, permission, requestPermission } from '../lib/notify'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  onToast: (msg: string) => void
}

export function SettingsView({ state, dispatch, onToast }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const notifSupported = typeof Notification !== 'undefined'

  async function download() {
    if (await backupNow(state)) {
      dispatch({ type: 'settings', settings: { lastBackup: new Date().toISOString() } })
      onToast('Backup saved')
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const next = importJson(await f.text())
      if (confirm('Replace everything with this backup?')) {
        dispatch({ type: 'replace', state: next })
        onToast('Backup restored')
      }
    } catch (err) {
      alert((err as Error).message)
    }
    e.target.value = ''
  }

  async function enableReminders(time: string) {
    dispatch({ type: 'settings', settings: { reminderTime: time } })
    if (time) await requestPermission()
  }

  async function toggleHabitReminders(on: boolean) {
    if (on) {
      const p = await requestPermission()
      if (p !== 'granted') {
        onToast(p === 'denied' ? 'Notifications are blocked in your browser settings' : 'Notifications are not available here')
        return
      }
    }
    dispatch({ type: 'settings', settings: { habitReminders: on } })
  }

  async function sendTest() {
    const ok = await notify('Habit', 'Reminders are working.', 'test')
    onToast(ok ? 'Test notification sent' : 'Could not send. Check notification permission.')
  }

  const lastBackupDays = state.settings.lastBackup ? daysSince(state.settings.lastBackup) : null

  return (
    <div className="screen stack">
      <div className="header">
        <div>
          <div className="date">Settings</div>
          <h1>You</h1>
        </div>
      </div>

      <div className="card stack">
        <div className="field">
          <label>Your name</label>
          <input className="input" value={state.settings.name} onChange={(e) => dispatch({ type: 'settings', settings: { name: e.target.value } })} placeholder="Optional" />
        </div>
        <div className="field">
          <label htmlFor="s-reminder">Daily check-in</label>
          <input id="s-reminder" className="input" type="time" value={state.settings.reminderTime} onChange={(e) => enableReminders(e.target.value)} />
        </div>
        <label className="switch">
          <input type="checkbox" checked={state.settings.habitReminders} onChange={(e) => toggleHabitReminders(e.target.checked)} disabled={!notifSupported} />
          <span>Remind me at each habit&rsquo;s start time</span>
        </label>
        <div className="muted small">
          {!notifSupported
            ? 'Notifications are not supported in this browser.'
            : permission() === 'denied'
              ? 'Notifications are blocked in your browser settings.'
              : 'Reminders fire while the app is open or running in the background. A web app that is fully closed cannot be woken without a push server, so keep a phone alarm for the habits that matter most. On iPhone, install to the Home Screen first.'}
        </div>
        {notifSupported && permission() === 'granted' && (
          <button className="btn sm" onClick={sendTest}>Send a test notification</button>
        )}
      </div>

      <div className="section">Data</div>
      <div className="card stack">
        <div className="muted small">
          Everything is stored on this device only. Back it up before switching phones or clearing browser data.{' '}
          {lastBackupDays === null ? 'No backup yet.' : lastBackupDays === 0 ? 'Last backup: today.' : `Last backup: ${lastBackupDays} day${lastBackupDays === 1 ? '' : 's'} ago.`}
        </div>
        <button className="btn block" onClick={download}>Back up now (save or share file)</button>
        <button className="btn block" onClick={() => fileRef.current?.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
        <button
          className="btn block danger"
          onClick={() => {
            if (confirm('Erase all habits and history on this device?')) {
              dispatch({ type: 'replace', state: initialState() })
              onToast('Reset to starter habits')
            }
          }}
        >
          Reset everything
        </button>
      </div>

      <div className="section">Install on your phone</div>
      <div className="card muted small stack">
        <div><b>iPhone:</b> open this page in Safari → Share → “Add to Home Screen”.</div>
        <div><b>Android:</b> open in Chrome → menu ⋮ → “Install app” or “Add to Home screen”.</div>
        <div>It then opens full-screen like a native app and works offline.</div>
      </div>

      <div className="section">How the game works</div>
      <div className="card muted small stack">
        <div><b>XP:</b> easy 10, medium 20, hard 35 per completion. Perfect day +30. Weekly target hit +40.</div>
        <div><b>Streaks:</b> one miss pauses a streak, two in a row breaks it. “Never miss twice.”</div>
        <div><b>Weekly habits:</b> count per week (Mon–Sun). They become required on a day when skipping would make the target impossible.</div>
        <div><b>Levels:</b> each level needs a bit more XP than the last. Titles change as you climb.</div>
      </div>
    </div>
  )
}
