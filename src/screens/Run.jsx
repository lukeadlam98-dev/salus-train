import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { saveRun, getAerobicZone } from '../lib/data'
import { segmentsFor } from '../lib/runplan'
import { getBenchmarks } from '../lib/data'
import { Card, Label, Btn, Back, Ico, I, page } from '../components/ui'
import Guided from '../components/Guided'
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

  // Guided owns the clock, the segments and the advancing. This screen
  // is now three states: read what's coming, do it, or type in a run
  // you've already done.
  const [live, setLive] = useState(false)
  const [manual, setManual] = useState(false)
  const [pad, setPad] = useState(null)
  const [entry, setEntry] = useState({
    distance_m: session?.run_distance_m || 5000, seconds: null })
  const [busy, setBusy] = useState(false)

  async function finish(result) {
    setLive(false); setBusy(true)
    const all = result?.laps || []
    const metres = all.reduce((a, l) => a + (l.metres || 0), 0)
    const secs = result?.seconds || all.reduce((a, l) => a + (l.seconds || 0), 0)
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
  if (!live || !plan) return (
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
                  {s.seconds ? fmt(s.seconds)
                    : s.metres ? `${s.metres}m` : 'when done'}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <Btn style={{ marginTop: 22 }}
        onClick={() => plan ? setLive(true) : setManual(true)}>
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
  //
  // The same component the metcons use. A run and a metcon are the
  // same problem — a list of things to do in order, read by somebody
  // out of breath — so they should not be two screens that drift
  // apart.
  return (
    <Guided plan={plan} title={session?.title}
      onQuit={finish}
      onFinish={r => finish(r)}
      extra={seg => seg.kind === 'zone' && zone ? (
        <div style={{ fontSize: 15, fontWeight: 700, color: C.g,
          marginTop: 8, ...T.num }}>{zone.low}–{zone.high} bpm</div>
      ) : null} />
  )
}
