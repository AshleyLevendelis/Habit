import { describe, expect, it } from 'vitest'
import { clash, findOverlaps, layoutTimeline } from './timeline'

const it_ = (id: string, start: number, end = start) => ({ id, start, end })

describe('timeline', () => {
  it('detects real overlaps, not back-to-back habits', () => {
    expect(clash(it_('a', 420, 450), it_('b', 450, 480))).toBe(false)
    expect(clash(it_('a', 420, 450), it_('b', 440, 470))).toBe(true)
  })
  it('treats a habit with no duration as a moment that can fall inside another', () => {
    expect(clash(it_('a', 420, 480), it_('b', 450))).toBe(true)
    expect(clash(it_('a', 420, 480), it_('b', 481))).toBe(false)
    expect(clash(it_('a', 420), it_('b', 420))).toBe(true)
  })
  it('lists each overlapping pair once', () => {
    expect(findOverlaps([it_('a', 0, 60), it_('b', 30, 90), it_('c', 200, 230)])).toEqual([['a', 'b']])
  })
  it('puts clashing blocks side by side and gives lone blocks the full width', () => {
    const p = layoutTimeline([it_('a', 420, 480), it_('b', 440, 500), it_('c', 700, 730)])
    const by = Object.fromEntries(p.map((x) => [x.id, x]))
    expect([by.a.col, by.b.col]).toEqual([0, 1])
    expect([by.a.cols, by.b.cols]).toEqual([2, 2])
    expect([by.c.col, by.c.cols]).toEqual([0, 1])
  })
  it('reuses a column once the earlier block has finished', () => {
    const p = layoutTimeline([it_('a', 0, 60), it_('b', 30, 90), it_('c', 60, 120)])
    const by = Object.fromEntries(p.map((x) => [x.id, x]))
    expect(by.c.col).toBe(0) // a is done by 60
    expect(by.a.cols).toBe(2)
  })
  it('draws no-duration habits at a minimum height so near ones do not hide each other', () => {
    const p = layoutTimeline([it_('a', 420), it_('b', 430)])
    expect(p.map((x) => x.col).sort()).toEqual([0, 1])
  })
})
