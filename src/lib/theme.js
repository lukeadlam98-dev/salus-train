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
  // Light, because the app is read standing up in a bright gym as
  // often as it is at six in the morning, and because a dark screen
  // under strip lighting is a mirror. The ground is the same warm
  // off-white the back office uses — one product, one language —
  // rather than pure white, which is fatiguing against near-black
  // text for the length of a session.
  bg:    '#F4F1EC',   // the ground
  card:  '#FFFFFF',   // a card lifts off it
  card2: '#F2EFE9',   // a row inside a card, or an input fill
  card3: '#E7E2D9',   // a chip on that row
  line:  '#E4DED4',   // hairlines

  mute:  '#9A9084',
  sub:   '#6B6157',
  ink:   '#1A1613',   // warm near-black

  // The accent inverts with the ground. On near-black it was pure
  // white; on bone it has to be the darkest thing on the screen, or a
  // filled cell stops reading as filled.
  g:     '#2E2721',
  gDeep: '#EFE9DD',
  gLine: 'rgba(46,39,33,.28)',
  red:   '#A94E3C',

  // ---- the one place colour is allowed ----
  //
  // "Where to work" is scanned for one thing — which of these is the
  // problem — and value alone makes somebody read four bars and
  // compare. Colour answers it before they've focused. Deepened from
  // the dark theme's versions: the same hues wash out on bone.
  weak:  '#B4654A',   // needs the work
  mid:   '#A8853F',   // fine
  good:  '#6E8A4E',   // strong
  best:  '#4A8678',   // well ahead of what the racing asks

  sheet: '#FFFFFF',
  gold:  '#8A7350', silver: '#8D8981', bronze: '#96674A',

  // A light theme has no value difference to separate a card from its
  // ground, so the lift has to come from somewhere.
  shadow: '0 1px 2px rgba(26,22,19,.05), 0 6px 18px rgba(26,22,19,.04)',
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
