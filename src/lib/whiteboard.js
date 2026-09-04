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

// Past an hour, minutes stop being readable — 100:00 is a number you
// have to do arithmetic on to understand.
const mmss = s => {
  const n = Math.round(s)
  if (n >= 3600) {
    const h = Math.floor(n / 3600)
    const m = Math.round((n % 3600) / 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
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
        qty: s.seconds ? mmss(s.seconds) : null,
        // "Jog" and "Rest" are different instructions and the plan
        // now says which — so don't overwrite it with 'Rest'.
        move: up(norm(s.label)) || 'Rest',
        hint: s.pace ? `${mmss(s.pace)} /km` : null, rest: true }

      // A timed piece already has its number: the clock. Splitting
      // its label as well turned "2 under" into a quantity of 2 and
      // a movement called "Under" — the words are the instruction,
      // not a count.
      if (s.seconds) return {
        qty: mmss(s.seconds), move: up(norm(s.label)),
        hint: s.pace ? `${mmss(s.pace)} /km` : null, rest: false }

      const { qty, move } = split(s.label)
      return {
        qty: qty || (s.metres ? `${s.metres}m` : null),
        move: up(move) || up(norm(s.label)),
        hint: s.pace ? `${mmss(s.pace)} /km` : null,
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

// The session on one line.
//
// A board is the right thing once somebody has opened a session. It's
// the wrong thing on a card in a list, where they're deciding whether
// today is the hard one. For that you want the shape of the session in
// a glance — the shorthand a coach would say out loud:
//
//   6 min warm-up → 5× (2 min @ 5:22 + 2 min @ 4:56 + 2 min @ 4:33)
//   → 5 min cool-down
//
// Same fold as the board, written across instead of down.
export function summaryLine(board) {
  if (!board?.length) return null

  const mins = secs => {
    const m = Math.round(secs / 60)
    return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
                   : `${m} min`
  }

  // A step reads the way it would be said: the distance or duration,
  // then the pace if there is one. Dropping the distance turned
  // "400m in 1:34" into a bare 1:34, which is the number and not the
  // instruction.
  const step = l => {
    const named = l.move && !/^easy$/i.test(l.move)
    return [l.qty, l.hint ? `@ ${l.hint.replace(' /km', '')}`
                          : named ? l.move.toLowerCase() : null]
      .filter(Boolean).join(' ')
  }

  const part = b => {
    // A block that doesn't repeat is one stage, not a list of its
    // parts. Nobody wants the three pieces of a warm-up on a card —
    // they want to know it's six minutes and then the work starts.
    if (b.rounds < 2) {
      return b.seconds ? `${mins(b.seconds)} ${(b.label || '').toLowerCase()}`
                       : (b.label || '').toLowerCase()
    }
    return `${b.rounds}× (${b.lines.map(step).join(' + ')})`
  }

  return board.map(part).filter(Boolean).join(' \u2192 ')
}
