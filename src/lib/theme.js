export const C = {
  bg:    '#0B0A09',
  card:  '#151412',
  card2: '#1F1D1A',
  card3: '#2B2926',
  line:  '#262421',
  ink:   '#EFEAE1',
  sub:   '#948D83',
  mute:  '#635C54',
  g:     '#E8DCC8',
  gDeep: '#2C2620',
}

export const F = "'Inter', -apple-system, system-ui, sans-serif"

export const T = {
  h1:    { fontSize: 27, fontWeight: 800, letterSpacing: '-.035em', margin: 0 },
  h2:    { fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', margin: 0 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: C.mute },
  body:  { fontSize: 15, color: C.sub, lineHeight: 1.55 },
  num:   { fontVariantNumeric: 'tabular-nums' },
}

export const btn = {
  primary: {
    width: '100%', border: 'none', borderRadius: 999, padding: '17px 0',
    fontSize: 16, fontWeight: 700, fontFamily: F, cursor: 'pointer',
    background: C.ink, color: C.bg,
  },
  pill: on => ({
    padding: '13px 17px', marginRight: 8, marginBottom: 8, borderRadius: 999,
    border: `1.5px solid ${on ? C.g : C.line}`,
    background: on ? C.gDeep : 'transparent',
    color: on ? C.g : C.ink,
    cursor: 'pointer', fontSize: 14.5, fontWeight: 700, fontFamily: F,
  }),
}