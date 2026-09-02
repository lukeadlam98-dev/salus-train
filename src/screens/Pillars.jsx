import { useState, useEffect } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { getPillars, getTargets } from '../lib/data'
import { Card, Label, Ico, I, Sheet, Btn } from '../components/ui'

// Where you actually are, in three parts.
//
// A single score tells you where you rank. It doesn't tell you what to
// do on Monday. Four do — and the gap between them is the whole answer,
// because HYROX rewards the athlete with no weakness far more than the
// one with a standout strength.
//
// Wall balls sit inside the engine rather than being a pillar of their
// own — one test doesn't make a category, and a hundred wall balls at
// the end of a race is an aerobic problem far more than a strength
// one, which is why people who can squat break at thirty.
//
// The sled isn't tested at all. Surface, sled type and what "race
// weight" means all vary by floor, so the number would be about the
// gym as much as the athlete.
//
// Everything is relative to bodyweight. An 80kg member pressing 60 is
// in better shape for eight kilometres of running than a 110kg member
// pressing 70, and an absolute number says the opposite.

const ADVICE = {
  Lower: {
    low:  'The sleds, the lunges and the last two kilometres all come out of here. Two lower sessions a week and stay with them — this moves slowly but it moves.',
    mid:  'Enough to get round. More would help the sleds, though not at the cost of running.',
    high: 'Well ahead of what the racing asks. Any more is spent effort — put it into the engine.',
  },
  Upper: {
    low:  'Pulling is usually the gap. Carries, rows and pull-ups three times a week, and the farmers carry stops being the thing that ends your race.',
    mid:  'Solid. Grip is the part that fails first, so keep the carries heavy rather than long.',
    high: 'Strong. Nothing overhead or hanging will be what costs you.',
  },
  Engine: {
    low:  'This is where the time is. Eight kilometres is most of a race and running is the cheapest thing to improve — add easy volume before anything else.',
    mid:  'Solid. The intervals are what turn this into race pace rather than just fitness.',
    high: 'Strong. Don\u2019t let it slip while you chase the others.',
  },
  Speed: {
    low:  'You have one gear. That is fine until somebody goes past you on the last run and you cannot answer. The Monday ladder is exactly this.',
    mid:  'Enough to change pace when you need to.',
    high: 'Quick. Speed holds better than fitness does, so this can tick over while you build elsewhere.',
  },
}

// The band a score sits in, and its colour. Four steps rather than
// three, because "fine" and "strong" are different instructions and
// collapsing them loses the difference between hold it and build it.
const band = v =>
  v == null ? null
    : v < 45 ? { key: 'low',  label: 'Needs the work', c: C.weak }
    : v < 62 ? { key: 'mid',  label: 'Getting there',  c: C.mid  }
    : v < 80 ? { key: 'mid',  label: 'Strong',         c: C.good }
    :          { key: 'high', label: 'Well ahead',     c: C.best }

export default function Pillars({ userId }) {
  const [rows, setRows] = useState([])
  const [targets, setTargets] = useState([])
  const [ready, setReady] = useState(false)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    Promise.all([
      getPillars(userId).then(setRows),
      getTargets(userId).then(setTargets).catch(() => {}),
    ]).finally(() => setReady(true))
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
  const spread = scored.length > 1
    ? Math.round(Math.max(...scored.map(r => r.score)) -
                 Math.min(...scored.map(r => r.score)))
    : 0

  // A weakness has to be a real gap. Marking the lower of 70 and 72 as
  // WEAKEST is technically true and useless — it tells someone their
  // best thing is their problem, which is how a member stops trusting
  // the screen.
  const weakest = spread >= 10
    ? [...scored].sort((a, b) => a.score - b.score)[0]
    : null

  return (
    <>
      {/* ---- the three ---- */}
      {rows.map(r => {
        const v = r.score == null ? null : Number(r.score)
        const b = band(v)
        const isWeak = weakest && r.pillar === weakest.pillar

        return (
          <Card key={r.pillar} style={{ marginBottom: 10,
            border: `1px solid ${isWeak ? C.weak + '55' : 'transparent'}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                  {r.pillar}
                  {isWeak && (
                    <span style={{ fontSize: 9.5, fontWeight: 800,
                      letterSpacing: '.1em', color: C.weak,
                      marginLeft: 9 }}>START HERE</span>
                  )}
                </div>
                {b && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: b.c,
                    marginTop: 3 }}>{b.label}</div>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900,
                letterSpacing: '-.045em', ...T.num,
                color: b ? b.c : C.mute }}>
                {v ?? '—'}
              </div>
            </div>

            {/* the bar, with each test marked on it */}
            <div style={{ position: 'relative', height: 6, borderRadius: 999,
              background: C.card3, marginTop: 11, overflow: 'hidden' }}>
              {v != null && (
                <div style={{ position: 'absolute', inset: 0,
                  width: `${Math.min(v, 100)}%`, background: b.c,
                  borderRadius: 999,
                  animation: `fill .9s cubic-bezier(.16,.9,.3,1) both` }} />
              )}
            </div>

            {/* what's inside it */}
            {/* Each test, with what it would take to move up. A score
                is a grade; a number on the bar is an instruction. */}
            {r.detail && (
              <div style={{ marginTop: 12 }}>
                {Object.entries(r.detail)
                  .filter(([, val]) => val != null)
                  .map(([k, val], n) => {
                    const t = targets.find(x => x.label === k)
                    return (
                      <div key={k} style={{ display: 'flex',
                        alignItems: 'center', gap: 10, padding: '8px 0',
                        borderTop: n ? `1px solid ${C.line}` : 'none' }}>
                        <div style={{ width: 26, fontSize: 13, fontWeight: 800,
                          ...T.num, color: band(val)?.c || C.mute }}>{val}</div>
                        <div style={{ flex: 1, fontSize: 13 }}>{k}</div>
                        {t?.next_value && t?.next_band && (
                          <div style={{ fontSize: 12, color: C.mute }}>
                            {t.unit === 'time'
                              ? fmt(Number(t.next_value))
                              : `${Math.round(Number(t.next_value))}${
                                  t.unit === 'kg' ? 'kg' : ''}`}
                            {' '}for {t.next_band}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            {b && (
              <div style={{ ...T.small, fontSize: 12.5, marginTop: 12,
                paddingTop: 11, borderTop: `1px solid ${C.line}`,
                lineHeight: 1.55 }}>
                {ADVICE[r.pillar]?.[b.key]}
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
              <>You're even across all four at around {overall}. That's the
              profile hybrid racing rewards — no weakness to fall
              through. Push them up together rather than chasing one.</>
            ) : (
              <>Your {weakest.pillar.toLowerCase()} is {spread} points behind
              your best. In a race that gap costs more than your strongest
              area gains, because the whole thing has to be got through
              regardless. {weakest.weakest
                ? `Start with the ${weakest.weakest.toLowerCase()}.` : ''}</>
            )}
          </div>
        </Card>
      )}
    </>
  )
}
