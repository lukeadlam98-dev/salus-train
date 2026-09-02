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
  // Paused time doesn't count. Both clocks get shifted forward by
  // however long the phone was in a pocket, so a session that took
  // fifty minutes with a ten-minute wait for a rower reads as forty.
  const [pausedAt, setPausedAt] = useState(null)
  const [shift, setShift] = useState(0)
  // How many of a rep piece are done. "6 × 100m" is six things, and
  // the screen was showing it as one.
  const [rep, setRep] = useState(0)
  const tick = useRef(null)

  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(tick.current)
  }, [])

  const seg = safe?.[i]
  const clock = pausedAt || now
  const inSeg = Math.floor((clock - segStart) / 1000)
  const total = Math.floor((clock - totalStart - shift) / 1000)
  const timed = !!seg?.seconds
  const left = timed ? seg.seconds - inSeg : null

  // "6 × 100m Strides" is six efforts, not one instruction. Read the
  // count off the front and the screen can say which one you're on.
  const repM = !timed && seg ? String(seg.label).match(/^(\d+)\s*[\u00D7x]\s*(.+)$/i) : null
  const reps = repM ? Math.min(30, parseInt(repM[1], 10)) : 0
  const repLabel = repM ? repM[2].trim() : null

  // Timed segments move themselves on. Standing there tapping next in
  // the middle of a piece is exactly the friction this removes.
  useEffect(() => {
    if (!safe || !timed || pausedAt || left > 0) return
    advance()
  }, [left, safe, pausedAt])

  function advance(extraLap) {
    setLaps(l => [...l, { seconds: inSeg, label: seg.label,
      metres: seg.metres || null, kind: seg.kind || null }])
    if (i + 1 >= safe.length) return done()
    setI(i + 1)
    setSegStart(Date.now())
    setRep(0)
    setPausedAt(null)
    if (seg.kind !== 'rest') setRounds(0)
  }

  // Tapping the screen.
  //
  // Two different jobs, and which one it is has never been ambiguous
  // to the person doing it. A timed piece is counting itself down, so
  // the only thing you'd want mid-piece is to stop the clock — a
  // queue at the rower, a shoelace. An untimed piece is waiting on
  // you, so the tap is "done". Reaching for a specific button with
  // wet hands at minute twenty is the friction; the whole screen is
  // the target now.
  function screenTap() {
    if (timed) return togglePause()
    if (reps && rep + 1 < reps) return setRep(r => r + 1)
    advance(counting ? rounds : null)
  }

  function togglePause() {
    if (pausedAt) {
      const held = Date.now() - pausedAt
      setSegStart(s => s + held)
      setShift(x => x + held)
      setPausedAt(null)
    } else setPausedAt(Date.now())
  }

  function done() {
    onFinish?.({
      seconds: total,
      laps: [...laps, { seconds: inSeg, label: seg?.label,
        metres: seg?.metres || null, kind: seg?.kind || null }],
      rounds,
    })
  }



  // After the hooks, so the rules of hooks hold either way.
  if (!safe || !seg) return null

  const next = safe[i + 1]

  // The bar, grouped the way the session is written. One track per
  // block, weighted by how long the block is, filled by how far into
  // it you are.
  const groups = []
  safe.forEach((s, n) => {
    const key = s.blockLabel || s.block || '\u2014'
    const last = groups[groups.length - 1]
    const w = s.seconds || 90
    if (last && last.key === key) {
      last.weight += w
      if (n < i) last.filled += w
      else if (n === i) last.filled += timed ? Math.min(w, inSeg) : 0
    } else groups.push({ key, weight: w,
      filled: n < i ? w : n === i && timed ? Math.min(w, inSeg) : 0 })
  })
  groups.forEach(g => { g.done = Math.min(1, g.filled / g.weight) })
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
        {/* Where you are in the whole thing.
            Twenty-three dashes is not a progress bar — at that count
            each one is two pixels and the eye reads texture, not
            position. One bar, divided where the session is actually
            divided, filling as you go. */}
        <div style={{ flex: 1, display: 'flex', gap: 3 }}>
          {groups.map((g, n) => (
            <div key={n} style={{ flex: g.weight, height: 5,
              borderRadius: 999, background: C.card2, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(g.done * 100)}%`,
                height: '100%', borderRadius: 999, background: C.g,
                transition: 'width .3s linear' }} />
            </div>
          ))}
        </div>
        <button onClick={onQuit} style={{ background: 'transparent',
          border: 'none', color: C.sub, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: F }}>End</button>
      </div>

      {/* the one instruction — and the tap target */}
      <div onClick={screenTap} role="button" tabIndex={0}
        style={{ flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', textAlign: 'center',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          userSelect: 'none' }}>

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

        <div style={{ fontSize: (reps ? repLabel : seg.label).length > 22
            ? 27 : 38,
          fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.1,
          padding: '0 8px',
          color: TONE[seg.kind] === C.g ? C.g : C.ink }}>
          {reps ? repLabel : seg.label}
        </div>

        {/* Which of the six. The count was in the title before, which
            told you the session and not your place in it. */}
        {reps > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6,
            marginTop: 13, flexWrap: 'wrap', padding: '0 20px' }}>
            {Array.from({ length: reps }).map((_, n) => (
              <span key={n} style={{ width: 13, height: 13, borderRadius: 4,
                background: n < rep ? C.g : n === rep ? C.sub : C.card2 }} />
            ))}
          </div>
        )}

        {timed ? (
          <div style={{ position: 'relative', width: 250, height: 250,
            margin: '18px auto 0' }}>
            <svg width="250" height="250" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="125" cy="125" r={R} fill="none" stroke={C.card2}
                strokeWidth="14" />
              <circle cx="125" cy="125" r={R} fill="none"
                stroke={nearly ? C.g : (TONE[seg.kind] === C.g ? C.g : C.sub)}
                strokeWidth="14" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * gone}
                style={{ transition: 'stroke-dashoffset .3s linear',
                  opacity: pausedAt ? .35 : 1 }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid',
              placeItems: 'center' }}>
              <div>
                <div style={{ fontSize: 60, fontWeight: 900,
                  letterSpacing: '-.06em', lineHeight: 1, ...T.num,
                  color: pausedAt ? C.mute : nearly ? C.g : C.ink }}>
                  {fmt(Math.max(0, left))}
                </div>
                {pausedAt ? (
                  <div style={{ fontSize: 11, fontWeight: 800,
                    letterSpacing: '.16em', color: C.mute, marginTop: 6 }}>
                    PAUSED
                  </div>
                ) : extra?.(seg)}
              </div>
            </div>
          </div>
        ) : (
          /* Nothing is counting down, so nothing should look like it
             is. An empty ring around a number climbing from zero read
             as a timer that had stalled. This is just elapsed. */
          <div style={{ margin: '26px auto 0' }}>
            <div style={{ fontSize: 42, fontWeight: 900,
              letterSpacing: '-.05em', lineHeight: 1, ...T.num,
              color: C.mute }}>
              {fmt(inSeg)}
            </div>
            {extra?.(seg)}
          </div>
        )}

        {seg.note && (
          <div style={{ ...T.body, fontSize: 15, maxWidth: 300,
            margin: '18px auto 0', lineHeight: 1.5 }}>{seg.note}</div>
        )}

        {/* AMRAP and EMOM want a round counter — it's the score */}
        {counting && (
          <button onClick={e => { e.stopPropagation(); setRounds(r => r + 1) }}
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
              maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' }}>
              {next.label}
            </span>
            {/* A pace, if the next piece has one. Knowing a kilometre
                is coming is half of it; knowing what to run it at is
                the half you can act on while you're still resting. */}
            {next.target ? (
              <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink,
                ...T.num, flexShrink: 0 }}>{next.target}</span>
            ) : next.seconds ? (
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.sub,
                ...T.num, flexShrink: 0 }}>{fmt(next.seconds)}</span>
            ) : null}
          </div>
        )}

        <button onClick={() => advance(counting ? rounds : null)}
          style={{ width: '100%', borderRadius: 999,
            padding: timed ? '15px 0' : '22px 0',
            fontSize: timed ? 14.5 : 18, fontWeight: timed ? 600 : 700,
            cursor: 'pointer', fontFamily: F,
            background: timed ? 'transparent' : C.g,
            border: timed ? `1px solid ${C.line}` : 'none',
            outline: 'none', WebkitTapHighlightColor: 'transparent',
            color: timed ? C.sub : C.bg }}>
          {timed ? 'Skip ahead'
            : i + 1 >= safe.length ? 'Finish'
            : 'Done'}
        </button>

        {/* Said once, at the bottom, in the smallest type on the
            screen. Somebody reads it on their first session and never
            needs it again. */}
        <div style={{ textAlign: 'center', fontSize: 11, color: C.mute,
          marginTop: 10 }}>
          {timed ? (pausedAt ? 'Tap the screen to carry on'
                             : 'Tap the screen to pause')
                 : 'Tap the screen when it\u2019s done'}
        </div>
      </div>
    </div>
  )
}
