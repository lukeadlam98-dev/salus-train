import { C } from '../lib/theme'
import { fmt } from '../lib/format'

// Small SVG charts. No library — these are simple enough that a
// dependency would cost more than it saves, and it keeps the bundle
// honest.

/* Horizontal bars. Best for comparing named things, because the
   labels sit beside the bar and read left to right. */
export function Bars({ rows, format = v => v, height = 26, accent }) {
  if (!rows?.length) return null
  const max = Math.max(...rows.map(r => r.v))
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center',
          gap: 11, marginBottom: i === rows.length - 1 ? 0 : 6 }}>
          <div style={{ width: 118, fontSize: 12.5, color: C.sub, flexShrink: 0,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' }}>{r.label}</div>
          <div style={{ flex: 1, height, background: C.card2, borderRadius: 6,
            position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${(r.v / max) * 100}%`,
              background: r.flag ? accent || C.g : C.card3, borderRadius: 6,
              transition: 'width .4s' }} />
          </div>
          <div style={{ width: 52, textAlign: 'right', fontSize: 12.5,
            fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: r.flag ? C.ink : C.sub }}>{format(r.v)}</div>
        </div>
      ))}
    </div>
  )
}

/* Vertical columns. Best for anything over time, because time reads
   left to right and the shape of the trend is the point. */
export function Columns({ rows, height = 96, format = v => v, accent }) {
  if (!rows?.length) return null
  const max = Math.max(...rows.map(r => r.v), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {rows.map(r => (
          <div key={r.label} style={{ flex: 1, display: 'flex',
            flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            {r.v > 0 && (
              <div style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center',
                color: C.sub, marginBottom: 4,
                fontVariantNumeric: 'tabular-nums' }}>{format(r.v)}</div>
            )}
            <div style={{ height: `${Math.max(3, (r.v / max) * 100)}%`,
              background: r.flag ? accent || C.g : C.card3,
              borderRadius: '5px 5px 2px 2px', transition: 'height .4s' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
        {rows.map(r => (
          <div key={r.label} style={{ flex: 1, fontSize: 10.5, textAlign: 'center',
            color: C.mute, fontWeight: 600 }}>{r.label}</div>
        ))}
      </div>
    </div>
  )
}

/* A single line, for one number moving. Deliberately unlabelled —
   it's for shape, not for reading values off. */
export function Spark({ values, width = 120, height = 34, invert }) {
  if (!values?.length || values.length < 2) return null
  const max = Math.max(...values), min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const norm = (v - min) / span
    const y = height - (invert ? 1 - norm : norm) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={C.g} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Progress against a whole, as a ring. One number, read at a glance. */
export function Ring({ value, total, size = 62, label }) {
  const pct = total ? Math.min(1, value / total) : 0
  const r = (size - 7) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size,
      flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={C.card2} strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={C.g} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid',
        placeItems: 'center' }}>
        <div style={{ fontSize: size * 0.26, fontWeight: 800,
          letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>
          {label ?? value}
        </div>
      </div>
    </div>
  )
}
