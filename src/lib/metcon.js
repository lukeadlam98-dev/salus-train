// A metcon, turned into a list of things to do.
//
// Thirty-three of them across the block — seven for time, two EMOMs,
// two AMRAPs and twenty-two circuits — and every one was getting a
// small card at the bottom of a set grid while a run got a full screen
// telling you what to do this second. Same problem, worse answer.

// The movements in a block, as a readable line.
const movements = block =>
  (block.block_lines || [])
    .map(l => [l.prescription, l.movement].filter(Boolean).join(' '))
    .filter(Boolean)

export function metconSegments(block) {
  if (!block) return null
  const lines = movements(block)
  const all = lines.join(', ')
  const m = s => Math.round(s / 60)

  switch (block.format) {
    // ---------------- for time ----------------
    // The clock counts up, and the cap is the thing that ends it.
    // Shown as a countdown rather than a count-up, because what you
    // want to know at minute seven is how long is left, not how long
    // it's been.
    case 'fortime': return [
      { kind: 'work', label: all || block.label,
        seconds: block.cap_s || null,
        note: block.cap_s
          ? `For time. ${m(block.cap_s)} minute cap — tap the moment you finish.`
          : 'For time. Tap when you finish.' },
    ]

    // ---------------- AMRAP ----------------
    case 'amrap': return [
      { kind: 'amrap', label: all || block.label,
        seconds: block.window_s || 720,
        note: 'As many rounds as you can. Tap the counter each time round.' },
    ]

    // ---------------- EMOM ----------------
    // Every minute is its own segment, so the screen says which minute
    // and what's in it rather than making somebody count.
    case 'emom': {
      const mins = Math.round((block.window_s || 720) / 60)
      const out = []
      for (let n = 0; n < mins; n++) {
        // Alternating EMOMs are the common shape: odd minutes one
        // thing, even minutes another.
        const which = lines.length > 1 ? lines[n % lines.length] : lines[0]
        out.push({ kind: 'emom', seconds: 60, round: n + 1, rounds: mins,
          label: which || block.label,
          note: n === 0
            ? 'On the minute. Whatever is left of the sixty seconds is your rest.'
            : 'Rest is whatever you have left.' })
      }
      return out
    }

    // ---------------- intervals ----------------
    case 'intervals': {
      const out = []
      const n = block.rounds || 4
      for (let r = 0; r < n; r++) {
        out.push({ kind: 'work', seconds: block.work_s || 40,
          round: r + 1, rounds: n, label: all || block.label,
          note: 'Work.' })
        if (block.rest_s && r < n - 1) out.push({
          kind: 'rest', seconds: block.rest_s, round: r + 1, rounds: n,
          label: 'Rest', note: 'Breathe.' })
      }
      return out
    }

    // ---------------- circuit ----------------
    // A lap of everything, for rounds. Each movement is its own
    // segment, tapped — nobody knows in advance how long ten wall
    // balls takes them on round four.
    case 'circuit': {
      const n = block.rounds || 3
      if (lines.length === 0) return null
      const out = []
      for (let r = 0; r < n; r++) {
        lines.forEach(l => out.push({
          kind: 'work', round: r + 1, rounds: n, label: l,
          note: 'Tap when it\u2019s done.' }))
        if (block.rest_s && r < n - 1) out.push({
          kind: 'rest', seconds: block.rest_s, round: r + 1, rounds: n,
          label: 'Rest', note: null })
      }
      return out
    }

    // ---------------- ladder ----------------
    case 'ladder': {
      const steps = String(block.ladder || '21-15-9').split('-')
      const out = []
      steps.forEach((reps, n) => {
        lines.forEach(l => out.push({
          kind: 'work', round: n + 1, rounds: steps.length,
          label: `${reps} ${l.replace(/^\d+\s*/, '')}`,
          note: 'Tap when it\u2019s done.' }))
      })
      return out
    }

    // Straight sets and supersets stay on the grid. Logging a weight
    // per set is the point of those, and a full-screen countdown would
    // get in the way of it.
    default: return null
  }
}

export const isGuidable = block =>
  ['fortime', 'amrap', 'emom', 'intervals', 'circuit', 'ladder']
    .includes(block?.format)
