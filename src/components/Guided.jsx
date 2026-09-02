import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { Ico, I } from './ui'

// One instruction, filling the screen.
//
// This started as the run screen and is now shared, because a run and
// a metcon have the same problem: a list of things to do in order,
// most of them timed, being read by somebody who is out of breath and
// holding a phone. The answer is the same in both places — show the
// thing you are doing now, count it down, move on by yourself.
//
// A caller passes a list of segments. Timed ones advance on their own.
// Ones with no duration wait for a tap, because only the person doing
// forty wall balls knows when they are finished.

export const TONE = {
  warmup: C.card3, cool: C.card3, rest: C.card3,
  easy: C.card3, mod: 'rgba(255,255,255,.34)',
  race: C.g, rep: C.g, work: C.g, zone: C.g,
  station: 'rgba(255,255,255,.34)',
}

export default function Guided({ plan, title, onFinish, onQuit, extra }) {
  // A caller can hand us nothing — a run with no plan on it, a block
  // whose format we don't guide. Reading plan[0] off null takes the
  // whole screen down, which is how one missing field turns into "the
  // app is broken".
  const safe = Array.isArray(plan) && plan.length ? plan : null

  const [i, setI] = useState(0)
  const [segStart, setSegStart] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const [rounds, setRounds] = useState(0)
  const [laps, setLaps] = useState([])
  const [totalStart] = useState(Date.now())
  const tick = useRef(null)

  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(tick.current)
  }, [])

  const seg = safe?.[i]
  const inSeg = Math.floor((now - segStart) / 1000)
  const total = Math.floor((now - totalStart) / 1000)
  const timed = !!seg?.seconds
  const left = timed ? seg.seconds - inSeg : null

  // Timed segments move themselves on. Standing there tapping next in
  // the middle of a piece is exactly the friction this removes.
  useEffect(() => {
    if (!safe || !timed || left > 0) return
    advance()
  }, [left, safe])

  function advance(extraLap) {
    setLaps(l => [...l, { seconds: inSeg, label: seg.label,
      metres: seg.metres || null, rounds: extraLap ?? null }])
    if (i + 1 >= safe.length) return done()
    setI(i + 1)
    setSegStart(Date.now())
    if (seg.kind !== 'rest') setRounds(0)
  }

  function done() {
    onFinish?.({
      seconds: total,
      laps: [...laps, { seconds: inSeg, label: seg?.label }],
      rounds,
    })
  }



  // After the hooks, so the rules of hooks hold either way.
  if (!safe || !seg) return null

  const next = safe[i + 1]
  const nearly = timed && left <= 5 && left > 0
  const counting = seg.kind === 'amrap' || seg.kind === 'emom'
  const R = 112, CIRC = 2 * Math.PI * R
  const gone = timed ? Math.min(1, inSeg / seg.seconds) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 150,
      display: 'flex', flexDirection: 'column',
      padding: 'calc(18px + env(safe-area-inset-top)) 16px ' +
               'calc(22px + env(safe-area-inset-bottom))' }}>

      {/* where you are in the whole thing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, ...T.num, color: C.sub }}>
          {fmt(total)}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 2 }}>
          {safe.map((s, n) => (
            <div key={n} style={{ flex: s.seconds || 90, height: 4,
              borderRadius: 999,
              background: n < i ? C.g : n === i ? C.sub : C.card3 }} />
          ))}
        </div>
        <button onClick={onQuit} style={{ background: 'transparent',
          border: 'none', color: C.sub, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: F }}>End</button>
      </div>

      {/* the one instruction */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', textAlign: 'center' }}>

        {/* Which part of the session, then which round of it. A
            warm-up circuit and the work circuit both say "round 2 of
            5" otherwise, and there's no way to tell them apart. */}
        {(seg.blockLabel || seg.round || seg.rep || seg.block) && (
          <div style={{ marginBottom: 14 }}>
            {seg.blockLabel && (
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.sub,
                marginBottom: 5 }}>{seg.blockLabel}</div>
            )}
            {(seg.round || seg.rep || seg.block) && (
              <div style={{ fontSize: 12, fontWeight: 800,
                letterSpacing: '.16em', color: C.mute }}>
                {seg.block ? `BLOCK ${seg.block} OF ${seg.blocks}`
                  : seg.round ? `ROUND ${seg.round} OF ${seg.rounds}`
                  : `${seg.rep} OF ${seg.reps}`}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: seg.label.length > 22 ? 27 : 38,
          fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.1,
          padding: '0 8px',
          color: TONE[seg.kind] === C.g ? C.g : C.ink }}>
          {seg.label}
        </div>

        <div style={{ position: 'relative', width: 250, height: 250,
          margin: '18px auto 0' }}>
          <svg width="250" height="250" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="125" cy="125" r={R} fill="none" stroke={C.card2}
              strokeWidth="14" />
            <circle cx="125" cy="125" r={R} fill="none"
              stroke={nearly ? C.g : (TONE[seg.kind] === C.g ? C.g : C.sub)}
              strokeWidth="14" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * gone}
              style={{ transition: 'stroke-dashoffset .3s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid',
            placeItems: 'center' }}>
            <div>
              <div style={{ fontSize: 60, fontWeight: 900,
                letterSpacing: '-.06em', lineHeight: 1, ...T.num,
                color: nearly ? C.g : C.ink }}>
                {timed ? fmt(Math.max(0, left)) : fmt(inSeg)}
              </div>
              {extra?.(seg)}
            </div>
          </div>
        </div>

        {seg.note && (
          <div style={{ ...T.body, fontSize: 15, maxWidth: 300,
            margin: '18px auto 0', lineHeight: 1.5 }}>{seg.note}</div>
        )}

        {/* AMRAP and EMOM want a round counter — it's the score */}
        {counting && (
          <button onClick={() => setRounds(r => r + 1)}
            style={{ margin: '20px auto 0', width: 128, height: 62,
              borderRadius: 16, border: `1px solid ${C.line}`,
              background: C.card2, cursor: 'pointer', fontFamily: F,
              display: 'grid', placeItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, ...T.num,
              color: C.ink }}>{rounds}</div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
              color: C.mute, marginTop: -2 }}>
              {seg.kind === 'emom' ? 'MINUTES DONE' : 'ROUNDS'}
            </div>
          </button>
        )}
      </div>

      {/* what's next, and the button */}
      <div>
        {next && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9,
            justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.mute }}>Next</span>
            <span style={{ width: 7, height: 7, borderRadius: 2,
              background: TONE[next.kind] || C.card3 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.sub,
              maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' }}>
              {next.label}
              {next.seconds ? ` · ${fmt(next.seconds)}` : ''}
            </span>
          </div>
        )}

        <button onClick={() => advance(counting ? rounds : null)}
          style={{ width: '100%', borderRadius: 999,
            padding: timed ? '15px 0' : '22px 0',
            fontSize: timed ? 14.5 : 18, fontWeight: timed ? 600 : 700,
            cursor: 'pointer', fontFamily: F,
            background: timed ? 'transparent' : C.g,
            border: timed ? `1px solid ${C.line}` : 'none',
            color: timed ? C.sub : C.bg }}>
          {timed ? 'Skip ahead'
            : i + 1 >= safe.length ? 'Finish'
            : 'Done — next'}
        </button>
      </div>
    </div>
  )
}
