import { C, T, P } from '../lib/theme'
import { A, previewVars } from './theme'
import { DAYS } from '../lib/format'

// A phone-sized preview of the member's view, so a session can be
// written and checked in the same place. Deliberately dumb — it takes
// the same data the app does and renders it the same way, so if it
// looks right here it looks right there.
export default function Preview({ session, blocks, benchmarks = {} }) {
  const kg = mv => {
    if (!mv?.pct_of || !mv?.pct) return null
    const base = benchmarks[mv.pct_of]
    if (!base) return null
    return Math.round(base * mv.pct / 2.5) * 2.5
  }

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: A.mute,
        letterSpacing: '.1em', marginBottom: 10 }}>WHAT THEY SEE</div>

      {/* The phone keeps the member's dark palette — it is showing
          exactly what they will see, so it must not inherit the back
          office's light one. */}
      <div style={{ ...previewVars, width: 300, background: '#0B0A09',
        borderRadius: 26, border: '1px solid #2B2926', padding: 8,
        boxShadow: '0 12px 40px rgba(26,22,19,.22)' }}>
        <div style={{ background: '#0B0A09', borderRadius: 20, overflow: 'hidden',
          height: 560, overflowY: 'auto' }}>

          {session.cover_url ? (
            <div style={{ position: 'relative', height: 168,
              background: `#0B0A09 url(${session.cover_url}) center/cover` }}>
              <div style={{ position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.9))' }} />
              <div style={{ position: 'relative', height: '100%', display: 'flex',
                flexDirection: 'column', justifyContent: 'flex-end', padding: 14,
                color: P.ink }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                  color: P.sub }}>{DAYS[session.day - 1].toUpperCase()}</div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em',
                  marginTop: 3 }}>{session.title}</div>
                <div style={{ fontSize: 11.5, color: P.sub, marginTop: 2 }}>
                  {session.tag}{session.est_min ? ` · ${session.est_min} min` : ''}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '22px 14px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                color: C.mute }}>{DAYS[session.day - 1].toUpperCase()}</div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em',
                marginTop: 5, color: C.ink }}>{session.title}</div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
                {session.tag}{session.est_min ? ` · ${session.est_min} min` : ''}
              </div>
            </div>
          )}

          <div style={{ padding: 12 }}>
            {session.kind === 'rest' ? (
              <div style={{ background: C.card, borderRadius: 13, padding: 13,
                fontSize: 12.5, color: C.ink, lineHeight: 1.6,
                whiteSpace: 'pre-line' }}>
                {session.body || <span style={{ color: C.mute }}>No copy yet.</span>}
              </div>
            ) : blocks.length === 0 ? (
              <div style={{ ...T.body, fontSize: 12.5, padding: '20px 2px' }}>
                No blocks yet.
              </div>
            ) : blocks.map(b => (
              <div key={b.id} style={{ background: C.card, borderRadius: 13,
                padding: 13, marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9,
                  marginBottom: 9 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999,
                    background: C.card3, display: 'grid', placeItems: 'center',
                    fontSize: 10.5, fontWeight: 800, color: C.ink }}>{b.letter}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 800,
                    letterSpacing: '-.02em', color: C.ink }}>{b.label}</div>
                </div>

                {b.scheme && (
                  <span style={{ display: 'inline-block', background: C.card3,
                    borderRadius: 999, padding: '4px 9px', fontSize: 10.5,
                    fontWeight: 700, color: C.ink }}>{b.scheme}</span>
                )}

                {b.block_lines.map(l => {
                  const item = b.block_items.find(x =>
                    x.movements?.name === l.movement)
                  const w = item ? kg(item.movements) : null
                  return (
                    <div key={l.id} style={{ marginTop: 8 }}>
                      <span style={{ color: C.g, fontSize: 12.5, fontWeight: 800 }}>
                        {l.prescription || '—'}
                      </span>{' '}
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                        {l.movement || '—'}
                      </span>
                      {w && <span style={{ fontSize: 12, color: C.g,
                        fontWeight: 700 }}> · {w}kg</span>}
                      {l.sub && <div style={{ fontSize: 11, color: C.sub,
                        marginTop: 2 }}>{l.sub}</div>}
                    </div>
                  )
                })}

                {b.rest_note && (
                  <div style={{ marginTop: 10, paddingTop: 8, textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: C.sub,
                    borderTop: `1px solid ${C.line}` }}>{b.rest_note}</div>
                )}

                {b.coach_notes.length > 0 && (
                  <div style={{ marginTop: 11, paddingTop: 10,
                    borderTop: `1px solid ${C.line}` }}>
                    {b.coach_notes.map(n => (
                      <div key={n.id} style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700,
                          color: C.ink }}>{n.heading || '—'}</div>
                        <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5,
                          marginTop: 2 }}>{n.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: A.mute, marginTop: 11, lineHeight: 1.5,
        width: 300 }}>
        Weights shown against a 120kg squat. Each member sees their own.
      </div>
    </div>
  )
}
