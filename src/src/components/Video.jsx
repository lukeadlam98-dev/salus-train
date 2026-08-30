import { useState } from 'react'
import { P } from '../lib/theme'

// A looping background video with a photo underneath it.
//
// The photo paints immediately; the video fades in over it once it
// can actually play. On a slow connection you get a good-looking
// still instead of a black rectangle, which is the whole point.
//
// iOS will refuse to autoplay unless it is muted AND playsInline —
// without both it either does nothing or goes fullscreen.
export default function Video({ src, poster, children, style, dim = 1, radius = 0 }) {
  const [ready, setReady] = useState(false)

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: radius,
      background: poster
        ? `#0B0A09 url(${poster}) center/cover`
        : 'linear-gradient(150deg,#312A22,#191714 60%,#0B0A09)',
      ...style,
    }}>
      {src && (
        <video
          src={src}
          poster={poster}
          autoPlay muted loop playsInline preload="auto"
          onCanPlay={() => setReady(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: ready ? 1 : 0,
            transition: 'opacity .6s ease',
          }}
        />
      )}

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
