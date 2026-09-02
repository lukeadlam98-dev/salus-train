import { useState, useEffect, useRef } from 'react'

// An image that arrives rather than pops.
//
// A CSS background image has no load event, so a card paints its dark
// fill first and the photograph appears whenever the network gets
// round to it. On a fast connection that is a flash; on gym wifi it is
// a second of empty card. Either way it reads as the app stuttering.
//
// This preloads, then fades. Once the browser has the file cached the
// fade is skipped entirely, so revisiting a screen shows the picture
// immediately instead of animating it in again — which was the other
// half of the flicker between tabs.
const seen = new Set()

export default function Img({ src, style, radius = 0, children, ...rest }) {
  const [on, setOn] = useState(() => !src || seen.has(src))
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (!src || seen.has(src)) { setOn(true); return }
    setOn(false)
    const i = new Image()
    i.onload = () => { seen.add(src); if (alive.current) setOn(true) }
    i.onerror = () => { if (alive.current) setOn(true) }
    i.src = src
    return () => { alive.current = false }
  }, [src])

  return (
    <div {...rest} style={{ position: 'relative', overflow: 'hidden',
      borderRadius: radius, ...style }}>
      {src && (
        <div style={{ position: 'absolute', inset: 0,
          background: `#090908 url(${src}) center/cover`,
          opacity: on ? 1 : 0,
          transition: 'opacity .28s ease' }} />
      )}
      {children}
    </div>
  )
}
