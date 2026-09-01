import { useState, useEffect, useRef } from 'react'
import { C, T, F } from '../lib/theme'
import { fmt } from '../lib/format'
import { saveRun, getAerobicZone } from '../lib/data'
import { Card, Label, Btn, Back, Ico, I, page } from '../components/ui'
import Keypad from '../components/Keypad'
import RunPlan from '../components/RunPlan'

const pace = (m, s) => m > 0 && s > 0 ? Math.round(s / (m / 1000)) : null

// Running, logged properly.
//
// The clock runs, you tap Lap, and each rep lands with its own time.
// That's it — no GPS, no map, no route. A member on a treadmill or
// doing 400s on the road needs a lap button and a big number, and
// everything else is somebody else's app.
export default function Run({ userId, session, onBack, onDone }) {
  const compromised = session?.kind === 'run' && session?.run_reps > 1
  const reps = session?.run_reps || 1
  const dist = session?.run_distance_m || 5000

  const [running, setRunning] = useState(false)
  const [start, setStart] = useState(null)
  const [now, setNow] = useState(0)
  const [laps, setLaps] = useState([])
  const [manual, setManual] = useState(false)
  const [pad, setPad] = useState(null)
  const [entry, setEntry] = useState({ distance_m: dist, seconds: null })
  const [busy, setBusy] = useState(false)
  const [zone, setZone] = useState(null)
  const tick = useRef(null)

  useEffect(() => {
    getAerobicZone(userId).then(setZone).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!running) return
    tick.current = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(tick.current)
  }, [running])

  const elapsed = running && start ? Math.floor((now - start) / 1000) : 0
  const lapTotal = laps.reduce((a, l) => a + l.seconds, 0)
  const currentLap = elapsed - lapTotal

  function lap() {
    const isStation = compromised && laps.length % 2 === 1
    setLaps([...laps, {
      seconds: currentLap,
      distance_m: isStation ? null : dist,
      is_station: isStation,
      label: isStation ? 'Station' : `Run ${Math.floor(laps.length / 2) + 1}`,
    }])
  }

  async function finish() {
    setBusy(true)
    const all = currentLap > 0
      ? [...laps, { seconds: currentLap, distance_m: dist,
                    is_station: false, label: `Run ${laps.length + 1}` }]
      : laps
    const total = all.reduce((a, l) => a + l.seconds, 0)
    const metres = all.reduce((a, l) => a + (l.distance_m || 0), 0)
    try {
      await saveRun(userId, {
        session_id: session?.id || null,
        kind: compromised ? 'compromised' : 'straight',
        distance_m: metres, seconds: total,
      }, all)
      onDone?.()
    } catch (e) { setBusy(false) }
  }

  async function saveManual() {
    if (!entry.seconds) return
    setBusy(true)
    try {
      await saveRun(userId, {
        session_id: session?.id || null,
        kind: 'straight',
        distance_m: entry.distance_m,
        seconds: entry.seconds,
      })
      onDone?.()
    } catch (e) { setBusy(false) }
  }

  /* ---------------- typed in afterwards ---------------- */
  if (manual) return (
    <div style={page}>
      <Back onClick={() => setManual(false)} />
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

      {entry.seconds > 0 && (
        <Card style={{ marginTop: 10, background: C.card2 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, ...T.small }}>That's</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.g, ...T.num }}>
              {fmt(pace(entry.distance_m, entry.seconds))}
              <span style={{ fontSize: 12, color: C.sub, marginLeft: 5 }}>/km</span>
            </div>
          </div>
        </Card>
      )}

      <Btn disabled={busy || !entry.seconds} onClick={saveManual}
        style={{ marginTop: 22 }}>{busy ? 'Saving…' : 'Save this run'}</Btn>

      {pad && (
        <Keypad
          label={pad === 'distance' ? 'Distance in metres' : 'Time'}
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

  /* ---------------- the clock ---------------- */
  return (
    <div style={page}>
      <Back onClick={onBack} />
      <div style={{ marginTop: 20 }}>
        <Label>{compromised ? 'COMPROMISED RUNNING' : 'RUNNING'}</Label>
        <h1 style={{ ...T.h1, marginTop: 7 }}>
          {session?.title || 'Run'}
        </h1>
        {/* What this run is actually for. Each kind needs saying
            differently — printing "45 min run" for all of them is how
            people end up doing the same moderate slog three times a
            week. */}
        <RunPlan session={session} zone={zone} />

        {compromised && (
          <p style={{ ...T.body, marginTop: 6 }}>
            {reps} × {dist}m with a station between each. Tap Lap when you start
            and finish a station — the app keeps them apart.
          </p>
        )}
      </div>

      {/* the clock */}
      <div style={{ textAlign: 'center', margin: '34px 0 8px' }}>
        <div style={{ fontSize: 66, fontWeight: 900, letterSpacing: '-.055em',
          lineHeight: 1, ...T.num }}>{fmt(elapsed)}</div>
        {running && (
          <div style={{ fontSize: 15, color: C.sub, marginTop: 8, ...T.num }}>
            {laps.length > 0 && `lap ${fmt(currentLap)} · `}
            {compromised && laps.length % 2 === 1 ? 'on a station' : 'running'}
          </div>
        )}
      </div>

      {/* laps */}
      {laps.length > 0 && (
        <Card style={{ marginTop: 18, padding: '4px 15px' }}>
          {laps.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 0',
              borderTop: i ? `1px solid ${C.line}` : 'none',
              opacity: l.is_station ? .65 : 1 }}>
              <div style={{ width: 62, fontSize: 12, color: C.mute,
                fontWeight: 600 }}>{l.label}</div>
              <div style={{ flex: 1, fontSize: 12.5, color: C.sub, ...T.num }}>
                {l.distance_m ? `${fmt(pace(l.distance_m, l.seconds))}/km` : ''}
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, ...T.num }}>
                {fmt(l.seconds)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* controls */}
      <div style={{ marginTop: 24 }}>
        {!running ? (
          <>
            <Btn onClick={() => { setStart(Date.now()); setNow(Date.now());
              setRunning(true) }}>Start the clock</Btn>
            <button onClick={() => setManual(true)} style={{ width: '100%',
              background: 'transparent', border: 'none', color: C.sub,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
              padding: '16px 0 0' }}>
              Already done it? Put the numbers in
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={lap} style={{ flex: 1, border: `1px solid ${C.line}`,
              background: C.card, borderRadius: 999, padding: '17px 0',
              fontSize: 15.5, fontWeight: 700, color: C.ink, cursor: 'pointer',
              fontFamily: F }}>Lap</button>
            <button onClick={finish} disabled={busy}
              style={{ flex: 1, border: 'none', background: C.g, borderRadius: 999,
                padding: '17px 0', fontSize: 15.5, fontWeight: 700, color: C.bg,
                cursor: 'pointer', fontFamily: F }}>
              {busy ? 'Saving…' : 'Finish'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
