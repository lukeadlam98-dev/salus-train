import { useState, useEffect, useRef, Fragment } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { saveRun, getAerobicZone } from '../lib/data'
import { segmentsFor, paceTarget, mmss, totalMetresIn } from '../lib/runplan'
import { sessionSegments } from '../lib/metcon'
import { whiteboard, boardSummary } from '../lib/whiteboard'
import { getSessionDetail } from '../lib/data'
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


export default function Run({ userId, session, onBack, onDone }) {
  const [zone, setZone] = useState(null)
  const [fivek, setFivek] = useState(null)

  useEffect(() => {
    getAerobicZone(userId).then(setZone).catch(() => {})
    getBenchmarks(userId).then(b => setFivek(b?.fivek?.value_s || null))
      .catch(() => {})
  }, [userId])

  // A session written as blocks — a warm-up then five rounds of a
  // circuit — is guided from those. Only sessions with neither a run
  // plan nor blocks fall through to typing the numbers in.
  const [blocks, setBlocks] = useState(null)
  useEffect(() => {
    if (!session?.id) return
    getSessionDetail(session.id).then(setBlocks).catch(() => setBlocks([]))
  }, [session?.id])

  // Rebuilt when the 5km lands, so the reps get a target rather than
  // waiting for a tap. Without one they still work, they just ask.
  const raw = segmentsFor(session, fivek) || sessionSegments(blocks)

  // A pace on every piece we can work one out for. The 5km is already
  // on file and the plan was spending it on a countdown; the same
  // number said as a pace is the thing you can actually run to.
  const plan = raw && raw.map(seg => {
    const t = paceTarget(seg, fivek)
    if (!t) return seg
    return { ...seg,
      target: `${mmss(t.perKm)} /km`,
      // On a 1km these are the same number said twice. Only worth
      // showing when the piece isn't a kilometre — a 400 wants its
      // split, because that's what you look at when you stop.
      targetTime: t.metres === 1000 ? null : mmss(t.seconds),
      targetFor: t.metres >= 1000
        ? `${+(t.metres / 1000).toFixed(2)}km` : `${t.metres}m` }
  })

  // The same plan, folded back into rounds for the read-before-you-start.
  const board = plan ? whiteboard(plan) : null
  const summary = board ? boardSummary(board) : null

  // How far this session actually is.
  //
  // Wednesday is a circuit written as blocks — five kilometres of
  // running scattered between wall balls and a rower. It has no
  // run_distance_m, so the manual form defaulted to 5,000 and asked
  // somebody who'd just done a compromised session to log a 5km. The
  // plan knows: add up what's in it, and if there's nothing to add
  // up, don't ask for a distance at all.
  const planned = plan
    ? plan.reduce((a, s2) => a + (s2.metres || totalMetresIn(s2.label)), 0)
    : 0
  const distanceKnown = planned > 0 || !!session?.run_distance_m

  // Guided owns the clock, the segments and the advancing. This screen
  // is now three states: read what's coming, do it, or type in a run
  // you've already done.
  const [live, setLive] = useState(false)
  const [manual, setManual] = useState(false)
  const [pad, setPad] = useState(null)
  const [entry, setEntry] = useState({ distance_m: null, seconds: null })

  // Filled once the plan is read, not guessed at mount.
  useEffect(() => {
    setEntry(e => e.distance_m ? e
      : { ...e, distance_m: planned || session?.run_distance_m || null })
  }, [planned, session?.run_distance_m])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)

  async function finish(result) {
    setLive(false); setBusy(true); setFailed(null)
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
    } catch (e) {
      // It used to land back on this screen with no explanation, which
      // reads as the app having eaten the session. Say what happened
      // and keep the numbers, so the tap on retry costs nothing.
      setBusy(false)
      setFailed({ result, message: e?.message || 'It didn’t save.' })
    }
  }

  async function saveManual() {
    if (!entry.seconds) return
    setBusy(true)
    try {
      await saveRun(userId, {
        session_id: session?.id || null,
        kind: session?.run_kind || 'straight',
        distance_m: entry.distance_m || null, seconds: entry.seconds,
      })
      onDone?.()
    } catch (_) { setBusy(false) }
  }

  /* ================= typing it in afterwards ================= */
  if (manual) return (
    <div style={page}>
      <Back onClick={() => plan ? setManual(false) : onBack()} />
      <h1 style={{ ...T.h1, marginTop: 20 }}>
        {distanceKnown ? 'Put the numbers in' : 'How long did it take?'}
      </h1>
      <p style={{ ...T.body, marginTop: 6 }}>
        {distanceKnown
          ? 'For a run you’ve already done, or one your watch timed.'
          : `For ${session?.title || 'a session'} you’ve already done. ` +
            'The work is what it is — the time is the part worth keeping.'}
      </p>

      {distanceKnown && (
        <Card style={{ marginTop: 22 }} onClick={() => setPad('distance')}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, ...T.small }}>Distance</div>
            <div style={{ fontSize: 22, fontWeight: 800, ...T.num }}>
              {((entry.distance_m || 0) / 1000).toFixed(2)}
              <span style={{ fontSize: 13, color: C.sub,
                marginLeft: 5 }}>km</span>
            </div>
          </div>
        </Card>
      )}

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
        style={{ marginTop: 22 }}>
        {busy ? 'Saving…' : distanceKnown ? 'Save this run' : 'Save it'}
      </Btn>

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

      {failed && (
        <Card style={{ marginTop: 18, background: C.card2 }}>
          <Label>NOT SAVED</Label>
          <p style={{ ...T.body, marginTop: 8 }}>
            You finished it — the log didn’t go through. {failed.message}
          </p>
          <Btn tone="soft" style={{ marginTop: 14 }} disabled={busy}
            onClick={() => finish(failed.result)}>
            {busy ? 'Saving…' : 'Try again'}
          </Btn>
        </Card>
      )}

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

      {/* The whole session, before you commit to it — written the way
          it would go on a whiteboard.

          One grid, not one per block. Two separate cards each sized
          their own column, so "10 min" and "1km" started at different
          places down the page and the eye had nothing to run down.
          A board has one vertical rule and everything hangs off it —
          which is a single grid with max-content in the first track,
          shared by every line in the session. */}
      {board && (
        <>
          <Label style={{ margin: '26px 0 11px' }}>
            {session?.est_min || summary.minutes} MIN
          </Label>

          <Card style={{ padding: '4px 17px 14px' }}>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              columnGap: 16, alignItems: 'baseline' }}>
              {board.map((b, n) => (
                <Fragment key={n}>
                  <div style={{ gridColumn: '1 / -1', display: 'flex',
                    alignItems: 'center', gap: 10,
                    padding: n ? '22px 0 11px' : '15px 0 11px' }}>
                    <div style={{ ...T.label, color: C.sub, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' }}>
                      {(b.label || 'The work').toUpperCase()}
                    </div>
                    {b.rounds > 1 && (
                      <div style={{ background: C.g, color: C.bg,
                        fontSize: 11, fontWeight: 900, letterSpacing: '.06em',
                        padding: '4px 9px', borderRadius: 7, ...T.num,
                        flexShrink: 0 }}>
                        {b.rounds} ROUNDS
                      </div>
                    )}
                  </div>

                  {b.lines.map((l, i) => (
                    <Fragment key={i}>
                      {/* Numbers left-aligned, not right. Right-aligning
                          them made a ragged left edge that moved on every
                          row — the one edge you actually read down. */}
                      <div style={{ padding: '10px 0',
                        borderTop: `1px solid ${C.line}`,
                        fontSize: 16, fontWeight: 800, letterSpacing: '-.03em',
                        whiteSpace: 'nowrap', ...T.num,
                        color: l.rest ? C.mute : C.ink }}>
                        {l.qty || ''}
                      </div>
                      <div style={{ padding: '10px 0',
                        borderTop: `1px solid ${C.line}`,
                        fontSize: 15, fontWeight: 600, letterSpacing: '-.01em',
                        color: l.rest ? C.mute : C.ink }}>
                        {l.move}
                      </div>
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </div>
          </Card>
        </>
      )}

      <Btn style={{ marginTop: 22 }}
        onClick={() => plan ? setLive(true) : setManual(true)}>
        {plan ? 'Start the workout'
          : distanceKnown ? 'Put the numbers in' : 'Log the time'}
      </Btn>
      {plan && (
        <button onClick={() => setManual(true)} style={{ width: '100%',
          background: 'transparent', border: 'none', color: C.sub,
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
          padding: '16px 0 0' }}>
          {distanceKnown
            ? 'Already done it? Put the numbers in'
            : 'Already done it? Log the time'}
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
      ) : seg.target ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.g,
            ...T.num }}>{seg.target}</div>
          {seg.targetTime && (
            <div style={{ fontSize: 11, fontWeight: 800,
              letterSpacing: '.14em', color: C.mute, marginTop: 3 }}>
              {seg.targetTime} FOR THE {seg.targetFor.toUpperCase()}
            </div>
          )}
        </div>
      ) : null} />
  )
}
