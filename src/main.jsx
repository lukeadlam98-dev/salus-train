import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ---------------------------------------------------------------
//  No zoom on iOS
//
//  Safari has ignored user-scalable=no since iOS 10, and honours
//  touch-action only patchily. The gesture events below are the only
//  thing it reliably respects.
//
//  gesturestart fires on a pinch — cancelling it stops the zoom.
//  Double-tap is a separate gesture that survives everything else,
//  so two taps under 300ms apart get the second one swallowed. And
//  a two-finger drag zooms in some versions, hence the third.
// ---------------------------------------------------------------
;['gesturestart', 'gesturechange', 'gestureend'].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault(), { passive: false }))

let lastTap = 0
document.addEventListener('touchend', e => {
  const now = Date.now()
  if (now - lastTap < 300) e.preventDefault()
  lastTap = now
}, { passive: false })

document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
