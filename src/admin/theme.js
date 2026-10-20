// The back office runs on its own palette.
//
// The member app is dark because it's read in a gym, one-handed, at
// six in the morning. The back office is read at a desk in daylight
// for an hour at a time — different room, different problem. A warm
// off-white rather than pure white, because pure white against black
// text is fatiguing over a long editing session.
export const A = {
  bg:    '#F4F1EC',   // the ground
  card:  '#FFFFFF',   // panels lift off it
  card2: '#F7F5F1',   // input fills, just below white
  card3: '#EAE5DD',   // chips, selected rows
  line:  '#E2DCD2',   // hairlines
  ink:   '#1A1613',   // warm near-black
  sub:   '#6B6157',
  mute:  '#9A9084',
  g:     '#5A4A33',   // the accent, deep enough to read on white
  gDeep: '#F0EADE',   // its tint
  red:   '#A94E3C',
  shadow: '0 1px 2px rgba(26,22,19,.06)',
  shadowLift: '0 4px 16px rgba(26,22,19,.08)',
}

export const adminVars = {
  '--bg': A.bg, '--card': A.card, '--card2': A.card2, '--card3': A.card3,
  '--line': A.line, '--ink': A.ink, '--sub': A.sub, '--mute': A.mute,
  '--g': A.g, '--gDeep': A.gDeep, '--gLine': 'rgba(90,74,51,.32)',
  '--red': A.red, '--sheet': A.card, '--gold': '#8A7350',
  '--silver': '#8D8981', '--bronze': '#96674A', '--shadow': A.shadow,
  '--markFilter': 'invert(1)',
}

// The preview phone carries the member's palette, because that is
// literally what it is showing. It followed the app from dark to
// light — a preview on the old colours is a preview of nothing.
export const previewVars = {
  '--bg': '#F4F1EC', '--card': '#FFFFFF', '--card2': '#F2EFE9',
  '--card3': '#E7E2D9', '--line': '#E4DED4', '--ink': '#1A1613',
  '--sub': '#6B6157', '--mute': '#9A9084', '--g': '#2E2721',
  '--gDeep': '#EFE9DD', '--gLine': 'rgba(46,39,33,.28)',
  '--red': '#A94E3C', '--sheet': '#FFFFFF',
  '--shadow': '0 1px 2px rgba(26,22,19,.05), 0 6px 18px rgba(26,22,19,.04)',
  '--markFilter': 'none',
}
