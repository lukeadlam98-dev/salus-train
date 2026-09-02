import { C, T } from '../lib/theme'
import { fmt } from '../lib/format'
import { Card, Label } from '../components/ui'

// Paces as a fraction of their own tested 5km.
//
// A plan that says "run at 5:00/km" is wrong for almost everyone who
// reads it. A plan that says "steady" and lets the app work out what
// that means for you is right for all of them.
const BANDS = [
  ['Easy',      1.28, 'Conversational. Most of your running lives here.'],
  ['Steady',    1.14, 'Comfortably hard. The pace of a long compromised session.'],
  ['Race pace', 1.06, "What 8km inside a HYROX actually feels like."],
  ['5km',       1.00, 'Your tested pace, fresh.'],
  ['Interval',  0.94, 'Faster than 5km. For 400s and 800s.'],
]

export default function Paces({ fivekSeconds, compact }) {
  if (!fivekSeconds) return null
  const base = fivekSeconds / 5

  return (
    <>
      {!compact && <Label style={{ margin: '26px 0 11px' }}>YOUR PACES</Label>}
      <Card style={{ padding: '4px 15px' }}>
        {BANDS.map(([label, pct, note], i) => (
          <div key={label} style={{ padding: '13px 0',
            borderTop: i ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, ...T.num }}>
                {fmt(Math.round(base * pct))}
                <span style={{ fontSize: 11.5, color: C.sub,
                  marginLeft: 4 }}>/km</span>
              </div>
            </div>
            {!compact && (
              <div style={{ ...T.small, fontSize: 12, marginTop: 4 }}>{note}</div>
            )}
          </div>
        ))}
      </Card>
      {!compact && (
        <div style={{ ...T.small, fontSize: 12, marginTop: 12, lineHeight: 1.55 }}>
          Worked out from your tested 5km, so "steady" means the same effort to
          everyone rather than the same number. Re-test and these move with you.
        </div>
      )}
    </>
  )
}
