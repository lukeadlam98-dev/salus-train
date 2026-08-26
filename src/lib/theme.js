// Salus Train — palette and type.
// Bone is the standard; light is there for daylight use.

export const PAL = {
  bone: {
    name: 'Bone', note: 'Cream on near-black. The standard.',
    bg: '#0B0A09', card: '#151412', card2: '#1F1D1A', card3: '#2B2926',
    line: '#262421', ink: '#EFEAE1', sub: '#948D83', mute: '#635C54',
    g: '#E8DCC8', gDeep: '#2C2620', gLine: 'rgba(232,220,200,.38)',
    red: '#CC7A68', sheet: '#171614',
    gold: '#E8DCC8', silver: '#B5AEA4', bronze: '#9C8570', shadow: 'none',
    // the logo PNG is exported light; dark theme uses it as-is
    markFilter: 'none',
  },
  light: {
    name: 'Light', note: 'Bone ground, like the studio.',
    bg: '#F7F3EC', card: '#FFFFFF', card2: '#F0EAE0', card3: '#E4DBCD',
    line: '#E5DCCE', ink: '#1A1512', sub: '#6D6156', mute: '#9A8F82',
    g: '#5A4A33', gDeep: '#EFE7DA', gLine: 'rgba(90,74,51,.3)',
    red: '#AE5140', sheet: '#FFFFFF',
    gold: '#8A7350', silver: '#8D8981', bronze: '#96674A',
    shadow: '0 1px 2px rgba(26,21,18,.07)',
    // ...and inverted on the light ground, so one file covers both
    markFilter: 'invert(1)',
  },
}

export const vars = p => ({
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

export const T = {
  h1:    { fontSize: 26, fontWeight: 800, letterSpacing: '-.035em', margin: 0 },
  h2:    { fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', margin: 0 },
  h3:    { fontSize: 18, fontWeight: 800, letterSpacing: '-.025em', margin: 0 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: C.mute },
  body:  { fontSize: 14.5, color: C.sub, lineHeight: 1.55 },
  num:   { fontVariantNumeric: 'tabular-nums' },
}

export const card = { background: C.card, borderRadius: 18, padding: 17, boxShadow: C.shadow }
