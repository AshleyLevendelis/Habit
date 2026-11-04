export interface TimelineItem {
  id: string
  /** minutes since midnight */
  start: number
  /** minutes since midnight; equals start for a habit with no duration */
  end: number
}

export interface PlacedItem extends TimelineItem {
  col: number
  cols: number
}

/** Shortest block we draw, so a habit with no duration is still tappable. */
export const MIN_BLOCK_MIN = 36

const trueEnd = (i: TimelineItem) => Math.max(i.end, i.start + 1)
const drawEnd = (i: TimelineItem) => Math.max(i.end, i.start + MIN_BLOCK_MIN)

/** Do two habits actually clash in time? (A habit with no duration counts as a 1-minute moment.) */
export function clash(a: TimelineItem, b: TimelineItem): boolean {
  return a.start < trueEnd(b) && b.start < trueEnd(a)
}

/** Pairs of habits whose scheduled times overlap. */
export function findOverlaps(items: TimelineItem[]): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) if (clash(items[i], items[j])) out.push([items[i].id, items[j].id])
  return out
}

/**
 * Assign each block a column so anything drawn on top of something else sits side by side.
 * Blocks are grouped into clusters of overlapping (as drawn) blocks; each cluster shares a column count.
 */
export function layoutTimeline(items: TimelineItem[]): PlacedItem[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const placed: PlacedItem[] = []
  let cluster: PlacedItem[] = []
  let clusterEnd = -1

  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1))
    for (const p of cluster) p.cols = cols
    placed.push(...cluster)
    cluster = []
  }

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) flush()
    // lowest column whose last block has finished
    let col = 0
    while (cluster.some((p) => p.col === col && drawEnd(p) > item.start)) col++
    cluster.push({ ...item, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, drawEnd(item))
  }
  if (cluster.length) flush()
  return placed
}
