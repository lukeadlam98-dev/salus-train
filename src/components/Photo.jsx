import { P } from '../lib/theme'

// An image with a dark scrim over it, so text on top stays readable
// whichever theme is active. Falls back to a warm gradient when the
// URL is missing or hasn't loaded — never a broken image icon.
export default function Photo({ src, children, style, dim = 1, radius = 0 }) {
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: radius,
      background: src
        ? `#0B0A09 url(${src}) center/cover`
        : 'linear-gradient(150deg,#312A22,#191714 60%,#0B0A09)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg,rgba(0,0,0,${dim * 0.2}),rgba(0,0,0,${dim * 1.8}))`,
      }} />
      <div style={{ position: 'relative', height: '100%', color: P.ink }}>
        {children}
      </div>
    </div>
  )
}
