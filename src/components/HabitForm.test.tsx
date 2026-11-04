// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitForm } from './HabitForm'
import { habit } from '../test-utils'

afterEach(cleanup)

function setup(initial?: ReturnType<typeof habit>) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(<HabitForm initial={initial} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel, user }
}

describe('HabitForm: start time & duration', () => {
  it('saves a start time and a preset duration, and files the habit under the right time of day', async () => {
    const { onSave, user } = setup()
    await user.type(screen.getByLabelText('Name'), 'Run')
    await user.type(screen.getByLabelText('Start time (optional)'), '18:30')
    await user.click(screen.getByRole('button', { name: '45 min' }))
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Run', startTime: '18:30', durationMin: 45, timeOfDay: 'evening' })
  })

  it('leaves both unset when you do not use them', async () => {
    const { onSave, user } = setup()
    await user.type(screen.getByLabelText('Name'), 'Read')
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    const saved = onSave.mock.calls[0][0]
    expect(saved.startTime).toBeUndefined()
    expect(saved.durationMin).toBeUndefined()
    expect(saved.timeOfDay).toBe('anytime')
  })

  it('tapping the selected preset again clears it; a custom value overrides', async () => {
    const { onSave, user } = setup(habit({ name: 'Stretch', durationMin: 15 }))
    const preset = screen.getByRole('button', { name: '15 min' })
    expect(preset.getAttribute('aria-pressed')).toBe('true')
    await user.click(preset)
    expect(preset.getAttribute('aria-pressed')).toBe('false')
    await user.type(screen.getByLabelText('Or a custom length (minutes)'), '12')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave.mock.calls[0][0].durationMin).toBe(12)
  })

  it('clears an existing start time', async () => {
    const { onSave, user } = setup(habit({ name: 'Meditate', startTime: '06:15', durationMin: 10, timeOfDay: 'morning' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const saved = onSave.mock.calls[0][0]
    expect(saved.startTime).toBeUndefined()
    expect(saved.durationMin).toBe(10)
    expect(saved.timeOfDay).toBe('morning') // keeps the manual choice once no time drives it
  })

  it('shows when it ends', async () => {
    const { user } = setup(habit({ name: 'x' }))
    await user.type(screen.getByLabelText('Start time (optional)'), '07:30')
    await user.click(screen.getByRole('button', { name: '45 min' }))
    expect(screen.getByText(/Ends around 8:15 AM/)).toBeTruthy()
  })
})

describe('HabitForm: accessibility', () => {
  it('is a labelled modal dialog', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'New habit' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })
  it('closes on Escape', async () => {
    const { onCancel, user } = setup()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })
  it('does not add a habit without a name', () => {
    setup()
    expect((screen.getByRole('button', { name: 'Add habit' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('exposes pressed state on toggle buttons', async () => {
    const { user } = setup()
    const hard = screen.getByRole('button', { name: 'Hard' })
    expect(hard.getAttribute('aria-pressed')).toBe('false')
    await user.click(hard)
    expect(hard.getAttribute('aria-pressed')).toBe('true')
  })
})
