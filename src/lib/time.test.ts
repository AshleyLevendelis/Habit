import { describe, expect, it } from 'vitest'
import { formatDuration, formatEnd, formatTime, scheduleLabel, timeOfDayFor } from './time'

describe('time helpers', () => {
  it('formats times', () => {
    expect(formatTime('07:30')).toBe('7:30 AM')
    expect(formatTime('00:05')).toBe('12:05 AM')
    expect(formatTime('13:00')).toBe('1:00 PM')
  })
  it('formats durations', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(75)).toBe('1h 15m')
  })
  it('computes end time, wrapping past midnight', () => {
    expect(formatEnd('07:30', 45)).toBe('8:15 AM')
    expect(formatEnd('23:30', 60)).toBe('12:30 AM')
  })
  it('builds labels and buckets', () => {
    expect(scheduleLabel('06:00', 20)).toBe('6:00 AM · 20 min')
    expect(scheduleLabel(undefined, undefined)).toBe('')
    expect(timeOfDayFor('11:59')).toBe('morning')
    expect(timeOfDayFor('12:00')).toBe('afternoon')
    expect(timeOfDayFor('17:00')).toBe('evening')
  })
})
