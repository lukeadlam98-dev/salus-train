import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { Ico, I } from './ui'

// The clock a block actually needs.
//
// An AMRAP counts down and stops. An EMOM counts down inside each
// minute and marks the ones done. For time counts up, and goes red at
// the cap. Straight sets get nothing, because a rest timer nobody
// asked for is just noise.
//
// No sound. A phone beeping in a shared room at seven in the morning
// is worse than looking down.
export default function BlockTimer({ block, onDone }) {
  const f = block.format
  if (!['amrap', 'emom', 'fortime', 'intervals'].includes(f)) return null

  const [running, setRunning] = useState(false)
  const [start, setStart] = useState(null)
  const [now, setNow] = useState(0)
  const [rounds, setRounds] = useState(0)
  const tick = useRef(null)

  useEffect(() => {
    if (!running) return
    tick.current = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(tick.current)
  }, [running])

  const elapsed = running && start ? Math.floor((now - start) / 1000) : 0

  // ---- what the big number says ----
  let big, sub, over = false
  if (f === 'amrap') {
    const left = (block.window_s || 0) - elapsed
    big = fmt(Math.max(0, left))
    sub = left <= 0 ? 'time' : 'left'
    over = left <= 0
  } else if (f === 'emom') {
    const minute = Math.floor(elapsed / 60)
    const inMin = 60 - (elapsed % 60)
    const total = Math.round((block.window_s || 0) / 60)
    big = fmt(inMin)
    sub = `minute ${Math.min(minute + 1, total)} of ${total}`
    over = elapsed >= (block.window_s || 0)
  } else if (f === 'intervals') {
    const cycle = (block.work_s || 0) + (block.rest_s || 0)
    const at = cycle ? elapsed % cycle : 0
    const working = at < (block.work_s || 0)
    const left = working ? (block.work_s - at) : (cycle - at)
    const rep = cycle ? Math.floor(elapsed / cycle) + 1 : 1
    big = fmt(Math.max(0, left))
    sub = `${working ? 'work' : 'rest'} · ${Math.min(rep, block.rounds || rep)} of ${block.rounds || '?'}`
    over = block.rounds && rep > block.rounds
  } else {
    big = fmt(elapsed)
    sub = block.cap_s ? `cap ${fmt(block.cap_s)}` : 'running'
    over = block.cap_s && elapsed >= block.cap_s
  }

  return (
    <div style={{ background: over ? C.gDeep : C.card2, borderRadius: 16,
      padding: '18px 16px', marginTop: 12,
      border: `1px solid ${over ? C.gLine : 'transparent'}`,
      transition: 'background .3s' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.05em',
            lineHeight: .95, ...T.num,
            color: over ? C.g : C.ink }}>{big}</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5 }}>{sub}</div>
        </div>

        {/* AMRAP and EMOM want a round counter more than they want
            anything else — it's the score. */}
        {(f === 'amrap' || f === 'emom') && running && (
          <button onClick={() => setRounds(r => r + 1)}
            style={{ width: 62, height: 62, borderRadius: 999, border: 'none',
              background: C.card3, cursor: 'pointer', fontFamily: F,
              display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 900, ...T.num,
              color: C.ink }}>{rounds}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
              color: C.mute, marginTop: -2 }}>ROUNDS</div>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 15 }}>
        {!running ? (
          <button onClick={() => { setStart(Date.now()); setNow(Date.now());
            setRunning(true) }}
            style={{ flex: 1, border: 'none', background: C.g, borderRadius: 999,
              padding: '14px 0', fontSize: 15, fontWeight: 700, color: C.bg,
              cursor: 'pointer', fontFamily: F }}>
            Start {f === 'fortime' ? 'the clock' : 'this block'}
          </button>
        ) : (
          <>
            <button onClick={() => { setRunning(false); setStart(null) }}
              style={{ flex: 1, border: `1px solid ${C.line}`, background: C.card,
                borderRadius: 999, padding: '14px 0', fontSize: 15,
                fontWeight: 700, color: C.sub, cursor: 'pointer',
                fontFamily: F }}>Reset</button>
            <button onClick={() => { setRunning(false); onDone?.({ elapsed, rounds }) }}
              style={{ flex: 1, border: 'none', background: C.g, borderRadius: 999,
                padding: '14px 0', fontSize: 15, fontWeight: 700, color: C.bg,
                cursor: 'pointer', fontFamily: F }}>Done</button>
          </>
        )}
      </div>
    </div>
  )
}
