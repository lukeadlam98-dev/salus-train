// Salus Train — palette and type.
// Bone is the standard; light is there for daylight use.

// One palette. There was a light theme and a switcher, which was me
// hedging rather than deciding — an app used in a dark room at six in
// the morning has one right answer, and offering two just means both
// are half-considered. The back office keeps its own light palette
// because that's a different room.
// Monochrome.
//
// Eight values, no hue. The accent isn't a colour — it's simply the
// brightest step, one above body text. That means state has to be
// carried by value, weight and fill instead, which is a stricter
// system than colour and the reason it reads as considered rather
// than plain.
//
// Warmth is in the values themselves rather than in a tint: the
// ground is a brown-black, the top end is bone. Neither is neutral
// grey, which would look like a wireframe.
// Monochrome, on a wider ladder than before.
//
// The previous values sat inside about fifteen points of each other,
// which meant a card, a row inside it and a chip on that row all read
// as one surface. Layering only works if each step is visible — so the
// gaps are bigger now, and card2 in particular has come up enough that
// a block row inside a session card is obviously a thing sitting on
// another thing.
//
// Warmth is in the values themselves, not a tint: the ground is a
// brown-black, the top end is bone. Neutral grey would read as a
// wireframe.
export const PAL = {
  bg:    '#090908',   // the ground, warm near-black
  card:  '#161514',   // a card on it
  card2: '#262322',   // a row inside a card  — lighter again
  card3: '#35312D',   // a chip on that row
  line:  '#332F2C',   // hairlines, now actually visible
  mute:  '#736E67',
  sub:   '#A29C93',
  ink:   '#F6F3EE',   // body
  g:     '#FFFFFF',   // the accent — pure white. On a near-black ground
                      // the fills should be the brightest thing there is;
                      // anything short of white reads as slightly dirty
                      // rather than deliberate.
  gDeep: '#2A2725',
  gLine: 'rgba(255,255,255,.45)',
  red:   '#C4685A',

  // ---- the one place colour is allowed ----
  //
  // The system is monochrome everywhere else and should stay that way.
  // But "where to work" is a screen somebody scans for one thing —
  // which of these is the problem — and value alone makes them read
  // four bars and compare. Colour answers it before they've focused.
  //
  // Warm and desaturated so it sits on the same ground as the rest
  // rather than looking like a different app. No pure red, no traffic
  // green: those belong to errors and success states, and a 52 is
  // neither an error nor a failure. It's a thing to work on.
  weak:  '#C77A5E',   // needs the work
  mid:   '#C4A265',   // fine
  good:  '#8FA870',   // strong
  best:  '#6FA894',   // well ahead of what the racing asks
  sheet: '#1B1918',
  gold:  '#FFFFFF', silver: '#C2BDB5', bronze: '#867F77',
  shadow: 'none',
  markFilter: 'none',
}

export const vars = (p = PAL) => ({
  '--bg': p.bg, '--card': p.card, '--card2': p.card2, '--card3': p.card3,
  '--line': p.line, '--ink': p.ink, '--sub': p.sub, '--mute': p.mute,
  '--g': p.g, '--gDeep': p.gDeep, '--gLine': p.gLine, '--red': p.red,
  '--sheet': p.sheet, '--gold': p.gold, '--silver': p.silver,
  '--bronze': p.bronze, '--shadow': p.shadow, '--markFilter': p.markFilter,
})

export const C = {
  bg: 'var(--bg)', card: 'var(--card)', card2: 'var(--card2)', card3: 'var(--card3)',
  line: 'var(--line)', ink: 'var(--ink)', sub: 'var(--sub)', mute: 'var(--mute)',
  g: 'var(--g)', gDeep: 'var(--gDeep)', gLine: 'var(--gLine)', red: 'var(--red)',
  sheet: 'var(--sheet)', gold: 'var(--gold)', silver: 'var(--silver)',
  bronze: 'var(--bronze)', shadow: 'var(--shadow)',
  markFilter: 'var(--markFilter)',
}

// Text over a darkened photo stays light in both themes.
export const P = { ink: '#F6F2EC', sub: 'rgba(246,242,236,.72)' }

export const F = "'Inter', -apple-system, system-ui, sans-serif"

// ---------------------------------------------------------------
//  Type scale
//
//  Eight sizes on a 1.2 ratio, and nothing outside them. The sizes
//  before this were picked one at a time — 13, 13.5, 14.5, 15.5 —
//  which reads fine but isn't a system, and it shows the moment
//  anyone else adds a screen.
//
//  Anything that isn't in here should be a good enough reason to
//  add it here.
// ---------------------------------------------------------------
// Bumped up a step. The previous scale read as a well-made web app;
// the apps this sits alongside are all a size or two larger, and on a
// phone at arm's length in a gym that difference is legibility rather
// than taste.
export const SIZE = {
  display: 48,   // the countdown
  xl:      29,   // a screen someone lands on
  h1:      24,   // screen titles
  h2:      19,   // section titles
  h3:      17,   // card titles
  body:    15,   // reading
  small:   13,   // secondary, captions
  micro:   11,   // labels, timestamps
}

export const T = {
  display: { fontSize: SIZE.display, fontWeight: 900, letterSpacing: '-.05em',
             lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  xl:      { fontSize: SIZE.xl, fontWeight: 800, letterSpacing: '-.04em',
             lineHeight: 1.1, margin: 0 },
  h1:      { fontSize: SIZE.h1, fontWeight: 800, letterSpacing: '-.035em',
             lineHeight: 1.15, margin: 0 },
  h2:      { fontSize: SIZE.h2, fontWeight: 800, letterSpacing: '-.03em',
             lineHeight: 1.2, margin: 0 },
  h3:      { fontSize: SIZE.h3, fontWeight: 800, letterSpacing: '-.025em',
             lineHeight: 1.25, margin: 0 },
  body:    { fontSize: SIZE.body, color: C.sub, lineHeight: 1.55 },
  small:   { fontSize: SIZE.small, color: C.sub, lineHeight: 1.5 },
  label:   { fontSize: SIZE.micro, fontWeight: 800, letterSpacing: '.14em',
             color: C.mute },
  num:     { fontVariantNumeric: 'tabular-nums' },
}

export const card = { background: C.card, borderRadius: 18, padding: 17, boxShadow: C.shadow }


// Where the floating bars sit.
//
// The tab bar, the testing nudge and the chat composer all hover above
// the bottom edge, and they were each guessing their own offset — which
// showed as different gaps depending on which screen you were on. One
// constant, used by all three.
//
//   tab bar:  13px from the bottom, about 50px tall
//   so anything above it clears at 13 + 50 + 13 = 76
export const FLOAT = {
  bar:   'calc(13px + env(safe-area-inset-bottom))',   // the tab bar itself
  above: 'calc(86px + env(safe-area-inset-bottom))',   // anything sitting on it
  clear: 'calc(152px + env(safe-area-inset-bottom))',  // page padding to clear both
}
