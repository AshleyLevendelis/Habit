import { useRef } from 'react'
import type { AppState } from '../types'
import type { Action } from '../store'
import { exportJson, importJson, initialState } from '../lib/storage'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  onToast: (msg: string) => void
}

export function SettingsView({ state, dispatch, onToast }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const notifSupported = typeof Notification !== 'undefined'

  function download() {
    const blob = new Blob([exportJson(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habits-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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
    if (time && notifSupported && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

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
          <label>Daily reminder</label>
          <input className="input" type="time" value={state.settings.reminderTime} onChange={(e) => enableReminders(e.target.value)} />
          <div className="muted small">
            {notifSupported
              ? Notification.permission === 'denied'
                ? 'Notifications are blocked in your browser settings.'
                : 'Fires while the app is open or installed to your home screen. Pair it with a phone alarm for guaranteed accountability.'
              : 'Notifications are not supported in this browser.'}
          </div>
        </div>
      </div>

      <div className="section">Data</div>
      <div className="card stack">
        <div className="muted small">Everything is stored on this device only. Back it up before switching phones or clearing browser data.</div>
        <button className="btn block" onClick={download}>Export backup (JSON)</button>
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
