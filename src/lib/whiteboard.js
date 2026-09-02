// The session as a whiteboard, not as a queue.
//
// The guided plan is a flat list because that's what running it needs —
// twenty-three things in the order you do them. Showing that same list
// before you start is the mistake: it prints the warm-up twice because
// the warm-up is two rounds, prints the circuit five times because the
// circuit is five rounds, and by the fourth "50 wall balls" nobody is
// reading it. Twenty-three lines to say two things.
//
// A gym whiteboard has never worked that way. It writes the round once
// and puts a number on it. The structure is the information; the
// repetition is what your legs find out later.
//
// So this folds the plan back up: consecutive segments from the same
// block, one cycle of them, with the round count carried on the header.

const norm = s => String(s || '').trim()

// One cycle of a block.
//
// Circuits and intervals number their rounds, so round one is the
// cycle. EMOMs number every minute — alternating minutes means the
// cycle is however many lines it takes before one comes round again.
function cycleOf(segs) {
  if (segs[0]?.kind === 'emom') {
    const seen = []
    for (const s of segs) {
      if (seen.includes(s.label)) break
      seen.push(s.label)
    }
    return segs.slice(0, Math.max(seen.length, 1))
  }
  const rounds = segs.map(s => s.round).filter(Boolean)
  if (!rounds.length) return segs
  const first = Math.min(...rounds)
  return segs.filter(s => (s.round || first) === first)
}

// Split a written line into a quantity and a movement, so the numbers
// can sit in their own column and line up down the card. "50 wall
// balls" is a number and a thing; reading it as one string is what
// makes a list of them look like prose.
const UNIT = '(?:km|m|mi|min|mins|minutes|sec|secs|s|cal|kcal|reps?|rounds?)'
const QTY = new RegExp(
  `^(\\d+(?:\\.\\d+)?\\s*(?:[×x]\\s*\\d+(?:\\.\\d+)?)?\\s*${UNIT}?)\\b\\s*(.*)$`, 'i')

function split(label) {
  const t = norm(label)
  const m = t.match(QTY)
  if (!m || !m[2]) return { qty: null, move: t }
  return { qty: m[1].replace(/\s+/g, ' ').trim(), move: m[2].trim() }
}

const up = s => s ? s[0].toUpperCase() + s.slice(1) : s

const mmss = s => {
  const n = Math.round(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

export function whiteboard(plan) {
  if (!Array.isArray(plan) || !plan.length) return null

  // Group by block, keeping the order they're done in. A session with
  // no block labels at all is one group — still better folded than not.
  const groups = []
  for (const s of plan) {
    const key = norm(s.blockLabel) || '—'
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.segs.push(s)
    else groups.push({ key, segs: [s] })
  }

  return groups.map(g => {
    const rounds = Math.max(1, ...g.segs.map(s => s.rounds || 1))
    const cycle = rounds > 1 ? cycleOf(g.segs) : g.segs

    const lines = cycle.map(s => {
      // Rest is a duration, not a movement — the number is the whole
      // instruction, so it goes in the number column and the word
      // follows it.
      if (s.kind === 'rest') return {
        qty: s.seconds ? mmss(s.seconds) : null, move: 'Rest', rest: true }

      const { qty, move } = split(s.label)
      return {
        qty: qty || (s.seconds ? mmss(s.seconds) : s.metres ? `${s.metres}m` : null),
        move: up(move) || up(norm(s.label)),
        rest: false,
      }
    })

    return {
      label: g.key === '—' ? null : g.key,
      rounds,
      lines,
      seconds: g.segs.reduce((a, s) => a + (s.seconds || 90), 0),
    }
  })
}

// What the header says. Total minutes of the whole thing, and how many
// working rounds are in it, which is the number people actually want
// before they commit.
export const boardSummary = board => ({
  minutes: Math.round(
    board.reduce((a, b) => a + (b.seconds || 0), 0) / 60),
  rounds: board.reduce((a, b) => Math.max(a, b.rounds), 1),
})
