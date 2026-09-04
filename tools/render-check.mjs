// Render every screen, not just the app shell.
//
// Written after two black screens. The first was a useEffect reading a
// state variable declared four lines below it; the second was the same
// shape in a screen the shell never mounts, so a check that only
// rendered App went green and shipped it.
//
// These throw on first render, before any error boundary exists, so
// the page is simply black — no message, no stack, nothing to report.
// esbuild compiles them happily because they are valid syntax. The
// only thing that finds them is running every one.
//
//   node tools/render-check.mjs
//
import React from 'react'
import { renderToString } from 'react-dom/server'

// Enough of a browser that a module touching window at import time
// doesn't fail for the wrong reason.
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  navigator: { userAgent: 'node', standalone: false },
  location: { search: '', href: 'https://salus-train.vercel.app' },
  addEventListener() {}, removeEventListener() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  requestAnimationFrame: cb => cb(),
}
globalThis.document = {
  addEventListener() {}, removeEventListener() {},
  documentElement: { style: { setProperty() {} } },
  head: { appendChild() {} },
  createElement: () => ({ style: {}, setAttribute() {} }),
  visibilityState: 'visible',
}
Object.defineProperty(globalThis, 'navigator',
  { value: window.navigator, configurable: true })
globalThis.localStorage = window.localStorage
globalThis.Notification = { permission: 'default' }
globalThis.requestAnimationFrame = cb => cb()

const bundle = process.argv[2] || '/tmp/salus-screens.mjs'
const mod = await import(bundle)

// Props good enough to get through a first render. Not accurate — the
// point is only that nothing throws before the boundaries mount.
const session = {
  id: 's1', title: 'Lower A', kind: 'strength', day: 1, slot: 1,
  est_min: 60, focus: 'Back squat', body: 'A session.',
  run_kind: null, run_minutes: 30, run_blocks: 4,
  run_ladder: '10 × 200m', run_reps: 5, run_distance_m: 1000,
}
const profile = {
  id: 'u1', name: 'Test', role: 'member', week_idx: 1, units: 'metric',
  share_on_leaderboard: true, keep_awake: true,
}
const week = { id: 'w1', idx: 1, published: true }
const common = {
  userId: 'u1', profile, week, session, benchmarks: {}, setBenchmarks() {},
  half: { splits: {}, total: null, projected: null }, splits: {},
  multiplier: 2.12, programme: { id: 'p1', name: 'Road to HYROX', weeks: 8 },
  prediction: null, coaches: [], sections: [], items: [], plan: null,
  onBack() {}, onOpen() {}, onDone() {}, onUpdate() {}, onCoaches() {},
  onRaces() {}, onProgress() {}, onHalf() {}, onBlocks() {}, onNotifs() {},
  onPlan() {}, onSetRace() {}, onTakeClubRace() {}, onShare() {},
  onJoined() {}, onReady() {}, onCoach() {}, onWeekChange() {},
  onPosted() {}, onGoToTests() {}, onGoToHalf() {}, setSplits() {},
}

let failed = 0, passed = 0
for (const [name, Component] of Object.entries(mod)) {
  if (typeof Component !== 'function') continue
  if (!/^[A-Z]/.test(name)) continue
  try {
    renderToString(React.createElement(Component, common))
    passed++
  } catch (e) {
    // A component that legitimately needs data we haven't faked will
    // throw a TypeError on undefined. Those are noise. A ReferenceError
    // is always real.
    const real = e instanceof ReferenceError ||
                 /before initialization/.test(e.message)
    if (real) {
      console.log(`✗ ${name}`)
      console.log(`  ${e.message}`)
      failed++
    } else {
      passed++
    }
  }
}

console.log('')
console.log(failed
  ? `✗ ${failed} screen${failed > 1 ? 's' : ''} would be a black screen`
  : `✓ all ${passed} screens render`)
process.exit(failed ? 1 : 0)
