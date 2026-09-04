// Machine paces, worked out from the 2km row.
//
// The 2km is already one of the nine tests, and it is the single
// most informative number a hybrid athlete has for anything with a
// handle on it. Everything below comes out of it.
//
// Why this is arithmetic and not a judgement call: erg pacing is one
// of the few genuinely solved problems in training. Concept2's own
// numbers relate split, watts and calories exactly, and the
// distance-to-distance relationship has been stable for forty years.
// A number a member is going to compare against their mate's on a
// leaderboard should come out the same every time it's asked for,
// work with no signal in the gym basement, and cost nothing to
// produce. That rules out asking a model.
//
// Where a model does earn its place is the other half of the problem
// — a machine nobody has standards for, or a coach's prescription
// written in prose. That needs a key kept server-side, and it is a
// different job from this file.

// ---------------- the relationships ----------------

// Paul's Law. Every doubling of the distance costs about five
// seconds per 500m. Halving it gives five back. It holds well from
// about 500m to 10k, which covers every erg piece in the block.
export const splitFor = (split2k, metres) =>
  !split2k || !metres ? null
    : split2k + 5 * Math.log2(metres / 2000)

// Concept2's power curve: watts are the inverse cube of the pace in
// seconds per metre. This is the machine's own formula, not a model
// of it.
export const wattsFor = split => {
  if (!split) return null
  const perMetre = split / 500
  return 2.80 / (perMetre ** 3)
}

// And the calorie counter on the display, which is a fixed function
// of watts with a 300 kcal/hr floor — that floor is why the calorie
// row on a light athlete flatters them, and why a calorie target has
// to be derived rather than guessed.
export const calsPerHour = watts => !watts ? null : watts * 4 * 0.8604 + 300

// ---------------- the machines ----------------
//
// The ski is the row, a little slower. Same engine, less of it usable
// — no leg drive to speak of, and the smaller muscle mass shows up as
// a consistent few per cent across a whole gym's worth of members.
// The bike is matched on watts instead of split, because its splits
// live on a different scale and comparing them directly is
// meaningless.
const MACHINE = {
  row:  { name: 'row',  factor: 1.00 },
  ski:  { name: 'ski',  factor: 1.06 },
  bike: { name: 'bike', factor: null },   // matched on watts
}

// What a piece on a machine should take, from the member's 2km row.
//
//   ergTarget('1000m ski', 465)    → { seconds, split, label }
//   ergTarget('30 cal row', 465)   → { seconds, split, label }
//
// Returns null when there's nothing to work from, which is the
// correct answer far more often than a plausible number is.
export function ergTarget(label, row2kSeconds) {
  if (!row2kSeconds || !label) return null
  const t = String(label).toLowerCase()

  const machine = /\bski/.test(t) ? MACHINE.ski
    : /\bbike|\bassault|\becho/.test(t) ? MACHINE.bike
    : /\brow|\berg/.test(t) ? MACHINE.row
    : null
  if (!machine) return null

  const split2k = row2kSeconds / 4

  // ---- a distance ----
  const dm = t.match(/(\d+(?:\.\d+)?)\s*(km|m)\b/)
  if (dm) {
    const metres = dm[2] === 'km' ? Number(dm[1]) * 1000 : Number(dm[1])
    if (!metres) return null
    const split = splitFor(split2k, metres) * (machine.factor || 1)
    return {
      seconds: Math.round(split * (metres / 500)),
      split: Math.round(split),
      machine: machine.name,
      per: '500m',
    }
  }

  // ---- calories ----
  //
  // A calorie piece is a power piece wearing a distance costume. Hold
  // the pace the distance would want and the counter arrives when it
  // arrives — so the target is a time, worked back through the
  // machine's own calorie formula.
  const cm = t.match(/(\d+)\s*(?:cal|calorie|kcal)/)
  if (cm) {
    const cals = Number(cm[1])
    if (!cals) return null
    // Pace a calorie piece like a 1k — it's the effort a member is on
    // for a minute or two, which is what these are.
    const split = splitFor(split2k, 1000) * (machine.factor || 1)
    const w = wattsFor(split)
    const perHour = calsPerHour(w)
    if (!perHour) return null
    return {
      seconds: Math.round((cals / perHour) * 3600),
      split: Math.round(split),
      watts: Math.round(w),
      machine: machine.name,
      per: '500m',
    }
  }

  return null
}

// The race legs, for the Me screen. A thousand of each, which is what
// the day actually asks for.
export function racePaces(row2kSeconds) {
  if (!row2kSeconds) return null
  const split2k = row2kSeconds / 4
  const row = splitFor(split2k, 1000)
  const ski = row * MACHINE.ski.factor
  return {
    row:  { split: Math.round(row), seconds: Math.round(row * 2) },
    ski:  { split: Math.round(ski), seconds: Math.round(ski * 2) },
    watts: Math.round(wattsFor(row)),
  }
}
