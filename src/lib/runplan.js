// Turning a run session into a list of things to do, one at a time.
//
// A stopwatch and a lap button is the right tool for a stopwatch. It
// is the wrong tool for "two minutes at two under race pace, then two
// at one under, then two at it, four times" — nobody holds that in
// their head at minute eighteen.
//
// So the session becomes a queue of segments and the screen shows one.

// ---------------- intervals ----------------
//
// Six minutes of warm-up building to race pace, then N blocks. Under
// week six a block is three two-minute pieces; from week six it's a
// ten-minute block of 3 easy, 3 moderate, 4 at or above race pace.
export function intervalSegments({ minutes = 24, blocks = 4 }) {
  const long = minutes >= 60
  const out = [
    { kind: 'warmup', seconds: 120, label: 'Warm up',
      note: 'Easy. Just moving.' },
    { kind: 'warmup', seconds: 120, label: 'Build',
      note: 'A notch quicker.' },
    { kind: 'warmup', seconds: 120, label: 'Up to pace',
      note: 'Find race pace and hold it briefly.' },
  ]

  for (let b = 0; b < blocks; b++) {
    if (long) {
      out.push({ kind: 'easy',  seconds: 180, block: b + 1, blocks,
        label: 'Easy',     note: 'Recovery pace, but keep running.' })
      out.push({ kind: 'mod',   seconds: 180, block: b + 1, blocks,
        label: 'Moderate', note: 'A kilometre an hour under race pace.' })
      out.push({ kind: 'race',  seconds: 240, block: b + 1, blocks,
        label: 'Race pace', note: 'This is the one that counts.' })
    } else {
      out.push({ kind: 'easy',  seconds: 120, block: b + 1, blocks,
        label: '2 under',  note: 'Two kilometres an hour under race pace.' })
      out.push({ kind: 'mod',   seconds: 120, block: b + 1, blocks,
        label: '1 under',  note: 'One under. Still comfortable.' })
      out.push({ kind: 'race',  seconds: 120, block: b + 1, blocks,
        label: 'Race pace', note: 'Hold it. Next block starts easy again.' })
    }
  }

  out.push({ kind: 'cool', seconds: 300, label: 'Cool down',
    note: 'Easy for five, then you\u2019re done.' })
  return out
}

// ---------------- speed ----------------
//
// "5 × 400m, 3 × 300m, 2 × 200m" becomes ten reps with a minute
// between each.
//
// Given a 5km time we can say how long a 400 should take, so the rep
// runs on a clock like everything else and the whole session goes
// start to finish without touching the phone. The shorter the rep the
// faster it goes — a 200 is run harder than a 400 — which is the
// coaching point, and now it's in the target rather than in a note
// nobody reads mid-rep.
//
// Without a 5km it falls back to a tap, because a made-up target is
// worse than asking.
const REP_PACE = {          // as a fraction of 5km pace
  200: 0.86, 300: 0.89, 400: 0.91, 500: 0.93, 600: 0.95, 800: 0.97,
}

export function speedSegments(ladder = '10 × 200m', restSeconds = 60,
                              fivekSeconds = null) {
  const parts = String(ladder).split(',').map(p => p.trim())
  const reps = []
  parts.forEach(p => {
    const m = p.match(/(\d+)\s*[×x]\s*(\d+)\s*m/i)
    if (!m) return
    const [, count, metres] = m
    for (let i = 0; i < Number(count); i++) {
      reps.push({ metres: Number(metres) })
    }
  })

  const out = [{ kind: 'warmup', seconds: 600, label: 'Warm up',
    note: 'Ten minutes easy, then a few strides.' }]

  reps.forEach((r, i) => {
    const t = target(r.metres, fivekSeconds)
    out.push({ kind: 'rep', metres: r.metres, rep: i + 1, reps: reps.length,
      label: `${r.metres}m`, seconds: t,
      note: t ? 'Hold this the whole way. Same effort as the first one.'
              : 'Above race pace. Tap when you finish.' })
    if (i < reps.length - 1) {
      out.push({ kind: 'rest', seconds: restSeconds, rep: i + 1,
        reps: reps.length, label: 'Rest',
        note: 'Walk or jog. Get the breathing back before the next one.' })
    }
  })

  out.push({ kind: 'cool', seconds: 300, label: 'Cool down',
    note: 'Five easy.' })
  return out
}

// ---------------- compromised ----------------
//
// The HYROX one. Run, station, run, station — distance and work
// alternating, so both are tapped rather than timed.
// How long a rep of this distance should take, from their 5km.
function target(metres, fivek) {
  if (!fivek) return null
  const pace = fivek / 5000                 // seconds per metre
  const f = REP_PACE[metres] || 0.92
  return Math.round(metres * pace * f)
}

export function compromisedSegments({ rounds = 5, distance_m = 1000,
                                      station = 'the station',
                                      fivekSeconds = null }) {
  const out = [{ kind: 'warmup', seconds: 480, label: 'Warm up',
    note: 'Eight minutes easy, then a couple of strides.' }]
  for (let r = 0; r < rounds; r++) {
    out.push({ kind: 'rep', metres: distance_m, rep: r + 1, reps: rounds,
      label: `${distance_m}m`,
      // Race pace, not rep pace — this is the race rehearsal.
      seconds: fivekSeconds
        ? Math.round(distance_m * (fivekSeconds / 5000) * 1.06) : null,
      note: 'Race pace. Straight into the station after.' })
    out.push({ kind: 'station', rep: r + 1, reps: rounds,
      label: station, note: 'Straight into it. Tap when it\u2019s done.' })
  }
  out.push({ kind: 'cool', seconds: 300, label: 'Cool down', note: 'Five easy.' })
  return out
}

// ---------------- easy and long ----------------
//
// One segment. The whole session is "keep the heart rate here for this
// long", and breaking that into pieces would be inventing structure
// that isn't in the session.
export function easySegments({ minutes = 30 }) {
  return [{ kind: 'zone', seconds: minutes * 60, label: 'Zone 2',
    note: 'Conversational. If you can\u2019t talk, slow down.' }]
}

export function segmentsFor(session, fivekSeconds = null) {
  switch (session?.run_kind) {
    case 'intervals': return intervalSegments({
      minutes: session.run_minutes, blocks: session.run_blocks })
    case 'speed':     return speedSegments(session.run_ladder, 60, fivekSeconds)
    case 'easy':
    case 'long':      return easySegments({ minutes: session.run_minutes })
    default:
      if (session?.run_reps > 1) return compromisedSegments({
        rounds: session.run_reps, distance_m: session.run_distance_m,
        fivekSeconds })
      return null
  }
}
