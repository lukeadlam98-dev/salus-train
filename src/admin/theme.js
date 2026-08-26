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

// The preview phone keeps the member's dark palette, because that is
// literally what it is showing.
export const previewVars = {
  '--bg': '#0B0A09', '--card': '#151412', '--card2': '#1F1D1A',
  '--card3': '#2B2926', '--line': '#262421', '--ink': '#EFEAE1',
  '--sub': '#948D83', '--mute': '#635C54', '--g': '#E8DCC8',
  '--gDeep': '#2C2620', '--gLine': 'rgba(232,220,200,.38)',
  '--red': '#CC7A68', '--sheet': '#171614', '--shadow': 'none',
  '--markFilter': 'none',
}
