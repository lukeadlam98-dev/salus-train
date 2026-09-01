import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { getPillars } from '../lib/data'
import { Card, Label } from '../components/ui'

// Where you actually are, in three parts.
//
// A single score tells you where you rank. It doesn't tell you what to
// do on Monday. Three do — and the gap between them is the whole
// answer, because HYROX rewards the athlete with no weakness far more
// than the one with a standout strength.
//
// Everything is relative to bodyweight. An 80kg member pressing 60 is
// in better shape for eight kilometres of running than a 110kg member
// pressing 70, and an absolute number says the opposite.

const ADVICE = {
  Strength: {
    low:  'The sleds and the lunges will be the thing that ends your race. Two strength sessions a week, and stay with them — this moves slowly but it moves.',
    mid:  'Enough to get round. More would help the sleds, but not at the cost of running.',
    high: 'Well ahead of what the race asks. Any more is spent effort — put it into the engine.',
  },
  Engine: {
    low:  'This is where the time is. Eight kilometres is most of a HYROX and running is the cheapest thing to improve — add easy volume before anything else.',
    mid:  'Solid. The intervals are what turn this into race pace rather than just fitness.',
    high: 'Strong. Don\u2019t let it slip while you chase the other two.',
  },
  Stations: {
    low:  'Technique, not fitness. Ten minutes on sled position and wall ball rhythm is worth more than another session.',
    mid:  'Fine. The gains left here are in transitions and pacing rather than capacity.',
    high: 'The stations won\u2019t be what costs you. Spend the time running.',
  },
}

export default function Pillars({ userId }) {
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getPillars(userId).then(setRows).finally(() => setReady(true))
  }, [userId])

  if (!ready) return null

  const scored = rows.filter(r => r.score != null)
  if (scored.length === 0) return (
    <Card>
      <div style={{ ...T.small, lineHeight: 1.6 }}>
        Do the tests and this fills in — strength, engine and stations
        scored separately, so you can see which one is holding you back
        rather than just where you rank.
      </div>
    </Card>
  )

  const overall = Math.round(
    scored.reduce((a, r) => a + Number(r.score), 0) / scored.length)
  const weakest = [...scored].sort((a, b) => a.score - b.score)[0]
  const spread = scored.length > 1
    ? Math.round(Math.max(...scored.map(r => r.score)) -
                 Math.min(...scored.map(r => r.score)))
    : 0

  return (
    <>
      {/* ---- the three ---- */}
      {rows.map(r => {
        const v = r.score == null ? null : Number(r.score)
        const band = v == null ? null : v < 45 ? 'low' : v < 72 ? 'mid' : 'high'
        const isWeak = weakest && r.pillar === weakest.pillar && scored.length > 1

        return (
          <Card key={r.pillar} style={{ marginBottom: 10,
            border: `1px solid ${isWeak ? C.gLine : 'transparent'}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, flex: 1 }}>
                {r.pillar}
                {isWeak && (
                  <span style={{ fontSize: 9.5, fontWeight: 800,
                    letterSpacing: '.1em', color: C.g,
                    marginLeft: 9 }}>WEAKEST</span>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900,
                letterSpacing: '-.045em', ...T.num,
                color: v == null ? C.mute : C.ink }}>
                {v ?? '—'}
              </div>
            </div>

            {/* the bar, with each test marked on it */}
            <div style={{ position: 'relative', height: 6, borderRadius: 999,
              background: C.card3, marginTop: 11, overflow: 'hidden' }}>
              {v != null && (
                <div style={{ position: 'absolute', inset: 0,
                  width: `${Math.min(v, 100)}%`, background: C.g,
                  borderRadius: 999, transition: 'width .5s' }} />
              )}
            </div>

            {/* what's inside it */}
            {r.detail && (
              <div style={{ display: 'flex', gap: 14, marginTop: 11,
                flexWrap: 'wrap' }}>
                {Object.entries(r.detail)
                  .filter(([, val]) => val != null)
                  .map(([k, val]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'baseline',
                      gap: 5 }}>
                      <span style={{ fontSize: 11.5, color: C.mute }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: 700,
                        ...T.num }}>{val}</span>
                    </div>
                  ))}
              </div>
            )}

            {band && (
              <div style={{ ...T.small, fontSize: 12.5, marginTop: 12,
                paddingTop: 11, borderTop: `1px solid ${C.line}`,
                lineHeight: 1.55 }}>
                {ADVICE[r.pillar]?.[band]}
              </div>
            )}

            {v == null && (
              <div style={{ ...T.small, fontSize: 12.5, marginTop: 10 }}>
                {r.pillar === 'Strength'
                  ? 'Needs your bodyweight and at least one lift.'
                  : 'No tests in yet.'}
              </div>
            )}
          </Card>
        )
      })}

      {/* ---- the gap between them is the real answer ---- */}
      {scored.length > 1 && (
        <Card style={{ background: C.card2, marginTop: 4 }}>
          <Label>WHAT THIS ADDS UP TO</Label>
          <div style={{ ...T.body, fontSize: 14, marginTop: 9,
            lineHeight: 1.6 }}>
            {spread < 12 ? (
              <>You're even across all three at around {overall}. That's the
              profile a HYROX rewards — no weakness to fall through. Push
              everything up together rather than chasing one.</>
            ) : (
              <>Your {weakest.pillar.toLowerCase()} is {spread} points behind
              your best. In a race that gap costs more than your strongest
              area gains, because every station has to be got through
              regardless. {weakest.weakest
                ? `Start with the ${weakest.weakest.toLowerCase()}.` : ''}</>
            )}
          </div>
        </Card>
      )}
    </>
  )
}
