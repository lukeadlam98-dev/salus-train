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

// Double-tap zoom, blocked — but only an actual double tap.
//
// The first version cancelled any tap within 300ms of the previous
// one, anywhere on screen. Typing 1-0-8 into the keypad is three taps
// well inside 300ms, so the second and third were being preventDefault'd
// and never became clicks. That is what made the number pad feel laggy
// and half-broken.
//
// Anything you can tap is exempt. Entering 11 on the number pad is the
// same key twice in the same place inside 300ms — indistinguishable
// from a double tap by time and position alone, so position isn't
// enough either. Controls never zoom the page anyway, so the check
// only needs to apply to the space between them.
const CONTROLS = 'button, a, input, textarea, select, label, [role="button"]'
let lastTap = 0

document.addEventListener('touchend', e => {
  if (e.target.closest?.(CONTROLS)) { lastTap = 0; return }
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

// The service worker, registered once at boot rather than when
// somebody opens the settings screen — a push can only arrive on a
// device where it's already running, and the first thing a member
// does after allowing notifications is close the app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(() => {})
  })
}
