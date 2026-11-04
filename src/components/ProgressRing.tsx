interface Props {
  ratio: number // 0..1
  size?: number
  label: string
  sub?: string
}

export function ProgressRing({ ratio, size = 96, label, sub }: Props) {
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(1, Math.max(0, ratio)))
  const color = ratio >= 1 ? 'var(--good)' : 'var(--accent)'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{label}</div>
          {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}
