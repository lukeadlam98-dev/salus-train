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
                                      station1 = null, station2 = null,
                                      restSeconds = 90,
                                      fivekSeconds = null }) {
  const out = [{ kind: 'warmup', seconds: 480, label: 'Warm up',
    note: 'Eight minutes easy, then a couple of strides. You want to be warm before round one, not by round two.' }]

  for (let r = 0; r < rounds; r++) {
    // Race pace, not rep pace — this is a rehearsal, and the whole
    // point is holding the same split when the legs have gone.
    out.push({ kind: 'rep', metres: distance_m, rep: r + 1, reps: rounds,
      label: `${distance_m}m`,
      seconds: fivekSeconds
        ? Math.round(distance_m * (fivekSeconds / 5000) * 1.06) : null,
      note: r === 0
        ? 'Race pace. Whatever you run this one in, you run them all in.'
        : 'Same split as round one. That is the session.' })

    // Stations are tapped, not timed. Forty wall balls takes as long
    // as it takes, and putting a clock on it turns a quality session
    // into a race against the phone.
    if (station1) out.push({ kind: 'station', rep: r + 1, reps: rounds,
      label: station1, note: 'Straight into it, no standing about.' })
    if (station2) out.push({ kind: 'station', rep: r + 1, reps: rounds,
      label: station2, note: 'Then the rest. Tap when it\u2019s done.' })

    if (r < rounds - 1) out.push({ kind: 'rest', seconds: restSeconds,
      rep: r + 1, reps: rounds, label: 'Rest',
      note: 'Breathe. The next kilometre is the same as the last one.' })
  }

  out.push({ kind: 'cool', seconds: 300, label: 'Cool down',
    note: 'Five easy. Don\u2019t skip it — this one takes a while to come down from.' })
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

    case 'speed': return speedSegments(session.run_ladder, 60, fivekSeconds)

    case 'compromised': return compromisedSegments({
      rounds: session.run_reps || 5,
      distance_m: session.run_distance_m || 1000,
      station1: session.station_1, station2: session.station_2,
      restSeconds: session.rest_s || 90,
      fivekSeconds })

    case 'easy':
    case 'long': return easySegments({
      minutes: session.run_minutes || session.est_min || 30 })

    default:
      // Nothing. Not an easy run.
      //
      // This used to fall back to "guide it as a zone 2 run for
      // est_min minutes", which meant a Wednesday that says Warm Up
      // then five rounds of a circuit asked somebody for a seventy
      // minute jog. Inventing a session is worse than admitting we
      // don't know: the session already describes itself in its
      // blocks, and the caller reads those instead.
      return null
  }
}

// ---------------- a pace to aim for ----------------
//
// The plan already knows how long a piece should take when a 5km is
// on file — it just spent that knowledge on a countdown. A countdown
// tells you when you're late; a pace tells you how to run.
//
// Both come from the same number, so this hands back the pace as well
// and the screen can show it before the piece starts rather than
// after.
export const perKm = (seconds, metres) =>
  !seconds || !metres ? null : Math.round(seconds / (metres / 1000))

export const mmss = s => {
  if (!s && s !== 0) return null
  const n = Math.round(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

// A distance written into a label — "1km", "400m", "1km @ race pace".
// Sessions written as blocks don't carry a metres field, so the
// distance is sitting in the text and nowhere else.
export function metresIn(label) {
  const t = String(label || '')
  const km = t.match(/(\d+(?:\.\d+)?)\s*km\b/i)
  if (km) return Math.round(Number(km[1]) * 1000)
  const m = t.match(/(?:^|\s)(\d{2,5})\s*m\b/i)
  if (m) return Number(m[1])
  return null
}

// The same distance, times however many of them there are.
//
// metresIn deliberately reads "6 \u00d7 100m" as 100 — a pace target is
// per rep, not for the set. Adding up a session is the other
// question, and answering it with 100 lost a kilometre of strides.
export function totalMetresIn(label) {
  const one = metresIn(label)
  if (!one) return 0
  const m = String(label || '').match(/^\s*(\d+)\s*[\u00d7x]\s/i)
  return one * (m ? Number(m[1]) : 1)
}

// What this piece should be run at.
//
// Reps get rep pace — a 200 is run harder than a 400, which is the
// coaching point. Anything race-paced gets race pace, deliberately
// slower, because a compromised run is a rehearsal and the split you
// hold on round five is the one that matters.
export function paceTarget(seg, fivekSeconds) {
  if (!fivekSeconds || !seg) return null
  const metres = seg.metres || metresIn(seg.label)
  if (!metres) return null

  const raced = seg.kind === 'race' ||
    /race pace/i.test(String(seg.label || '')) ||
    /race pace/i.test(String(seg.note || ''))
  const f = raced ? 1.06 : (REP_PACE[metres] || 0.92)

  const seconds = Math.round(metres * (fivekSeconds / 5000) * f)
  return { metres, seconds, perKm: perKm(seconds, metres) }
}
