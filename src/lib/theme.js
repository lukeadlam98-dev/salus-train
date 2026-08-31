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
export const PAL = {
  bg:    '#0A0A09',   // the ground, warm near-black
  card:  '#141312',   // surfaces
  card2: '#1D1C1A',   // inputs, fills
  card3: '#2A2926',   // chips, pressed
  line:  '#262523',   // hairlines
  mute:  '#5E5B56',   // timestamps, inactive
  sub:   '#8E8A83',   // secondary
  ink:   '#EDE9E2',   // body
  g:     '#FFFCF6',   // the accent — brightest, used as a fill
  gDeep: '#232120',   // its dark counterpart, for logged states
  gLine: 'rgba(255,252,246,.42)',

  // The single exception. Delete is the only place where getting it
  // wrong is unrecoverable, and it's worth breaking the system for.
  red:   '#C4685A',

  sheet: '#161514',
  gold:  '#FFFCF6', silver: '#B4AFA7', bronze: '#7A756E',
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
