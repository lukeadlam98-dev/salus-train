import { C, F, T, P, card } from '../lib/theme'
import { LOGO } from '../lib/photos'

export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick}
    style={{ ...card, cursor: onClick ? 'pointer' : 'default', ...style }}>
    {children}
  </div>
)

export const Label = ({ children, style }) => (
  <div style={{ ...T.label, ...style }}>{children}</div>
)

export const Btn = ({ children, onClick, disabled, tone, style }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled}
    style={{
      width: '100%', border: 'none', borderRadius: 999, padding: '17px 0',
      fontSize: 16, fontWeight: 700, fontFamily: F,
      cursor: disabled ? 'default' : 'pointer', transition: 'all .18s',
      background: disabled ? C.card2 : tone === 'soft' ? C.card : C.ink,
      color: disabled ? C.mute : tone === 'soft' ? C.ink : C.bg,
      ...style,
    }}>{children}</button>
)

export const Pill = ({ children, on, onClick, sub }) => (
  <button onClick={onClick}
    style={{
      border: `1.5px solid ${on ? C.g : C.line}`, borderRadius: 15,
      background: on ? C.gDeep : 'transparent', textAlign: 'left',
      padding: sub ? '16px 17px' : '13px 17px', marginRight: 8, marginBottom: 9,
      cursor: 'pointer', fontFamily: F, width: sub ? '100%' : 'auto',
      transition: 'all .15s',
    }}>
    <div style={{ fontSize: sub ? 16 : 14.5, fontWeight: 700, color: on ? C.g : C.ink }}>
      {children}
    </div>
    {sub && <div style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
  </button>
)

export const Tag = ({ children, tone }) => (
  <span style={{
    display: 'inline-block', borderRadius: 6, padding: '3px 9px',
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em',
    background: tone === 'key' ? C.g : C.card3,
    color: tone === 'key' ? C.bg : C.sub,
  }}>{children}</span>
)

export const Chip = ({ children }) => (
  <span style={{
    display: 'inline-block', background: C.card3, borderRadius: 999,
    padding: '6px 12px', fontSize: 13, fontWeight: 700, color: C.ink,
  }}>{children}</span>
)

export const Field = ({ value, onChange, placeholder, onEnter, style }) => (
  <input value={value ?? ''} placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    onKeyDown={e => e.key === 'Enter' && onEnter?.()}
    style={{
      width: '100%', background: C.card2, color: C.ink, border: 'none',
      borderRadius: 12, padding: '14px 15px', fontSize: 16, outline: 'none',
      fontFamily: F, ...style,
    }} />
)

export const Sheet = ({ children, onClose }) => (
  <>
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 80,
      animation: 'fade .2s ease',
    }} />
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
      background: C.sheet, borderRadius: '20px 20px 0 0',
      padding: '12px 18px calc(22px + env(safe-area-inset-bottom))',
      maxHeight: '84dvh', overflowY: 'auto',
      animation: 'sheet .27s cubic-bezier(.2,.85,.25,1)',
    }}>
      <div style={{
        width: 38, height: 4.5, background: C.card3, borderRadius: 999,
        margin: '0 auto 16px',
      }} />
      {children}
    </div>
  </>
)

export const Back = ({ onClick, children }) => (
  <button onClick={onClick} style={{
    background: 'transparent', border: 'none', color: C.sub, fontSize: 15,
    fontWeight: 600, cursor: 'pointer', fontFamily: F, padding: 0,
    display: 'flex', alignItems: 'center', gap: 8,
  }}>
    <Ico d={I.back} s={17} c={C.sub} w={2.2} />
    {children || 'Back'}
  </button>
)

export const Avatar = ({ name, tint, size = 44 }) => (
  <div style={{
    width: size, height: size, borderRadius: 999, flexShrink: 0,
    background: tint || '#4A3F34', display: 'grid', placeItems: 'center',
    fontSize: size * 0.34, fontWeight: 800, color: 'rgba(255,255,255,.92)',
  }}>{(name || '?')[0].toUpperCase()}</div>
)

export const Medal = ({ rank, size = 23 }) => {
  const fill = rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : null
  if (!fill) return (
    <div style={{ width: size, textAlign: 'center', fontSize: 14.5,
      fontWeight: 700, color: C.mute, flexShrink: 0 }}>{rank}</div>
  )
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 28 30" style={{ flexShrink: 0 }}>
      <path d="M14 1l12 5v10c0 6-5 11-12 13C7 27 2 22 2 16V6z" style={{ fill }} />
      <text x="14" y="19" textAnchor="middle" fontSize="13" fontWeight="800"
        style={{ fill: '#151412' }} fontFamily={F}>{rank}</text>
    </svg>
  )
}

/* ---------------- icons ---------------- */
export const I = {
  bolt:  'M13 2L4 14h6l-1 8 9-12h-6z',
  cal:   'M3 9h18M7 3v3M17 3v3M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  chart: 'M3 17l6-6 4 4 8-8M21 7v5h-5',
  msg:   'M21 11.5a8.4 8.4 0 01-9 8.4 8.9 8.9 0 01-4-.9L3 21l2-4a8.4 8.4 0 01-1-4 8.4 8.4 0 018.5-8.4h.5a8.4 8.4 0 018 8.4z',
  user:  'M12 12a4 4 0 100-8 4 4 0 000 8ZM5 21a7 7 0 0114 0',
  check: 'M4.5 12.5 9.5 17.5 20 6.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chev:  'M9 6l6 6-6 6',
  back:  'M15 18l-6-6 6-6',
  plus:  'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  send:  'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  lock:  'M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z',
  share: 'M12 16V4M8 8l4-4 4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3',
}

export const Ico = ({ d, s = 17, c = C.ink, w = 1.9 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round" style={{ stroke: c }}>
    <path d={d} />
  </svg>
)

export const Mark = ({ s = 30, onPhoto }) => (
  // The logo is a PNG, so it can't take a colour the way an SVG would.
  // Instead the light theme inverts it — see markFilter in theme.js.
  // On a photo it always stays light, so no filter there.
  <img
    src={LOGO}
    alt=""
    width={s}
    height={s}
    style={{
      display: 'block',
      width: s, height: s, objectFit: 'contain',
      filter: onPhoto ? 'none' : C.markFilter,
    }}
  />
)

export const page = {
  minHeight: '100%', padding: '46px 16px 110px', maxWidth: 520, margin: '0 auto',
}
