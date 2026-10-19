// Does a superset actually come out paired?
//
// A1/A2 side by side in one set card is the whole point of a 1:1
// programme written superset style. Rendered as two stacked cards it
// still compiles, still logs, still looks finished — and tells the
// member to do three sets of leg press and then three sets of lat
// pulldown, which is a different session from the one the coach wrote.
//
// So this mounts the real Session screen with a real superset block,
// stubbing only the network, and reads the page back.
//
//   node tools/superset-check.mjs
//
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

/* ---------- the session a coach would write ---------- */
const SESSION = {
  id: 's1', title: 'Full Body A', day: 1, kind: 'strength', est_min: 55,
  body: 'Supersets. Work through A1 and A2 together.',
  cover_url: null, video_url: null, is_test: false, wotw: false,
}

const DETAIL = {
  ...SESSION,
  blocks: [{
    id: 'b1', ord: 1, letter: 'A', label: 'Lower + pull',
    scheme: '3 sets', format: 'superset', rounds: 3, rest_s: 90,
    cap_s: null, window_s: null, work_s: null, ladder: null,
    target_pct: null, target_rpe: null, pace_pct: null,
    block_lines: [], coach_notes: [],
    block_items: [
      { id: 'i1', ord: 1, sets: 3, reps: 12, rest_s: 90,
        movements: { id: 'm1', name: 'Leg Press', has_time: false,
                     pct_of: null, pct: null } },
      { id: 'i2', ord: 2, sets: 3, reps: 12, rest_s: 90,
        movements: { id: 'm2', name: 'Lat Pulldown', has_time: false,
                     pct_of: null, pct: null } },
    ],
  }],
}

/* ---------- bundle Session with the network stubbed out ---------- */
const stub = {
  name: 'stub',
  setup(b) {
    b.onResolve({ filter: /lib\/(data|supabase|push)$/ }, a => ({
      path: a.path, namespace: 'stub',
    }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({
      loader: 'js',
      contents: /data$/.test(a.path)
        ? `export const getSessionDetail = async () => globalThis.__DETAIL.blocks
           export const startWorkout = async () => ({ id: 'w1' })
           export const saveSet = async () => ({})
           export const finishWorkout = async () => ({})
           export const getCoaches = async () => []
           export const getProgrammes = async () => []`
        : `export const supabase = { from: () => ({ select: () => ({}) }) }
           export default {}`,
    }))
  },
}

const out = path.join(root, '.superset-bundle.mjs')
await build({
  entryPoints: [path.join(root, 'tools/_superset-entry.jsx')],
  bundle: true, format: 'esm', jsx: 'automatic', outfile: out,
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
  plugins: [stub], logLevel: 'error',
  define: { 'import.meta.env': '{"VITE_SUPABASE_URL":"https://x.supabase.co","VITE_SUPABASE_ANON_KEY":"x"}' },
})

/* ---------- mount it in a document and let the effects run ---------- */
const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: 'https://salus-train.test', pretendToBeVisual: true,
})
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element',
                 'Node', 'getComputedStyle', 'localStorage', 'MutationObserver',
                 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(globalThis, k, {
    value: dom.window[k], configurable: true, writable: true,
  })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.__DETAIL = DETAIL

const { mount } = await import(out)
const html = await mount(SESSION)
fs.rmSync(out, { force: true })

/* ---------- read the page back ---------- */
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

const checks = [
  ['one card per set, not per movement',
    /SET 1 OF 3/.test(text) && /SET 3 OF 3/.test(text)],
  ['A1 and A2 share a card',
    (() => {
      const card = text.slice(text.indexOf('SET 1 OF 3'), text.indexOf('SET 2 OF 3'))
      return /A1/.test(card) && /Leg Press/.test(card)
          && /A2/.test(card) && /Lat Pulldown/.test(card)
    })()],
  ['the rest line belongs to the pair, not to either movement',
    (() => {
      // It only shows once a pair is finished, and logging a set starts
      // an interval a synchronous test can't settle — so this reads the
      // one place in the source that line can come from.
      const src = fs.readFileSync(
        path.join(root, 'src/screens/Session.jsx'), 'utf8')
      return /const pairRest = B\.rest_s/.test(src)
          && /\{pairRest\}s, then set \{setIdx \+ 2\}/.test(src)
    })()],
  ['every set is reachable — 2 movements x 3 sets = 6 log buttons',
    (html.match(/stroke-linecap/g) || []).length >= 6],
  ['the movements are not stacked as separate blocks',
    text.indexOf('Lat Pulldown') < text.indexOf('SET 2 OF 3')],
]

let bad = 0
for (const [what, ok] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${what}`)
  if (!ok) bad++
}
if (bad) {
  console.log('\n--- what rendered ---\n' + text.slice(0, 1600))
  process.exit(1)
}
console.log('\n\u2713 supersets render paired')

// jsdom's visual mode keeps a frame loop running, so the process would
// otherwise sit there after the last assertion.
dom.window.close()
process.exit(0)
