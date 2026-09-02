import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { saveRun, getAerobicZone } from '../lib/data'
import { segmentsFor } from '../lib/runplan'
import { getBenchmarks } from '../lib/data'
import { Card, Label, Btn, Back, Ico, I, page } from '../components/ui'
import Keypad from '../components/Keypad'

// A run, one instruction at a time.
//
// The old version was a stopwatch with a lap button, which is the
// right tool for a stopwatch and the wrong one for "two minutes at two
// under race pace, then two at one under, then two at it, four times".
// Nobody holds that in their head at minute eighteen, and looking it
// up mid-rep is how a session falls apart.
//
// So the screen shows the thing you are doing now, in the largest type
// on the page, and what's next underneath in small. Timed pieces count
// themselves down and move on. Distance pieces wait for a tap, because
// only the runner knows when the 400 is finished.

const COLOUR = {
  warmup: C.card3, cool: C.card3,
  easy: C.card3, mod: 'rgba(255,255,255,.34)', race: C.g,
  rep: C.g, rest: C.card3, station: 'rgba(255,255,255,.34)',
  zone: C.g,
}

export default function Run({ userId, session, onBack, onDone }) {
  const [zone, setZone] = useState(null)
  const [fivek, setFivek] = useState(null)

  useEffect(() => {
    getAerobicZone(userId).then(setZone).catch(() => {})
    getBenchmarks(userId).then(b => setFivek(b?.fivek?.value_s || null))
      .catch(() => {})
  }, [userId])

  // Rebuilt when the 5km lands, so the reps get a target rather than
  // waiting for a tap. Without one they still work, they just ask.
  const plan = segmentsFor(session, fivek)

  // ---- state ----
  const [live, setLive] = useState(false)
  const [i, setI] = useState(0)                 // which segment
  const [segStart, setSegStart] = useState(0)   // when this one began
  const [now, setNow] = useState(0)
  const [totalStart, setTotalStart] = useState(0)
  const [laps, setLaps] = useState([])
  const [manual, setManual] = useState(!plan)
  const [pad, setPad] = useState(null)
  const [entry, setEntry] = useState({
    distance_m: session?.run_distance_m || 5000, seconds: null })
  const [busy, setBusy] = useState(false)
  const tick = useRef(null)

  useEffect(() => {
    if (!live) return
    tick.current = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(tick.current)
  }, [live])

  const seg = plan?.[i]
  const inSeg = live ? Math.floor((now - segStart) / 1000) : 0
  const total = live ? Math.floor((now - totalStart) / 1000) : 0
  const left = seg?.seconds ? seg.seconds - inSeg : null

  // A timed segment moves on by itself. Standing there tapping "next"
  // in the middle of an interval is exactly the friction this screen
  // exists to remove.
  useEffect(() => {
    if (!live || !seg?.seconds) return
    if (left > 0) return
    advance()
  }, [left, live])

  function advance() {
    setLaps(l => [...l, {
      seconds: inSeg,
      distance_m: seg.metres || null,
      is_station: seg.kind === 'station',
      label: seg.label,
    }])
    if (i + 1 >= plan.length) return finish()
    setI(i + 1)
    setSegStart(Date.now())
  }

  function begin() {
    const t = Date.now()
    setLive(true); setI(0); setSegStart(t); setTotalStart(t); setNow(t)
  }

  async function finish() {
    setLive(false); setBusy(true)
    const all = [...laps]
    if (inSeg > 2 && seg) all.push({
      seconds: inSeg, distance_m: seg.metres || null,
      is_station: seg.kind === 'station', label: seg.label })
    const metres = all.reduce((a, l) => a + (l.distance_m || 0), 0)
    const secs = all.reduce((a, l) => a + l.seconds, 0)
    try {
      await saveRun(userId, {
        session_id: session?.id || null,
        kind: session?.run_kind === 'speed' ? 'intervals'
            : session?.run_kind || 'straight',
        distance_m: metres || null, seconds: secs,
      }, all)
      onDone?.()
    } catch (_) { setBusy(false) }
  }

  async function saveManual() {
    if (!entry.seconds) return
    setBusy(true)
    try {
      await saveRun(userId, {
        session_id: session?.id || null,
        kind: session?.run_kind || 'straight',
        distance_m: entry.distance_m, seconds: entry.seconds,
      })
      onDone?.()
    } catch (_) { setBusy(false) }
  }

  /* ================= typing it in afterwards ================= */
  if (manual) return (
    <div style={page}>
      <Back onClick={() => plan ? setManual(false) : onBack()} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>Put the numbers in</h1>
      <p style={{ ...T.body, marginTop: 6 }}>
        For a run you've already done, or one your watch timed.
      </p>

      <Card style={{ marginTop: 22 }} onClick={() => setPad('distance')}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, ...T.small }}>Distance</div>
          <div style={{ fontSize: 22, fontWeight: 800, ...T.num }}>
            {(entry.distance_m / 1000).toFixed(2)}
            <span style={{ fontSize: 13, color: C.sub, marginLeft: 5 }}>km</span>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 10 }} onClick={() => setPad('time')}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, ...T.small }}>Time</div>
          <div style={{ fontSize: 22, fontWeight: 800, ...T.num,
            color: entry.seconds ? C.ink : C.mute }}>
            {entry.seconds ? fmt(entry.seconds) : '—'}
          </div>
        </div>
      </Card>

      <Btn disabled={busy || !entry.seconds} onClick={saveManual}
        style={{ marginTop: 22 }}>{busy ? 'Saving…' : 'Save this run'}</Btn>

      {pad && (
        <Keypad label={pad === 'distance' ? 'metres' : 'time'}
          time={pad === 'time'}
          value={pad === 'distance' ? entry.distance_m : entry.seconds}
          onClose={() => setPad(null)}
          onSave={v => {
            setEntry(e => pad === 'distance'
              ? { ...e, distance_m: v } : { ...e, seconds: v })
            setPad(null)
          }} />
      )}
    </div>
  )

  /* ================= before you start ================= */
  if (!live) return (
    <div style={page}>
      <Back onClick={onBack} />
      <div style={{ marginTop: 20 }}>
        <Label>{(session?.run_kind || 'run').toUpperCase()}</Label>
        <h1 style={{ ...T.h1, marginTop: 7 }}>{session?.title || 'Run'}</h1>
        {session?.body && (
          <p style={{ ...T.body, marginTop: 10, lineHeight: 1.6 }}>
            {session.body}
          </p>
        )}
      </div>

      {zone && ['easy', 'long'].includes(session?.run_kind) && (
        <Card style={{ marginTop: 18, background: C.card2 }}>
          <Label>KEEP IT HERE</Label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8,
            marginTop: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 900,
              letterSpacing: '-.045em', ...T.num, color: C.g }}>
              {zone.low}–{zone.high}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>bpm</div>
          </div>
        </Card>
      )}

      {/* The whole session, before you commit to it */}
      {plan && (
        <>
          <Label style={{ margin: '24px 0 11px' }}>
            {plan.length} PIECES ·{' '}
            {Math.round(plan.reduce((a, s) => a + (s.seconds || 90), 0) / 60)} MIN
          </Label>
          <Card style={{ padding: '4px 15px' }}>
            {plan.map((s, n) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center',
                gap: 12, padding: '11px 0',
                borderTop: n ? `1px solid ${C.line}` : 'none' }}>
                <span style={{ width: 9, height: 9, borderRadius: 3,
                  background: COLOUR[s.kind] || C.card3, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>
                  {s.label}
                  {s.block && (
                    <span style={{ color: C.mute, fontWeight: 500 }}>
                      {' '}· block {s.block}
                    </span>
                  )}
                  {s.rep && (
                    <span style={{ color: C.mute, fontWeight: 500 }}>
                      {' '}· {s.rep} of {s.reps}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.sub, ...T.num }}>
                  {s.seconds ? fmt(s.seconds) : `${s.metres}m`}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <Btn style={{ marginTop: 22 }} onClick={plan ? begin : () => setManual(true)}>
        {plan ? 'Start' : 'Put the numbers in'}
      </Btn>
      {plan && (
        <button onClick={() => setManual(true)} style={{ width: '100%',
          background: 'transparent', border: 'none', color: C.sub,
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
          padding: '16px 0 0' }}>
          Already done it? Put the numbers in
        </button>
      )}
    </div>
  )

  /* ================= running ================= */
  const next = plan[i + 1]
  const timed = !!seg.seconds
  const nearlyDone = timed && left <= 5 && left > 0

  return (
    <div style={{ ...page, paddingBottom: 40, display: 'flex',
      flexDirection: 'column', minHeight: '100dvh' }}>

      {/* where you are overall */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, ...T.num, color: C.sub }}>
          {fmt(total)}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 2 }}>
          {plan.map((s, n) => (
            <div key={n} style={{ flex: s.seconds ? s.seconds : 120, height: 4,
              borderRadius: 999,
              background: n < i ? C.g : n === i ? C.sub : C.card3 }} />
          ))}
        </div>
        <button onClick={finish} style={{ background: 'transparent',
          border: 'none', color: C.sub, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: F }}>End</button>
      </div>

      {/* ---- the one instruction ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', textAlign: 'center', padding: '10px 0' }}>

        {(seg.block || seg.rep) && (
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em',
            color: C.mute, marginBottom: 14 }}>
            {seg.block ? `BLOCK ${seg.block} OF ${seg.blocks}`
                       : `${seg.rep} OF ${seg.reps}`}
          </div>
        )}

        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.04em',
          lineHeight: 1.05,
          color: COLOUR[seg.kind] === C.g ? C.g : C.ink }}>
          {seg.label}
        </div>

        {/* A ring, not just a number.
            Glancing at a phone mid-rep, a shape that is visibly two
            thirds gone reads faster than four digits — you get the
            answer before you've focused on it. The number is still
            there for when you want it. */}
        <div style={{ position: 'relative', width: 250, height: 250,
          margin: '20px auto 0' }}>
          <svg width="250" height="250" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="125" cy="125" r="112" fill="none"
              stroke={C.card2} strokeWidth="14" />
            <circle cx="125" cy="125" r="112" fill="none"
              stroke={nearlyDone ? C.g : (COLOUR[seg.kind] === C.g ? C.g : C.sub)}
              strokeWidth="14" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 112}
              strokeDashoffset={2 * Math.PI * 112 *
                (timed ? Math.min(1, inSeg / seg.seconds) : 0)}
              style={{ transition: 'stroke-dashoffset .3s linear, stroke .3s' }} />
          </svg>

          <div style={{ position: 'absolute', inset: 0, display: 'grid',
            placeItems: 'center' }}>
            <div>
              <div style={{ fontSize: 62, fontWeight: 900,
                letterSpacing: '-.06em', lineHeight: 1, ...T.num,
                color: nearlyDone ? C.g : C.ink, transition: 'color .2s' }}>
                {timed ? fmt(Math.max(0, left)) : fmt(inSeg)}
              </div>
              {seg.kind === 'zone' && zone && (
                <div style={{ fontSize: 15, fontWeight: 700, color: C.g,
                  marginTop: 8, ...T.num }}>
                  {zone.low}–{zone.high} bpm
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...T.body, fontSize: 15, marginTop: 18, maxWidth: 300,
          margin: '18px auto 0', lineHeight: 1.5 }}>
          {seg.note}
        </div>
      </div>

      {/* ---- what's next, and the button ---- */}
      <div>
        {next && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9,
            justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: C.mute }}>Next</span>
            <span style={{ width: 7, height: 7, borderRadius: 2,
              background: COLOUR[next.kind] || C.card3 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.sub }}>
              {next.label}
              {next.seconds ? ` · ${fmt(next.seconds)}` : ` · ${next.metres}m`}
            </span>
          </div>
        )}

        {/* When everything is timed the session runs itself, so the
            button is a quiet override rather than the thing you use.
            It only turns into a real button when a segment genuinely
            needs telling. */}
        <button onClick={advance} disabled={busy}
          style={{ width: '100%', borderRadius: 999,
            padding: timed ? '15px 0' : '22px 0',
            fontSize: timed ? 14.5 : 18, fontWeight: timed ? 600 : 700,
            cursor: 'pointer', fontFamily: F,
            background: timed ? 'transparent' : C.g,
            border: timed ? `1px solid ${C.line}` : 'none',
            color: timed ? C.sub : C.bg }}>
          {timed ? 'Skip ahead'
            : i + 1 >= plan.length ? 'Finish'
            : 'Done — next'}
        </button>
      </div>
    </div>
  )
}
