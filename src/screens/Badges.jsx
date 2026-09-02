import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { getBadges } from '../lib/data'
import { Card, Label, Sheet, Btn, Ico, I } from '../components/ui'

// Ten badges, and no more.
//
// A hundred of them for everything is a participation scheme and
// members stop reading them by week two. Each of these marks something
// that was actually hard — nothing is awarded for opening the app or
// setting a profile photo.
//
// The unearned ones stay visible. A badge you can't see isn't a target,
// and half the value of the set is knowing what's still out there.
export default function Badges({ userId, compact }) {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => { getBadges(userId).then(setRows).catch(() => {}) }, [userId])

  if (rows.length === 0) return null
  const got = rows.filter(r => r.earned)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9,
        margin: compact ? '0 0 11px' : '30px 0 11px' }}>
        <Label>BADGES</Label>
        <div style={{ fontSize: 11.5, color: C.mute }}>
          {got.length} of {rows.length}
        </div>
      </div>

      <Card style={{ padding: 15 }}>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {rows.map(b => (
            <button key={b.key} onClick={() => setOpen(b)}
              style={{ background: 'transparent', border: 'none', padding: 0,
                cursor: 'pointer', fontFamily: F, display: 'grid',
                justifyItems: 'center', gap: 6 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14,
                display: 'grid', placeItems: 'center',
                background: b.earned ? C.g : 'transparent',
                border: b.earned ? 'none' : `1.5px dashed ${C.card3}`,
                transition: 'background .3s' }}>
                <Mark k={b.key} on={b.earned} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center',
                lineHeight: 1.25,
                color: b.earned ? C.sub : C.mute }}>
                {b.label}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16,
              display: 'grid', placeItems: 'center', flexShrink: 0,
              background: open.earned ? C.g : 'transparent',
              border: open.earned ? 'none' : `1.5px dashed ${C.card3}` }}>
              <Mark k={open.key} on={open.earned} size={26} />
            </div>
            <div>
              <div style={{ ...T.h2, fontSize: 21 }}>{open.label}</div>
              <div style={{ ...T.small, marginTop: 3 }}>
                {open.earned_for}
              </div>
            </div>
          </div>

          {open.why && (
            <div style={{ ...T.body, marginTop: 18, lineHeight: 1.65 }}>
              {open.why}
            </div>
          )}

          <div style={{ ...T.small, fontSize: 12.5, marginTop: 16,
            paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
            {open.earned
              ? `Earned ${new Date(open.earned_at).toLocaleDateString('en-GB',
                  { day: 'numeric', month: 'long', year: 'numeric' })}`
                + (open.note ? ` · ${open.note}` : '')
              : 'Not yet.'}
          </div>

          <Btn tone="soft" style={{ marginTop: 20 }}
            onClick={() => setOpen(null)}>Close</Btn>
        </Sheet>
      )}
    </>
  )
}

// One mark per badge, drawn rather than iconed — a set of stock icons
// would look like a rewards app, and these should look like they
// belong to this one.
const Mark = ({ k, on, size = 22 }) => {
  const c = on ? C.bg : C.mute
  const p = {
    first:       'M12 4v16M5 11l7-7 7 7',
    tested:      'M4.5 12.5 9.5 17.5 20 6.5',
    full_week:   'M4 6h16M4 12h16M4 18h16',
    three_weeks: 'M3 17l5-5 4 4 5-5 4 4',
    block:       'M4 5h16v14H4zM4 10h16M9 5v14',
    half:        'M12 3a9 9 0 000 18zM12 3a9 9 0 010 18',
    early:       'M12 17a5 5 0 100-10 5 5 0 000 10M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19',
    pb:          'M4 18l5-6 4 3 7-9M20 6v5h-5',
    engine:      'M13 2L4 14h6l-1 8 9-12h-6z',
    raced:       'M5 3v18M5 4h13l-2.5 4L18 12H5',
  }[k] || 'M12 3v18M3 12h18'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="1.9" strokeLinecap="round"
      strokeLinejoin="round"><path d={p} /></svg>
  )
}
